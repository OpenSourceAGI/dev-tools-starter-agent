import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getInstalledIde, openInIDE } from '../src/ide.ts';
import { shell } from '../src/utils.ts';
import { installFakeShell, type FakeShell } from './helpers/fake-shell.ts';

describe('getInstalledIde', () => {
  let fake: FakeShell;
  afterEach(() => fake?.restore());

  test('returns null when no supported editor is installed', () => {
    fake = installFakeShell();
    expect(getInstalledIde()).toBeNull();
    expect(fake.probes).toEqual([
      'antigravity', 'cursor', 'windsurf', 'code', 'code-server', 'nvim', 'webstorm',
    ]);
  });

  test('returns the first editor in priority order', () => {
    fake = installFakeShell({ available: ['code', 'nvim', 'cursor'] });
    expect(getInstalledIde()).toEqual({ name: 'Cursor', cmd: 'cursor' });
    expect(fake.probes).toEqual(['antigravity', 'cursor']);
  });

  test('probes with `where` on Windows', () => {
    fake = installFakeShell({ available: ['code'] });
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
    Object.defineProperty(process, 'platform', { value: 'win32' });
    try {
      expect(getInstalledIde()?.cmd).toBe('code');
    } finally {
      Object.defineProperty(process, 'platform', platform);
    }
  });
});

describe('openInIDE', () => {
  let fake: FakeShell;
  let logs: string[];
  let origLog: typeof console.log;
  let tmp: string;

  beforeEach(() => {
    logs = [];
    origLog = console.log;
    console.log = (...a: unknown[]) => void logs.push(a.join(' '));
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-ide-'));
  });

  afterEach(() => {
    console.log = origLog;
    fake?.restore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('warns and spawns nothing without a supported IDE', () => {
    fake = installFakeShell();
    openInIDE(tmp);
    expect(fake.spawned).toEqual([]);
    expect(logs.join('\n')).toContain('No supported IDE found');
  });

  test('launches the IDE detached on the project directory', () => {
    fake = installFakeShell({ available: ['code'] });
    openInIDE(tmp);
    expect(fake.spawned).toEqual([['code', [tmp]]]);
    expect(logs.join('\n')).toContain(`Opening ${path.basename(tmp)} in VSCode`);
  });

  test('code-server gets --open', () => {
    fake = installFakeShell({ available: ['code-server'] });
    openInIDE(tmp);
    expect(fake.spawned[0]).toEqual(['code-server', [tmp, '--open']]);
  });

  test('swallows launch errors', () => {
    fake = installFakeShell({ available: ['code'] });
    (shell as any).spawn = () => {
      throw new Error('spawn failed');
    };
    expect(() => openInIDE(tmp)).not.toThrow();
    expect(logs.join('\n')).not.toContain('Opening');
  });

  test('opens the README a few seconds later', async () => {
    fake = installFakeShell({ available: ['code'] });
    fs.writeFileSync(path.join(tmp, 'README.md'), '# hi');
    openInIDE(tmp);
    expect(fake.spawned).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 3200));
    expect(fake.spawned).toHaveLength(2);
    expect(fake.spawned[1]).toEqual(['code', [`${tmp}/README.md`]]);
  }, 10_000);

  test('falls back to package.json, and skips when there is no entry document', async () => {
    fake = installFakeShell({ available: ['code'] });
    fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
    openInIDE(tmp);
    await new Promise((r) => setTimeout(r, 3200));
    expect(fake.spawned[1]).toEqual(['code', [`${tmp}/package.json`]]);

    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-ide-empty-'));
    try {
      const before = fake.spawned.length;
      openInIDE(empty);
      await new Promise((r) => setTimeout(r, 3200));
      expect(fake.spawned.length).toBe(before + 1);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  }, 15_000);
});
