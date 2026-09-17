import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as tar from 'tar';
import { downloadRepo } from '../src/download.ts';

/**
 * Builds a tarball shaped exactly like the ones GitHub's `/tarball` endpoint
 * serves: every entry under one top-level `owner-repo-sha/` directory.
 */
function githubTarball(root: string, files: Record<string, string>): string {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-tarball-'));
  const wrapper = path.join(staging, root);

  for (const [relative, contents] of Object.entries(files)) {
    const full = path.join(wrapper, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }

  const archive = path.join(staging, 'repo.tar.gz');
  tar.c({ gzip: true, sync: true, C: staging, file: archive }, [root]);
  return archive;
}

/**
 * A `callGithub` stand-in that hands the tarball to `onStream` the way `grab`
 * does — including awaiting it, which is what lets extraction finish before
 * `downloadRepo` moves on.
 */
function fakeGithub(archive: string, options: { fail?: boolean } = {}) {
  const requested: string[] = [];

  const callGithub = async (url: string, params?: any) => {
    requested.push(url);
    if (options.fail) return { error: 'HTTP error: 404 Not Found' };

    const stream = fs.createReadStream(archive);
    const { Readable } = await import('stream');
    await params.onStream(Readable.toWeb(stream) as ReadableStream);
    return {};
  };

  return { callGithub, requested };
}

const FILES = {
  'package.json': '{"name":"demo"}',
  'readme.md': '# demo\n',
  'packages/ui/package.json': '{"name":"ui"}',
  'packages/ui/src/index.ts': 'export const ui = 1;\n',
  'packages/core/index.ts': 'export const core = 1;\n',
  '.continue/agents/new-config.yaml': 'name: agent\n',
};

describe('downloadRepo', () => {
  let cwd: string;
  let tmp: string;
  let archive: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-download-'));
    process.chdir(tmp);
    archive = githubTarball('owner-demo-abc1234', FILES);
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('extracts the whole repository into a folder named after it', async () => {
    const { callGithub } = fakeGithub(archive);
    const dir = await downloadRepo(callGithub, 'https://github.com/owner/demo');

    expect(path.basename(dir)).toBe('demo');
    expect(fs.readdirSync(dir).sort()).toEqual(['.continue', 'package.json', 'packages', 'readme.md']);
  });

  test('downloads only the sub-path when one is given', async () => {
    const { callGithub } = fakeGithub(archive);
    const dir = await downloadRepo(callGithub, 'https://github.com/owner/demo', null, {
      subPath: 'packages/ui',
      subPathType: 'tree',
    });

    expect(fs.readdirSync(dir).sort()).toEqual(['package.json', 'src']);
    expect(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).toBe('{"name":"ui"}');
  });

  test('never writes the parts of the repo it was not asked for', async () => {
    const { callGithub } = fakeGithub(archive);
    const dir = await downloadRepo(callGithub, 'https://github.com/owner/demo', null, {
      subPath: 'packages/ui',
      subPathType: 'tree',
    });

    expect(fs.existsSync(path.join(dir, 'readme.md'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'core'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'packages'))).toBe(false);
  });

  test('names the folder after the sub-path, not the repository', async () => {
    const { callGithub } = fakeGithub(archive);
    const dir = await downloadRepo(callGithub, 'https://github.com/owner/demo', null, {
      subPath: '.continue/agents',
      subPathType: 'tree',
    });

    expect(path.basename(dir)).toBe('agents');
    expect(fs.readdirSync(dir)).toEqual(['new-config.yaml']);
  });

  test('downloads a single file and names the folder after its parent', async () => {
    const { callGithub } = fakeGithub(archive);
    const dir = await downloadRepo(callGithub, 'https://github.com/owner/demo', null, {
      subPath: '.continue/agents/new-config.yaml',
      subPathType: 'blob',
    });

    expect(path.basename(dir)).toBe('agents');
    expect(fs.readdirSync(dir)).toEqual(['new-config.yaml']);
    expect(fs.readFileSync(path.join(dir, 'new-config.yaml'), 'utf8')).toBe('name: agent\n');
  });

  test('an explicit folder name still wins over the sub-path', async () => {
    const { callGithub } = fakeGithub(archive);
    const dir = await downloadRepo(callGithub, 'https://github.com/owner/demo', 'my-ui', {
      subPath: 'packages/ui',
      subPathType: 'tree',
    });

    expect(path.basename(dir)).toBe('my-ui');
  });

  test('requests the named ref and does not guess at a branch', async () => {
    const { callGithub, requested } = fakeGithub(archive);
    await downloadRepo(callGithub, 'https://github.com/owner/demo', null, { ref: 'develop' });

    expect(requested).toEqual(['/repos/owner/demo/tarball/develop']);
  });

  test('falls back from master to main when no ref was named', async () => {
    const { callGithub, requested } = fakeGithub(archive, { fail: true });
    await expect(downloadRepo(callGithub, 'https://github.com/owner/demo')).rejects.toThrow();

    expect(requested).toEqual([
      '/repos/owner/demo/tarball/master',
      '/repos/owner/demo/tarball/main',
    ]);
  });

  test('reports a failed download instead of leaving an empty folder', async () => {
    const { callGithub } = fakeGithub(archive, { fail: true });

    await expect(downloadRepo(callGithub, 'https://github.com/owner/demo'))
      .rejects.toThrow(/Could not download owner\/demo/);
    expect(fs.existsSync(path.join(tmp, 'demo'))).toBe(false);
  });

  test('says which path was missing rather than producing an empty folder', async () => {
    const { callGithub } = fakeGithub(archive);

    await expect(
      downloadRepo(callGithub, 'https://github.com/owner/demo', null, { subPath: 'packages/nope' })
    ).rejects.toThrow(/not found in this repository/);
  });

  test('refuses a sub-path that would escape the target folder', async () => {
    const { callGithub } = fakeGithub(archive);

    await expect(
      downloadRepo(callGithub, 'https://github.com/owner/demo', null, { subPath: '../../etc' })
    ).rejects.toThrow(/\.\./);
  });
});
