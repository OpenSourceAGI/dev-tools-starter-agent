import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  downloadWithProgress,
  findLaunchable,
  installAsset,
  openCommand,
} from '../src/service/installer.ts';
import {
  desktopEntry,
  installSystemService,
  launchAgentPlist,
  serviceFiles,
  systemdUnit,
  uninstallSystemService,
  windowsCommands,
} from '../src/service/system-service.ts';
import { installFakeShell } from './helpers/fake-shell.ts';
import type { PickedAsset } from '../src/service/assets.ts';

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-inst-'));
  process.env.GIT0_HOME = path.join(tmp, 'home');
});
afterEach(() => {
  delete process.env.GIT0_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

const asset = (name: string, kind: PickedAsset['kind']): PickedAsset =>
  ({ name, kind, url: 'https://dl/x', size: 3, tag: 'v1' });

describe('downloadWithProgress', () => {
  test('streams to disk and reports progress against content-length', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])];
    const fakeFetch = (async () =>
      new Response(new ReadableStream({
        start(c) { chunks.forEach(ch => c.enqueue(ch)); c.close(); },
      }), { headers: { 'content-length': '5' } })) as unknown as typeof fetch;

    const seen: Array<[number, number]> = [];
    const dest = path.join(tmp, 'd', 'file.bin');
    await downloadWithProgress('https://x', dest, (r, t) => seen.push([r, t]), 0, fakeFetch);

    expect([...fs.readFileSync(dest)]).toEqual([1, 2, 3, 4, 5]);
    expect(seen).toEqual([[0, 5], [2, 5], [5, 5]]);
    expect(fs.existsSync(`${dest}.part`)).toBe(false);
  });

  test('throws on an HTTP error and leaves no partial file', async () => {
    const fakeFetch = (async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    const dest = path.join(tmp, 'f');
    await expect(downloadWithProgress('https://x', dest, () => {}, 0, fakeFetch)).rejects.toThrow(/404/);
    expect(fs.existsSync(dest)).toBe(false);
  });
});

describe('openCommand', () => {
  test('per platform', () => {
    expect(openCommand('/a.app', 'darwin')).toEqual({ cmd: 'open', args: ['/a.app'] });
    expect(openCommand('C:\\a.exe', 'win32')).toEqual({ cmd: 'explorer.exe', args: ['C:\\a.exe'] });
    expect(openCommand('/a.AppImage', 'linux')).toEqual({ cmd: '/a.AppImage', args: [] });
  });
});

describe('findLaunchable', () => {
  test('prefers an executable named after the repo, then the shallowest', () => {
    const d = path.join(tmp, 'x');
    fs.mkdirSync(path.join(d, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(d, 'README'), 'x');
    fs.writeFileSync(path.join(d, 'helper'), 'x', { mode: 0o755 });
    fs.writeFileSync(path.join(d, 'bin', 'my-tool'), 'x', { mode: 0o755 });
    fs.writeFileSync(path.join(d, 'libfoo.so'), 'x', { mode: 0o755 });
    expect(findLaunchable(d, 'my-tool', 'linux')).toBe(path.join(d, 'bin', 'my-tool'));
    expect(findLaunchable(d, 'other', 'linux')).toBe(path.join(d, 'helper'));
  });

  test('finds a .app bundle on macOS and an .exe on Windows', () => {
    const d = path.join(tmp, 'y');
    fs.mkdirSync(path.join(d, 'Thing.app', 'Contents'), { recursive: true });
    fs.writeFileSync(path.join(d, 'Thing.exe'), 'x');
    fs.writeFileSync(path.join(d, 'unins000.exe'), 'x');
    expect(findLaunchable(d, 'thing', 'darwin')).toBe(path.join(d, 'Thing.app'));
    expect(findLaunchable(d, 'thing', 'win32')).toBe(path.join(d, 'Thing.exe'));
  });
});

describe('installAsset', () => {
  test('AppImage: copied, made executable, launched', () => {
    const file = path.join(tmp, 'App.AppImage');
    fs.writeFileSync(file, 'elf');
    const res = installAsset(file, asset('App.AppImage', 'appimage'), 'acme/app');
    expect(res.installedPath).toBe(path.join(tmp, 'home', 'apps', 'acme__app', 'App.AppImage'));
    expect(fs.statSync(res.installedPath).mode & 0o111).toBeTruthy();
    expect(res.launch).toEqual({ cmd: res.installedPath, args: [] });
  });

  test('bare binary: installed, not launched', () => {
    const file = path.join(tmp, 'tool');
    fs.writeFileSync(file, 'elf');
    const res = installAsset(file, asset('tool', 'binary'), 'acme/tool');
    expect(res.launch).toBeNull();
    expect(res.message).toMatch(/command-line tool/);
  });

  test.skipIf(process.platform === 'win32')('archive: extracted, and the CLI inside located', () => {
    const src = path.join(tmp, 'src');
    fs.mkdirSync(path.join(src, 'tool-1.0'), { recursive: true });
    fs.writeFileSync(path.join(src, 'tool-1.0', 'tool'), '#!/bin/sh\n', { mode: 0o755 });
    const archive = path.join(tmp, 'tool.tar.gz');
    execSync(`tar -czf "${archive}" -C "${src}" tool-1.0`);

    const res = installAsset(archive, asset('tool.tar.gz', 'archive'), 'acme/tool');
    expect(res.installedPath).toBe(path.join(tmp, 'home', 'apps', 'acme__tool', 'v1', 'tool-1.0', 'tool'));
    expect(res.launch).toBeNull();
  });

  test('installers open their own UI', () => {
    const exe = installAsset('/d/Setup.exe', asset('Setup.exe', 'exe'), 'acme/app');
    expect(exe.launch).toEqual({ cmd: '/d/Setup.exe', args: [] });
    const msi = installAsset('/d/a.msi', asset('a.msi', 'msi'), 'acme/app');
    expect(msi.launch).toEqual({ cmd: 'msiexec', args: ['/i', '/d/a.msi'] });
  });

  test('deb without pkexec: downloaded, with the command to finish', () => {
    const sh = installFakeShell({ available: [] });
    try {
      const res = installAsset('/d/a.deb', asset('a.deb', 'deb'), 'acme/app');
      expect(res.launch).toBeNull();
      expect(res.message).toContain('sudo dpkg -i "/d/a.deb"');
      expect(sh.commands).toEqual([]);
    } finally {
      sh.restore();
    }
  });

  test('deb with pkexec: installs through the graphical prompt', () => {
    const sh = installFakeShell({ available: ['pkexec', 'app'] });
    try {
      const res = installAsset('/d/a.deb', asset('a.deb', 'deb'), 'acme/app');
      expect(sh.commands).toEqual(['pkexec dpkg -i "/d/a.deb"']);
      expect(res.launch).toEqual({ cmd: 'app', args: [] });
    } finally {
      sh.restore();
    }
  });
});

describe('system service files', () => {
  const spec = { runtime: '/usr/bin/node', script: '/opt/git0/dist/cli.js', port: 47100, home: '/home/u' };

  test('systemd unit runs the service on the port', () => {
    const unit = systemdUnit(spec);
    expect(unit).toContain('ExecStart="/usr/bin/node" "/opt/git0/dist/cli.js" --service --port=47100');
    expect(unit).toContain('WantedBy=default.target');
  });

  test('desktop entry handles git0:// links', () => {
    const entry = desktopEntry(spec);
    expect(entry).toContain('MimeType=x-scheme-handler/git0;');
    expect(entry).toContain('Exec="/usr/bin/node" "/opt/git0/dist/cli.js" %u');
  });

  test('LaunchAgent keeps the service alive', () => {
    const plist = launchAgentPlist(spec);
    expect(plist).toContain('<string>--service</string>');
    expect(plist).toContain('<key>KeepAlive</key><true/>');
    expect(plist).toContain('/home/u/Library/Logs/git0-service.log');
  });

  test('Windows: logon task and protocol keys under HKCU', () => {
    const cmds = windowsCommands(spec);
    expect(cmds[0]).toMatch(/^schtasks \/Create .*\/SC ONLOGON .*\/TN git0-service/);
    expect(cmds.join('\n')).toContain('HKCU\\Software\\Classes\\git0');
    expect(cmds.join('\n')).toContain('URL Protocol');
  });

  test('install and uninstall on Linux write and remove the files', () => {
    const home = path.join(tmp, 'u');
    const sh = installFakeShell();
    try {
      const out = installSystemService({ ...spec, home }, 'linux');
      const files = serviceFiles(home);
      expect(fs.readFileSync(files.systemdUnit, 'utf8')).toContain('--service');
      expect(fs.existsSync(files.desktopEntry)).toBe(true);
      expect(sh.commands).toContain('systemctl --user enable --now git0.service');
      expect(sh.commands).toContain('xdg-mime default git0-handler.desktop x-scheme-handler/git0');
      expect(out.join('\n')).toMatch(/Started git0.service/);

      uninstallSystemService('linux', home);
      expect(fs.existsSync(files.systemdUnit)).toBe(false);
      expect(fs.existsSync(files.desktopEntry)).toBe(false);
    } finally {
      sh.restore();
    }
  });
});
