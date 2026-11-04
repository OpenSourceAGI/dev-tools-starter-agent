import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCurrentPlatform } from '../platform.js';
import type { PlatformInfo } from '../types.js';
import { normalizeRepoSlug, pickAsset, type PickedAsset, type RawRelease } from './assets.js';
import {
  downloadWithProgress,
  git0Home,
  installAsset,
  launchApp,
  type InstallResult,
  type OnProgress,
} from './installer.js';

/** The port the service listens on unless told otherwise. Spells nothing; picked to be unclaimed. */
export const DEFAULT_PORT = 47100;

/** Every state a job passes through. The last three are terminal. */
export type JobStatus =
  | 'awaiting-approval'
  | 'resolving'
  | 'downloading'
  | 'installing'
  | 'launching'
  | 'done'
  | 'error'
  | 'denied';

const TERMINAL: JobStatus[] = ['done', 'error', 'denied'];

/** One install request, as the status endpoint reports it. */
export interface Job {
  id: string;
  repo: string;
  status: JobStatus;
  /** Overall progress, 0–1, safe to drive a progress bar with directly. */
  progress: number;
  receivedBytes: number;
  totalBytes: number;
  asset: string | null;
  tag: string | null;
  installedPath: string | null;
  launched: boolean;
  message: string;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

interface JobInternal extends Job {
  /** Secret that only the approval page sees — a cross-origin page cannot read it. */
  approvalToken: string;
}

/** The side effects the service performs, injectable so tests can watch rather than do. */
export interface ServiceDeps {
  platform: PlatformInfo;
  fetchReleases(repo: string): Promise<RawRelease[]>;
  download(url: string, dest: string, onProgress: OnProgress, size: number): Promise<void>;
  install(file: string, asset: PickedAsset, repo: string): InstallResult;
  launch(cmd: { cmd: string; args: string[] }): void;
}

/** Reads the GitHub releases list without the CLI client's `process.exit` on 403. */
export async function fetchReleasesFromGithub(repo: string): Promise<RawRelease[]> {
  const headers: Record<string, string> = {
    'User-Agent': 'git0-service',
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;

  const url = `https://api.github.com/repos/${repo}/releases?per_page=15`;
  let res = await fetch(url, { headers });
  // A stale or revoked token gets 401 even for public repos; public data does
  // not need one, so try again without it before giving up.
  if (res.status === 401 && headers.Authorization) {
    delete headers.Authorization;
    res = await fetch(url, { headers });
  }
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub rate limit reached — set GITHUB_TOKEN for the service');
  }
  if (res.status === 404) throw new Error(`Repository ${repo} not found`);
  if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}`);
  return (await res.json()) as RawRelease[];
}

export function defaultDeps(): ServiceDeps {
  return {
    platform: getCurrentPlatform(),
    fetchReleases: fetchReleasesFromGithub,
    download: (url, dest, onProgress, size) => downloadWithProgress(url, dest, onProgress, size),
    install: installAsset,
    launch: launchApp,
  };
}

/** Repos the user ticked "always allow" for. Kept in `~/.git0/service.json`. */
export class TrustStore {
  constructor(private file = path.join(git0Home(), 'service.json')) {}

  private read(): { trustedRepos: string[] } {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return { trustedRepos: Array.isArray(data.trustedRepos) ? data.trustedRepos : [] };
    } catch {
      return { trustedRepos: [] };
    }
  }

  has(repo: string): boolean {
    return this.read().trustedRepos.includes(repo.toLowerCase());
  }

  add(repo: string): void {
    const data = this.read();
    if (!data.trustedRepos.includes(repo.toLowerCase())) data.trustedRepos.push(repo.toLowerCase());
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }
}

/** Approval requests left unanswered this long are dropped. */
const APPROVAL_TTL_MS = 10 * 60 * 1000;
/** Ceiling on unanswered requests, so a page cannot flood the user with prompts. */
const MAX_PENDING = 5;
/** Finished jobs kept for the status endpoint. */
const MAX_JOBS = 50;

/**
 * Holds every install job and runs each one through
 * resolve → download → install → launch.
 *
 * A job for a repository the user has not trusted waits in
 * `awaiting-approval` until someone presses Allow on the local approval page.
 * That page is the one thing a website cannot drive: it is served without
 * CORS headers and refuses to be framed, so the token it carries never reaches
 * the page that asked for the install.
 */
export class JobManager {
  private jobs = new Map<string, JobInternal>();

  constructor(private deps: ServiceDeps, private trust = new TrustStore()) {}

  /** Public view of a job — everything but the approval token. */
  view(job: JobInternal): Job {
    const { approvalToken: _secret, ...rest } = job;
    return rest;
  }

  get(id: string): JobInternal | undefined {
    this.expire();
    return this.jobs.get(id);
  }

  list(): Job[] {
    this.expire();
    return [...this.jobs.values()].map(j => this.view(j));
  }

  /**
   * Starts — or, for a repo already in flight, returns — the install job for
   * `repo`. Throws for a repo string that is not `owner/repo` and when too
   * many approvals are pending.
   */
  request(repoInput: string): JobInternal {
    const repo = normalizeRepoSlug(repoInput);
    if (!repo) throw new Error('Expected a GitHub repository as owner/repo or a github.com URL');

    this.expire();
    const active = [...this.jobs.values()].find(
      j => j.repo.toLowerCase() === repo.toLowerCase() && !TERMINAL.includes(j.status)
    );
    if (active) return active;

    const trusted = this.trust.has(repo);
    const pending = [...this.jobs.values()].filter(j => j.status === 'awaiting-approval').length;
    if (!trusted && pending >= MAX_PENDING) throw new Error('Too many install requests are waiting for approval');

    const now = Date.now();
    const job: JobInternal = {
      id: crypto.randomUUID(),
      repo,
      status: trusted ? 'resolving' : 'awaiting-approval',
      progress: 0,
      receivedBytes: 0,
      totalBytes: 0,
      asset: null,
      tag: null,
      installedPath: null,
      launched: false,
      message: trusted ? 'Finding the right release' : 'Waiting for you to allow this install',
      error: null,
      createdAt: now,
      updatedAt: now,
      approvalToken: crypto.randomBytes(24).toString('hex'),
    };
    this.jobs.set(job.id, job);
    this.prune();
    if (trusted) void this.run(job);
    return job;
  }

  /** Answers the approval prompt. Returns false when the token is wrong or the job is not waiting. */
  decide(id: string, token: string, allow: boolean, alwaysTrust = false): boolean {
    const job = this.get(id);
    if (!job || job.status !== 'awaiting-approval') return false;
    const a = Buffer.from(token);
    const b = Buffer.from(job.approvalToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    if (!allow) {
      this.update(job, { status: 'denied', message: 'Install was declined' });
      return true;
    }
    if (alwaysTrust) this.trust.add(job.repo);
    this.update(job, { status: 'resolving', message: 'Finding the right release' });
    void this.run(job);
    return true;
  }

  private update(job: JobInternal, patch: Partial<Job>): void {
    Object.assign(job, patch, { updatedAt: Date.now() });
  }

  private expire(): void {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (job.status === 'awaiting-approval' && now - job.createdAt > APPROVAL_TTL_MS) {
        this.update(job, { status: 'denied', message: 'Approval request expired' });
      }
    }
  }

  private prune(): void {
    const done = [...this.jobs.values()].filter(j => TERMINAL.includes(j.status));
    while (this.jobs.size > MAX_JOBS && done.length) this.jobs.delete(done.shift()!.id);
  }

  /** The pipeline. Every failure lands the job in `error` with a readable message. */
  async run(job: JobInternal): Promise<void> {
    const { platform } = this.deps;
    try {
      const releases = await this.deps.fetchReleases(job.repo);
      const asset = pickAsset(releases, platform);
      if (!asset) {
        throw new Error(`No release of ${job.repo} ships a build for ${platform.os} ${platform.arch}`);
      }

      this.update(job, {
        status: 'downloading',
        asset: asset.name,
        tag: asset.tag,
        totalBytes: asset.size,
        message: `Downloading ${asset.name}`,
      });

      const dest = path.join(git0Home(), 'downloads', job.repo.replace('/', '__'), asset.name);
      await this.deps.download(
        asset.url,
        dest,
        (received, total) => {
          const t = total || asset.size;
          this.update(job, {
            receivedBytes: received,
            totalBytes: t,
            // Download is 90% of the bar; install and launch share the rest.
            progress: t ? Math.min(0.9, (received / t) * 0.9) : job.progress,
          });
        },
        asset.size
      );

      this.update(job, { status: 'installing', progress: 0.92, message: `Installing ${asset.name}` });
      const result = this.deps.install(dest, asset, job.repo);
      this.update(job, { installedPath: result.installedPath, message: result.message });

      if (result.launch) {
        this.update(job, { status: 'launching', progress: 0.97 });
        this.deps.launch(result.launch);
        this.update(job, { launched: true });
      }

      this.update(job, { status: 'done', progress: 1 });
    } catch (err: any) {
      this.update(job, { status: 'error', error: err?.message ?? String(err), message: 'Install failed' });
    }
  }
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Chrome's Private Network Access: a public page may only reach 127.0.0.1
  // when the local server opts in on the preflight.
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Max-Age': '600',
};

const NO_FRAME = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Cache-Control': 'no-store',
};

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS });
  res.end(JSON.stringify(body));
}

function sendHtml(res: http.ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...NO_FRAME });
  res.end(html);
}

function readBody(req: http.IncomingMessage, limit = 4096): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * The local page a person sees after clicking an install link: an Allow/Deny
 * prompt while the job waits, then a live progress bar.
 */
export function jobPage(job: Job, token: string | null): string {
  const repo = esc(job.repo);
  const prompt = job.status === 'awaiting-approval' && token
    ? `<p>A web page asked git0 to download and install the latest release of
         <a href="https://github.com/${repo}" target="_blank" rel="noopener"><b>${repo}</b></a>
         on this computer and open it.</p>
       <form method="post" action="/approve/${esc(job.id)}">
         <input type="hidden" name="token" value="${esc(token)}">
         <label><input type="checkbox" name="trust"> Always allow ${repo}</label>
         <div class="row">
           <button name="decision" value="allow" class="primary">Allow install</button>
           <button name="decision" value="deny">Deny</button>
         </div>
       </form>`
    : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>git0 · ${repo}</title>
<style>
  :root{color-scheme:light dark;--bg:#fafafa;--fg:#111;--muted:#666;--accent:#6d28d9;--track:#e5e5e5}
  @media (prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;--muted:#999;--accent:#a78bfa;--track:#333}}
  body{margin:0;font:15px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);display:grid;place-items:center;min-height:100vh}
  main{max-width:440px;padding:24px}
  h1{font-size:18px;margin:0 0 12px}
  a{color:var(--accent)}
  .row{display:flex;gap:8px;margin-top:16px}
  button{font:inherit;padding:8px 16px;border-radius:8px;border:1px solid var(--track);background:transparent;color:var(--fg);cursor:pointer}
  button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
  .bar{height:10px;border-radius:5px;background:var(--track);overflow:hidden;margin:16px 0 8px}
  .bar>i{display:block;height:100%;width:0;background:var(--accent);transition:width .3s}
  #msg{color:var(--muted);font-size:13px}
</style></head><body><main>
<h1>git0 · ${repo}</h1>
${prompt}
<div id="progress" ${prompt ? 'hidden' : ''}>
  <div class="bar"><i id="fill"></i></div>
  <div id="msg">${esc(job.message)}</div>
</div>
<script>
  const id = ${JSON.stringify(job.id)};
  async function poll(){
    try{
      const j = await (await fetch('/status/' + id)).json();
      if (j.status === 'awaiting-approval') return setTimeout(poll, 1000);
      document.getElementById('progress').hidden = false;
      document.getElementById('fill').style.width = Math.round(j.progress * 100) + '%';
      const mb = n => (n / 1048576).toFixed(1);
      document.getElementById('msg').textContent =
        j.status === 'downloading' && j.totalBytes ? j.message + ' — ' + mb(j.receivedBytes) + ' / ' + mb(j.totalBytes) + ' MB'
        : j.status === 'error' ? 'Failed: ' + j.error : j.message;
      if (!['done','error','denied'].includes(j.status)) setTimeout(poll, 500);
    }catch{ setTimeout(poll, 2000) }
  }
  ${prompt ? '' : 'poll();'}
</script>
</main></body></html>`;
}

/** Options for {@link createServiceServer}. */
export interface ServiceOptions {
  port?: number;
  deps?: ServiceDeps;
  trust?: TrustStore;
  version?: string;
}

/**
 * Builds the HTTP server the background service runs.
 *
 * Endpoints (all on 127.0.0.1 only):
 *
 * | Route | Who calls it | Does |
 * | --- | --- | --- |
 * | `GET /health` | download buttons | proves the service is installed and running |
 * | `GET\|POST /install?repo=owner/repo` | download buttons, `git0://` links | queues an install, returns the job |
 * | `GET /status/:id` | download buttons | job state and progress, for an in-button bar |
 * | `GET /jobs` | `git0 --service=status` | every job |
 * | `GET /job/:id` | the person, in a browser tab | approval prompt, then progress |
 * | `POST /approve/:id` | the approval form only | allows or denies the install |
 *
 * Requests whose `Host` is not this machine's loopback address are refused,
 * which is what stops a DNS-rebinding page from talking to the service as if
 * it were same-origin.
 */
export function createServiceServer(opts: ServiceOptions = {}): { server: http.Server; jobs: JobManager } {
  const deps = opts.deps ?? defaultDeps();
  const jobs = new JobManager(deps, opts.trust ?? new TrustStore());

  const server = http.createServer(async (req, res) => {
    try {
      const port = (server.address() as any)?.port;
      const host = (req.headers.host ?? '').toLowerCase();
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
        return sendJson(res, 403, { error: 'Forbidden host' });
      }

      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
      const method = req.method ?? 'GET';
      const parts = url.pathname.split('/').filter(Boolean);

      if (method === 'OPTIONS') {
        res.writeHead(204, CORS);
        return res.end();
      }

      if (parts[0] === 'health' && method === 'GET') {
        return sendJson(res, 200, {
          ok: true,
          name: 'git0',
          version: opts.version ?? null,
          os: deps.platform.os,
          arch: deps.platform.arch,
        });
      }

      if (parts[0] === 'install' && (method === 'GET' || method === 'POST')) {
        let repo = url.searchParams.get('repo');
        if (!repo && method === 'POST') {
          const raw = await readBody(req);
          try { repo = JSON.parse(raw).repo; } catch { repo = new URLSearchParams(raw).get('repo'); }
        }
        let job: JobInternal;
        try {
          job = jobs.request(repo ?? '');
        } catch (err: any) {
          return sendJson(res, 400, { error: err.message });
        }
        const jobUrl = `http://127.0.0.1:${port}/job/${job.id}`;
        // A plain link click is a navigation: send the person to the page
        // that asks them, rather than show them JSON.
        if (method === 'GET' && (req.headers.accept ?? '').includes('text/html')) {
          res.writeHead(303, { Location: `/job/${job.id}`, ...CORS });
          return res.end();
        }
        return sendJson(res, 202, {
          ...jobs.view(job),
          statusUrl: `http://127.0.0.1:${port}/status/${job.id}`,
          approveUrl: job.status === 'awaiting-approval' ? jobUrl : null,
          jobUrl,
        });
      }

      if (parts[0] === 'status' && parts[1] && method === 'GET') {
        const job = jobs.get(parts[1]);
        return job ? sendJson(res, 200, jobs.view(job)) : sendJson(res, 404, { error: 'No such job' });
      }

      if (parts[0] === 'jobs' && method === 'GET') {
        return sendJson(res, 200, jobs.list());
      }

      if (parts[0] === 'job' && parts[1] && method === 'GET') {
        const job = jobs.get(parts[1]);
        if (!job) return sendHtml(res, 404, '<p>No such install request.</p>');
        return sendHtml(res, 200, jobPage(jobs.view(job), job.approvalToken));
      }

      if (parts[0] === 'approve' && parts[1] && method === 'POST') {
        // Belt and braces next to the token: the form posts from our own origin.
        const origin = req.headers.origin;
        if (origin && origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) {
          return sendHtml(res, 403, '<p>Approval must come from the git0 page itself.</p>');
        }
        const form = new URLSearchParams(await readBody(req));
        const ok = jobs.decide(
          parts[1],
          form.get('token') ?? '',
          form.get('decision') === 'allow',
          form.get('trust') === 'on'
        );
        if (!ok) return sendHtml(res, 400, '<p>This request is no longer waiting for approval.</p>');
        res.writeHead(303, { Location: `/job/${parts[1]}`, ...NO_FRAME });
        return res.end();
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (err: any) {
      if (!res.headersSent) sendJson(res, 500, { error: err?.message ?? 'Internal error' });
    }
  });

  return { server, jobs };
}

/**
 * Starts the service in the foreground on 127.0.0.1 and resolves once it is
 * listening. This is what the system service runs.
 */
export function startService(opts: ServiceOptions = {}): Promise<{ server: http.Server; jobs: JobManager; port: number }> {
  const { server, jobs } = createServiceServer(opts);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? DEFAULT_PORT, '127.0.0.1', () => {
      resolve({ server, jobs, port: (server.address() as any).port });
    });
  });
}
