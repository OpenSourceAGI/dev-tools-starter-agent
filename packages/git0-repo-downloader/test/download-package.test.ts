import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { downloadPackage, printInstallInstructions } from '../src/download.ts';
import { showPackageMenu, buildReleaseChoices } from '../src/package-menu.ts';

/** Captures console.log / console.error output for the duration of a test. */
function captureConsole() {
  const lines: string[] = [];
  const orig = { log: console.log, error: console.error };
  console.log = (...a: unknown[]) => void lines.push(a.join(' '));
  console.error = (...a: unknown[]) => void lines.push(a.join(' '));
  return {
    text: () => lines.join('\n'),
    restore() {
      console.log = orig.log;
      console.error = orig.error;
    },
  };
}

/** Pretends to run on `platform` for both `process.platform` and `os.platform()`. */
async function withPlatform<T>(platform: string, fn: () => T | Promise<T>): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(process, 'platform')!;
  const originalOs = os.platform;
  Object.defineProperty(process, 'platform', { value: platform });
  (os as any).platform = () => platform;
  try {
    return await fn();
  } finally {
    Object.defineProperty(process, 'platform', original);
    (os as any).platform = originalOs;
  }
}

/** A `callGithub` stand-in that streams `body` to `onStream`, like `grab` does. */
const fakeGithub =
  (body: string | Error) =>
  async (_url: string, params: { onStream: (r: ReadableStream) => Promise<void> }) => {
    if (body instanceof Error) throw body;
    await params.onStream(Readable.toWeb(Readable.from([Buffer.from(body)])) as ReadableStream);
    return {};
  };

describe('downloadPackage', () => {
  let tmp: string;
  let con: ReturnType<typeof captureConsole>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-pkg-'));
    con = captureConsole();
  });

  afterEach(() => {
    con.restore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('streams the asset to disk and returns its path', async () => {
    const dest = path.join(tmp, 'app.deb');
    const result = await downloadPackage(fakeGithub('payload'), 'https://x/app.deb', dest);
    expect(result).toBe(dest);
    expect(fs.readFileSync(dest, 'utf8')).toBe('payload');
    expect(con.text()).toContain('Downloaded app.deb');
    expect(con.text()).toContain('sudo dpkg -i');
  });

  test('marks extension-less binaries executable (non-Windows)', async () => {
    const dest = path.join(tmp, 'tool');
    await downloadPackage(fakeGithub('#!/bin/sh\n'), 'https://x/tool', dest);
    expect(fs.statSync(dest).mode & 0o111).not.toBe(0);
    expect(con.text()).toContain('Made tool executable');
    expect(con.text()).toContain('Binary is ready to use');
  });

  test('does not chmod on Windows', async () => {
    const dest = path.join(tmp, 'tool');
    await withPlatform('win32', () => downloadPackage(fakeGithub('x'), 'https://x/tool', dest));
    expect(con.text()).not.toContain('executable');
  });

  test('reports and rethrows download failures', async () => {
    const dest = path.join(tmp, 'app.deb');
    await expect(
      downloadPackage(fakeGithub(new Error('HTTP 404')), 'https://x/app.deb', dest)
    ).rejects.toThrow('HTTP 404');
    expect(con.text()).toContain('Failed to download app.deb');
  });
});

describe('printInstallInstructions', () => {
  let con: ReturnType<typeof captureConsole>;
  beforeEach(() => void (con = captureConsole()));
  afterEach(() => con.restore());

  const run = async (platform: string, file: string) => {
    await withPlatform(platform, () => printInstallInstructions(`/dl/${file}`, file));
    return con.text();
  };

  test('Windows: exe and msi', async () => {
    expect(await run('win32', 'a.exe')).toContain('Run the executable');
    expect(await run('win32', 'a.msi')).toContain('msiexec /i "/dl/a.msi"');
  });

  test('Windows: other files print nothing', async () => {
    expect(await run('win32', 'a.zip')).toBe('');
  });

  test('macOS: dmg and pkg', async () => {
    expect(await run('darwin', 'a.dmg')).toContain('open "/dl/a.dmg"');
    expect(await run('darwin', 'a.pkg')).toContain('sudo installer -pkg "/dl/a.pkg" -target /');
  });

  test('macOS: other files print nothing', async () => {
    expect(await run('darwin', 'a.zip')).toBe('');
  });

  test('Linux: deb, rpm, AppImage and bare binaries', async () => {
    expect(await run('linux', 'a.deb')).toContain('sudo dpkg -i "/dl/a.deb"');
    expect(await run('linux', 'a.rpm')).toContain('sudo rpm -i "/dl/a.rpm"');
    expect(await run('linux', 'a.AppImage')).toContain('chmod +x "/dl/a.AppImage"');
    expect(await run('linux', 'bin')).toContain('sudo mv "/dl/bin" /usr/local/bin/');
  });

  test('Linux: archives print nothing', async () => {
    expect(await run('linux', 'a.tar.gz')).toBe('');
  });
});

describe('showPackageMenu', () => {
  test('says so and downloads nothing when no packages are selectable', async () => {
    const con = captureConsole();
    let called = false;
    try {
      await showPackageMenu(
        { allReleases: [] },
        async () => {
          called = true;
          return '';
        },
        { os: 'linux', arch: 'x64', platform: 'linux' } as any
      );
      expect(con.text()).toContain('No packages found for download.');
      expect(called).toBe(false);
      expect(buildReleaseChoices([], { os: 'linux' } as any)).toEqual([]);
    } finally {
      con.restore();
    }
  });
});
