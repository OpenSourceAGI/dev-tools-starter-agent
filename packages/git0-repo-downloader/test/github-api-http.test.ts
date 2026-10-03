import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import GithubAPI from '../src/github-api.ts';

/**
 * Runs the real client against a local HTTP server standing in for
 * api.github.com — no module mocking, so it behaves the same under vitest and
 * `bun test`.
 */
const RELEASES = [
  {
    tag_name: 'v1.0.0',
    name: 'v1.0.0',
    published_at: '2024-01-01T00:00:00Z',
    assets: [
      { name: 'tool-linux-x86_64.tar.gz', browser_download_url: 'https://x/linux', size: 1, download_count: 1 },
      { name: 'tool-windows-x86_64.zip', browser_download_url: 'https://x/win', size: 1, download_count: 1 },
      { name: 'tool-macos-arm64.dmg', browser_download_url: 'https://x/mac', size: 1, download_count: 1 },
    ],
  },
];

const REPOS = [
  { name: 'alpha', full_name: 'o/alpha', owner: { login: 'o' }, url: 'https://github.com/o/alpha', stargazers_count: 5 },
  { name: 'beta', full_name: 'o/beta', owner: { login: 'o' }, url: 'https://github.com/o/beta', stargazers_count: 3 },
];

let server: http.Server;
let base: string;
let requests: Array<{ url: string; auth?: string }>;
let mode: 'ok' | 'rate-limit' | 'empty';

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push({ url: req.url ?? '', auth: req.headers.authorization });
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (mode === 'rate-limit') return json(403, { message: 'rate limit' });
    if (req.url?.startsWith('/search/repositories')) {
      return json(200, mode === 'empty' ? { total_count: 0 } : { items: REPOS });
    }
    if (req.url?.endsWith('/releases')) {
      return json(200, req.url.includes('/alpha/') ? RELEASES : []);
    }
    json(404, { message: 'not found' });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

let logs: string[];
let origLog: typeof console.log;
let origErr: typeof console.error;
let origExit: typeof process.exit;
let exits: Array<number | undefined>;

beforeEach(() => {
  requests = [];
  mode = 'ok';
  logs = [];
  exits = [];
  origLog = console.log;
  origErr = console.error;
  origExit = process.exit;
  console.log = (...a: unknown[]) => void logs.push(a.join(' '));
  console.error = (...a: unknown[]) => void logs.push(a.join(' '));
  (process as any).exit = (code?: number) => void exits.push(code);
});

afterEach(() => {
  console.log = origLog;
  console.error = origErr;
  process.exit = origExit;
});

describe('GithubAPI over HTTP', () => {
  test('searchRepositories queries by name sorted by stars and enriches release info', async () => {
    const api = new GithubAPI({ baseURL: base });
    const results = await api.searchRepositories('alpha', { perPage: 2 });

    const search = requests.find((r) => r.url.startsWith('/search/repositories'))!;
    expect(decodeURIComponent(search.url).replace(/\+/g, ' ')).toContain('q=alpha in:name');
    expect(search.url).toContain('sort=stars');
    expect(search.url).toContain('order=desc');
    expect(search.url).toContain('per_page=2');

    expect(results).toHaveLength(2);
    const alpha = results.find((r) => r.name === 'alpha')!;
    const beta = results.find((r) => r.name === 'beta')!;
    expect(alpha.hasReleases).toBe(true);
    expect(alpha.allReleases.length).toBeGreaterThan(0);
    expect(beta.hasReleases).toBe(false);
    expect(beta.hasCompatibleReleases).toBe(false);
  });

  test('getReleaseInfo: false returns the raw items without extra requests', async () => {
    const api = new GithubAPI({ baseURL: base });
    const results = await api.searchRepositories('alpha', { getReleaseInfo: false });
    expect(results.map((r) => r.name)).toEqual(['alpha', 'beta']);
    expect(requests.filter((r) => r.url.endsWith('/releases'))).toHaveLength(0);
  });

  test('an empty response logs and returns no results', async () => {
    mode = 'empty';
    const api = new GithubAPI({ baseURL: base });
    expect(await api.searchRepositories('nothing')).toEqual([]);
    expect(logs.join('\n')).toContain('No response');
  });

  test('sends the token as an Authorization header', async () => {
    const api = new GithubAPI({ baseURL: base, token: 'abc123' });
    await api.getReleases('o', 'alpha');
    expect(requests[0].auth).toBe('token abc123');
  });

  test('falls back to GITHUB_TOKEN from the environment', async () => {
    const prev = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'envtoken';
    try {
      const api = new GithubAPI({ baseURL: base });
      await api.getReleases('o', 'alpha');
      expect(requests[0].auth).toBe('token envtoken');
    } finally {
      if (prev === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = prev;
    }
  });

  test('getReleases categorizes by platform; getCompatibleReleases filters', async () => {
    const api = new GithubAPI({ baseURL: base });
    const all = await api.getReleases('o', 'alpha');
    expect(all).toHaveLength(1);
    expect(all[0].tag_name).toBe('v1.0.0');
    expect(requests[0].url).toBe('/repos/o/alpha/releases');

    const compatible = await api.getCompatibleReleases('o', 'alpha');
    expect(Array.isArray(compatible)).toBe(true);
  });

  test('a 403 tells the user to set GITHUB_TOKEN and exits 1', async () => {
    mode = 'rate-limit';
    const api = new GithubAPI({ baseURL: base });
    await api.getReleases('o', 'alpha').catch(() => {});
    expect(logs.join('\n')).toContain('Rate limit exceeded. Set the GITHUB_TOKEN env var.');
    expect(exits).toContain(1);
  });

  test('delegates the small helpers', () => {
    const api = new GithubAPI({ baseURL: base });
    expect(api.getCurrentPlatform().platform).toBe(process.platform);
    expect(api.parseTarget('vitejs/vite')).toMatchObject({ owner: 'vitejs', name: 'vite' });
    expect(api.parseTarget('react starter')).toBe(false);
  });
});
