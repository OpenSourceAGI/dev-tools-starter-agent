import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  JobManager,
  TrustStore,
  createServiceServer,
  jobPage,
  type ServiceDeps,
} from '../src/service/server.ts';
import type { RawRelease } from '../src/service/assets.ts';

const linux = { os: 'linux', arch: 'x86_64', platform: 'linux', architecture: 'x64' };

const releases: RawRelease[] = [
  { tag_name: 'v1.0', assets: [{ name: 'app-linux-x86_64.AppImage', size: 1000, browser_download_url: 'https://dl/app' }] },
];

/** Deps that record instead of downloading, installing or launching anything. */
function fakeDeps(over: Partial<ServiceDeps> = {}) {
  const calls = { downloads: [] as string[], installs: [] as string[], launches: [] as any[] };
  const deps: ServiceDeps = {
    platform: linux,
    fetchReleases: async () => releases,
    download: async (url, dest, onProgress, size) => {
      calls.downloads.push(url);
      onProgress(size / 2, size);
      onProgress(size, size);
    },
    install: (file, asset) => {
      calls.installs.push(asset.name);
      return { installedPath: `/apps/${asset.name}`, launch: { cmd: '/apps/x', args: [] }, message: 'Installed' };
    },
    launch: l => { calls.launches.push(l); },
    ...over,
  };
  return { deps, calls };
}

const settle = () => new Promise(r => setTimeout(r, 20));

let home: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-svc-'));
  process.env.GIT0_HOME = home;
});
afterEach(() => {
  delete process.env.GIT0_HOME;
  fs.rmSync(home, { recursive: true, force: true });
});

describe('JobManager', () => {
  test('waits for approval before touching the network', async () => {
    const { deps, calls } = fakeDeps();
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    const job = jobs.request('https://github.com/acme/app');
    await settle();
    expect(job.repo).toBe('acme/app');
    expect(job.status).toBe('awaiting-approval');
    expect(calls.downloads).toEqual([]);
  });

  test('runs resolve → download → install → launch once allowed', async () => {
    const { deps, calls } = fakeDeps();
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    const job = jobs.request('acme/app');
    expect(jobs.decide(job.id, job.approvalToken, true)).toBe(true);
    await settle();

    const view = jobs.view(jobs.get(job.id)!);
    expect(view).toMatchObject({
      status: 'done',
      progress: 1,
      asset: 'app-linux-x86_64.AppImage',
      tag: 'v1.0',
      receivedBytes: 1000,
      totalBytes: 1000,
      installedPath: '/apps/app-linux-x86_64.AppImage',
      launched: true,
    });
    expect(view).not.toHaveProperty('approvalToken');
    expect(calls.downloads).toEqual(['https://dl/app']);
    expect(calls.launches).toEqual([{ cmd: '/apps/x', args: [] }]);
  });

  test('a wrong token does not approve', async () => {
    const { deps, calls } = fakeDeps();
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    const job = jobs.request('acme/app');
    expect(jobs.decide(job.id, 'nope', true)).toBe(false);
    await settle();
    expect(job.status).toBe('awaiting-approval');
    expect(calls.downloads).toEqual([]);
  });

  test('deny ends the job', () => {
    const { deps } = fakeDeps();
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    const job = jobs.request('acme/app');
    jobs.decide(job.id, job.approvalToken, false);
    expect(job.status).toBe('denied');
  });

  test('"always allow" skips the prompt next time', async () => {
    const { deps } = fakeDeps();
    const trust = new TrustStore(path.join(home, 's.json'));
    const jobs = new JobManager(deps, trust);
    const first = jobs.request('acme/app');
    jobs.decide(first.id, first.approvalToken, true, true);
    await settle();
    expect(trust.has('Acme/App')).toBe(true);

    const second = jobs.request('acme/app');
    expect(second.id).not.toBe(first.id);
    expect(second.status).not.toBe('awaiting-approval');
  });

  test('returns the in-flight job for a repeated request', () => {
    const { deps } = fakeDeps();
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    expect(jobs.request('acme/app').id).toBe(jobs.request('ACME/app').id);
  });

  test('caps unanswered prompts', () => {
    const { deps } = fakeDeps();
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    for (let i = 0; i < 5; i++) jobs.request(`acme/app${i}`);
    expect(() => jobs.request('acme/one-too-many')).toThrow(/Too many/);
  });

  test('rejects anything that is not a repository', () => {
    const { deps } = fakeDeps();
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    expect(() => jobs.request('../../etc')).toThrow(/owner\/repo/);
  });

  test('reports a missing build as an error', async () => {
    const { deps } = fakeDeps({ platform: { ...linux, os: 'windows', platform: 'win32' } });
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    const job = jobs.request('acme/app');
    jobs.decide(job.id, job.approvalToken, true);
    await settle();
    expect(job.status).toBe('error');
    expect(job.error).toMatch(/windows x86_64/);
  });

  test('a CLI tool installs but does not launch', async () => {
    const { deps, calls } = fakeDeps({
      install: () => ({ installedPath: '/apps/tool', launch: null, message: 'Installed command-line tool' }),
    });
    const jobs = new JobManager(deps, new TrustStore(path.join(home, 's.json')));
    const job = jobs.request('acme/app');
    jobs.decide(job.id, job.approvalToken, true);
    await settle();
    expect(job.status).toBe('done');
    expect(job.launched).toBe(false);
    expect(calls.launches).toEqual([]);
  });
});

describe('jobPage', () => {
  test('escapes the repository name and embeds the token only while waiting', () => {
    const job: any = { id: 'id1', repo: 'a/<b>', status: 'awaiting-approval', message: 'm' };
    const html = jobPage(job, 'tok123');
    expect(html).toContain('a/&lt;b&gt;');
    expect(html).not.toContain('a/<b>');
    expect(html).toContain('value="tok123"');
    expect(jobPage({ ...job, status: 'downloading' }, 'tok123')).not.toContain('tok123');
  });
});

describe('HTTP server', () => {
  let server: http.Server;
  let base: string;
  let calls: ReturnType<typeof fakeDeps>['calls'];

  beforeEach(async () => {
    const fake = fakeDeps();
    calls = fake.calls;
    ({ server } = createServiceServer({
      deps: fake.deps,
      trust: new TrustStore(path.join(home, 's.json')),
      version: '9.9.9',
    }));
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterEach(() => new Promise<void>(r => server.close(() => r())));

  /** Raw request, so tests can set Host and Origin, which fetch will not. */
  function raw(method: string, p: string, headers: Record<string, string> = {}, body = '') {
    return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
      const req = http.request(base + p, { method, headers }, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: data }));
      });
      req.on('error', reject);
      req.end(body);
    });
  }

  test('/health identifies the service, with CORS and Private Network Access headers', async () => {
    const res = await fetch(`${base}/health`);
    expect(await res.json()).toMatchObject({ ok: true, name: 'git0', version: '9.9.9', os: 'linux' });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');

    const pre = await raw('OPTIONS', '/install', { 'Access-Control-Request-Private-Network': 'true' });
    expect(pre.status).toBe(204);
    expect(pre.headers['access-control-allow-private-network']).toBe('true');
  });

  test('refuses a foreign Host header (DNS rebinding)', async () => {
    const res = await raw('GET', '/health', { Host: 'evil.example:80' });
    expect(res.status).toBe(403);
  });

  test('install → approval page → approve → status shows done', async () => {
    const res = await fetch(`${base}/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: 'acme/app' }),
    });
    expect(res.status).toBe(202);
    const job = await res.json();
    expect(job.status).toBe('awaiting-approval');
    expect(job.approveUrl).toBe(`${base}/job/${job.id}`);
    expect(job).not.toHaveProperty('approvalToken');

    const page = await raw('GET', `/job/${job.id}`);
    expect(page.headers['x-frame-options']).toBe('DENY');
    expect(page.headers['access-control-allow-origin']).toBeUndefined();
    const token = page.body.match(/name="token" value="([^"]+)"/)![1];

    const evil = await raw('POST', `/approve/${job.id}`, { Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' }, `token=${token}&decision=allow`);
    expect(evil.status).toBe(403);

    const ok = await raw('POST', `/approve/${job.id}`, { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' }, `token=${token}&decision=allow`);
    expect(ok.status).toBe(303);
    await settle();

    const status = await (await fetch(`${base}/status/${job.id}`)).json();
    expect(status).toMatchObject({ status: 'done', progress: 1, launched: true });
    expect(calls.installs).toEqual(['app-linux-x86_64.AppImage']);
  });

  test('a plain link click is redirected to the approval page', async () => {
    const res = await raw('GET', '/install?repo=acme/app', { Accept: 'text/html' });
    expect(res.status).toBe(303);
    expect(res.headers.location).toMatch(/^\/job\//);
  });

  test('bad input and unknown routes', async () => {
    expect((await fetch(`${base}/install?repo=nope`)).status).toBe(400);
    expect((await fetch(`${base}/status/missing`)).status).toBe(404);
    expect((await fetch(`${base}/elsewhere`)).status).toBe(404);
    const jobs = await (await fetch(`${base}/jobs`)).json();
    expect(Array.isArray(jobs)).toBe(true);
  });
});
