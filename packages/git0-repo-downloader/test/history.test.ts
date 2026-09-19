import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { attachGitHistory, attachGitHistoryLazily, cloneHistoryOnly, gitAvailable } from '../src/history.ts';

/** A real repository on disk to clone from, so the conversion is exercised for real. */
let origin: string;
let sandbox: string;

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

beforeAll(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-history-test-'));
  origin = path.join(sandbox, 'origin');
  fs.mkdirSync(origin);

  git(['init', '--quiet', '--initial-branch=main'], origin);
  git(['config', 'user.email', 'test@example.com'], origin);
  git(['config', 'user.name', 'git0 test'], origin);

  fs.writeFileSync(path.join(origin, 'readme.md'), '# one\n');
  git(['add', '.'], origin);
  git(['commit', '--quiet', '-m', 'first'], origin);

  fs.writeFileSync(path.join(origin, 'readme.md'), '# two\n');
  git(['commit', '--quiet', '-am', 'second'], origin);
});

afterAll(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('gitAvailable', () => {
  test('finds the git binary in this environment', async () => {
    await expect(gitAvailable()).resolves.toBe(true);
  });
});

describe('attachGitHistory', () => {
  let extractPath: string;

  beforeEach(() => {
    // Stands in for a tarball extraction: the files, but no .git.
    extractPath = fs.mkdtempSync(path.join(sandbox, 'extract-'));
    fs.writeFileSync(path.join(extractPath, 'readme.md'), '# two\n');
  });

  afterEach(() => {
    fs.rmSync(extractPath, { recursive: true, force: true });
  });

  test('turns an extracted folder into a working repository', async () => {
    await attachGitHistory(extractPath, `file://${origin}`);

    expect(fs.existsSync(path.join(extractPath, '.git'))).toBe(true);
    expect(git(['rev-parse', '--is-bare-repository'], extractPath)).toBe('false');
  });

  test('brings the full history, not one commit', async () => {
    await attachGitHistory(extractPath, `file://${origin}`);

    expect(git(['rev-list', '--count', 'HEAD'], extractPath)).toBe('2');
  });

  test('leaves the working tree clean against the extracted files', async () => {
    await attachGitHistory(extractPath, `file://${origin}`);

    expect(git(['status', '--porcelain'], extractPath)).toBe('');
  });

  test('keeps the extracted files rather than re-checking them out', async () => {
    fs.writeFileSync(path.join(extractPath, 'untracked.txt'), 'mine');

    await attachGitHistory(extractPath, `file://${origin}`);

    expect(fs.readFileSync(path.join(extractPath, 'untracked.txt'), 'utf8')).toBe('mine');
  });

  test('sets up origin so the repo can fetch and push', async () => {
    await attachGitHistory(extractPath, `file://${origin}`);

    expect(git(['config', '--get', 'remote.origin.fetch'], extractPath))
      .toBe('+refs/heads/*:refs/remotes/origin/*');
  });

  test('refuses to overwrite an existing .git', async () => {
    fs.mkdirSync(path.join(extractPath, '.git'));

    await expect(attachGitHistory(extractPath, `file://${origin}`))
      .rejects.toThrow(/already exists/);
  });

  test('refuses a remote that is not a URL', async () => {
    await expect(attachGitHistory(extractPath, 'ext::sh -c whoami'))
      .rejects.toThrow(/Refusing to clone/);
    await expect(attachGitHistory(extractPath, '--upload-pack=touch'))
      .rejects.toThrow(/Refusing to clone/);
  });

  test('leaves no .git behind when the clone fails', async () => {
    await expect(attachGitHistory(extractPath, `file://${path.join(sandbox, 'nope')}`))
      .rejects.toThrow();

    expect(fs.existsSync(path.join(extractPath, '.git'))).toBe(false);
  });
});

describe('attachGitHistoryLazily', () => {
  test('resolves rather than rejecting when the history cannot be fetched', async () => {
    const extractPath = fs.mkdtempSync(path.join(sandbox, 'lazy-'));

    // A download that fails must not take the project down with it.
    await expect(attachGitHistoryLazily(extractPath, 'not-a-url')).resolves.toBeUndefined();
    expect(fs.existsSync(path.join(extractPath, '.git'))).toBe(false);

    fs.rmSync(extractPath, { recursive: true, force: true });
  });
});

describe('cloneHistoryOnly', () => {
  test('produces a history-only repository with no working files', async () => {
    const target = path.join(sandbox, 'mirror.git');
    await cloneHistoryOnly(`file://${origin}`, target);

    expect(fs.existsSync(path.join(target, 'objects'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'readme.md'))).toBe(false);
    expect(git(['--git-dir', target, 'rev-list', '--count', '--all'], sandbox)).toBe('2');

    fs.rmSync(target, { recursive: true, force: true });
  });

  test('restores a normal working copy when cloned from', async () => {
    const target = path.join(sandbox, 'restore.git');
    await cloneHistoryOnly(`file://${origin}`, target);

    const restored = path.join(sandbox, 'restored');
    execFileSync('git', ['clone', '--quiet', target, restored]);

    expect(fs.readFileSync(path.join(restored, 'readme.md'), 'utf8')).toBe('# two\n');

    fs.rmSync(target, { recursive: true, force: true });
    fs.rmSync(restored, { recursive: true, force: true });
  });

  test('refuses to write over an existing directory', async () => {
    const target = path.join(sandbox, 'occupied.git');
    fs.mkdirSync(target);

    await expect(cloneHistoryOnly(`file://${origin}`, target)).rejects.toThrow(/already exists/);

    fs.rmSync(target, { recursive: true, force: true });
  });
});
