import fs from 'fs';
import os from 'os';
import path from 'path';
import { shell } from '../utils.js';
import type { PickedAsset } from './assets.js';

/**
 * Where the service keeps its state, downloads and portable apps.
 * `GIT0_HOME` overrides it — the tests point it at a temp dir.
 */
export function git0Home(): string {
  return process.env.GIT0_HOME || path.join(os.homedir(), '.git0');
}

/** Download progress callback: bytes so far, and the total when known (0 if not). */
export type OnProgress = (received: number, total: number) => void;

/**
 * Streams a URL to a file, reporting progress as the bytes arrive.
 *
 * Uses the global `fetch` rather than the CLI's GitHub client on purpose: the
 * client calls `process.exit` on a 403, which is right for a one-shot command
 * and wrong for a daemon, and it does not expose progress.
 *
 * @param url - Asset URL; GitHub redirects these to its CDN, which fetch follows.
 * @param dest - File to write.
 * @param onProgress - Called after every chunk.
 * @param expectedSize - Used as the total when the server sends no length.
 */
export async function downloadWithProgress(
  url: string,
  dest: string,
  onProgress: OnProgress,
  expectedSize = 0,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const res = await fetchImpl(url, { headers: { 'User-Agent': 'git0-service' }, redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);

  const total = Number(res.headers.get('content-length')) || expectedSize || 0;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const partial = `${dest}.part`;
  const out = fs.createWriteStream(partial);
  let received = 0;
  onProgress(0, total);

  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (!out.write(value)) await new Promise(r => out.once('drain', r));
      onProgress(received, total);
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    fs.renameSync(partial, dest);
  } catch (err) {
    out.destroy();
    fs.rmSync(partial, { force: true });
    throw err;
  }
}

/** What an install left on disk, and how to start it. */
export interface InstallResult {
  /** The installed app, binary or folder. */
  installedPath: string;
  /** Command to launch it, or `null` when there is nothing to launch (a CLI tool, a system package). */
  launch: { cmd: string; args: string[] } | null;
  /** One line for the status endpoint. */
  message: string;
}

/** True when a command is on PATH. */
function hasCommand(cmd: string): boolean {
  try {
    shell.execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const q = (s: string) => JSON.stringify(s);

/** The command that opens a file or app the way a double-click would. */
export function openCommand(target: string, platform = process.platform): { cmd: string; args: string[] } {
  if (platform === 'darwin') return { cmd: 'open', args: [target] };
  if (platform === 'win32') return { cmd: 'explorer.exe', args: [target] };
  return { cmd: target, args: [] };
}

/**
 * Walks an extracted archive for the thing a user would double-click: a
 * `.app` bundle on macOS, an `.exe` on Windows, an executable file elsewhere.
 * Prefers a name that contains the repository name, then the shallowest hit.
 *
 * @internal
 */
export function findLaunchable(dir: string, repoName: string, platform = process.platform): string | null {
  const hits: Array<{ p: string; depth: number; named: boolean }> = [];
  const want = repoName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const walk = (d: string, depth: number) => {
    if (depth > 4) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      const named = e.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(want);
      if (platform === 'darwin' && e.isDirectory() && e.name.endsWith('.app')) {
        hits.push({ p, depth, named });
        continue; // never descend into a bundle
      }
      if (e.isDirectory()) { walk(p, depth + 1); continue; }
      if (!e.isFile()) continue;
      if (platform === 'win32') {
        if (/\.exe$/i.test(e.name) && !/unins|uninstall|setup-helper/i.test(e.name)) hits.push({ p, depth, named });
      } else if (platform !== 'darwin' || !e.name.includes('.')) {
        try {
          if (fs.statSync(p).mode & 0o111 && !/\.(so|dylib|sh)(\.|$)/.test(e.name)) hits.push({ p, depth, named });
        } catch { /* unreadable — skip */ }
      }
    }
  };
  walk(dir, 0);

  hits.sort((a, b) => Number(b.named) - Number(a.named) || a.depth - b.depth);
  return hits[0]?.p ?? null;
}

/** Extracts an archive into `dest` with the system's own tools. */
function extract(file: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const isZip = /\.zip$/i.test(file);
  if (isZip && process.platform === 'linux') {
    shell.execSync(`unzip -q -o ${q(file)} -d ${q(dest)}`, { stdio: 'ignore' });
  } else {
    // bsdtar on macOS and Windows 10+ reads zip as well as every tar flavour.
    shell.execSync(`tar -xf ${q(file)} -C ${q(dest)}`, { stdio: 'ignore' });
  }
}

/**
 * Installs a downloaded release asset for the current OS and says how to
 * launch it.
 *
 * Nothing here runs with elevated rights silently. `.deb`/`.rpm` go through
 * `pkexec`, which shows the desktop's own password dialog; `.pkg` and `.msi`
 * open their own installer UI; a `.exe` is the installer. Everything else is
 * a per-user install under `~/.git0/apps` (or `~/Applications` on macOS).
 *
 * @param file - The downloaded asset.
 * @param asset - The pick it came from, for its install kind.
 * @param repo - `owner/repo`, which names the install folder.
 */
export function installAsset(file: string, asset: PickedAsset, repo: string): InstallResult {
  const repoName = repo.split('/')[1];
  const appsDir = path.join(git0Home(), 'apps', repo.replace('/', '__'));
  fs.mkdirSync(appsDir, { recursive: true });

  switch (asset.kind) {
    case 'appimage':
    case 'binary': {
      const target = path.join(appsDir, asset.name);
      fs.copyFileSync(file, target);
      fs.chmodSync(target, 0o755);
      return asset.kind === 'appimage'
        ? { installedPath: target, launch: { cmd: target, args: [] }, message: `Installed ${asset.name}` }
        : { installedPath: target, launch: null, message: `Installed command-line tool at ${target}` };
    }

    case 'deb':
    case 'rpm': {
      const tool = asset.kind === 'deb' ? `dpkg -i ${q(file)}` : `rpm -U --replacepkgs ${q(file)}`;
      if (!hasCommand('pkexec')) {
        return { installedPath: file, launch: null, message: `Downloaded. Install with: sudo ${tool}` };
      }
      shell.execSync(`pkexec ${tool}`, { stdio: 'ignore' });
      const launch = hasCommand(repoName) ? { cmd: repoName, args: [] } : null;
      return { installedPath: file, launch, message: `Installed ${asset.name} system-wide` };
    }

    case 'dmg': {
      const mount = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-dmg-'));
      shell.execSync(`hdiutil attach -nobrowse -readonly -mountpoint ${q(mount)} ${q(file)}`, { stdio: 'ignore' });
      try {
        const app = fs.readdirSync(mount).find(n => n.endsWith('.app'));
        if (!app) {
          const pkg = fs.readdirSync(mount).find(n => n.endsWith('.pkg'));
          if (pkg) {
            const copy = path.join(appsDir, pkg);
            fs.copyFileSync(path.join(mount, pkg), copy);
            return { installedPath: copy, launch: openCommand(copy), message: `Opening installer ${pkg}` };
          }
          throw new Error('No .app or .pkg found in the disk image');
        }
        const userApps = path.join(os.homedir(), 'Applications');
        fs.mkdirSync(userApps, { recursive: true });
        const target = path.join(userApps, app);
        fs.rmSync(target, { recursive: true, force: true });
        shell.execSync(`cp -R ${q(path.join(mount, app))} ${q(target)}`, { stdio: 'ignore' });
        return { installedPath: target, launch: openCommand(target), message: `Installed ${app} to ~/Applications` };
      } finally {
        try { shell.execSync(`hdiutil detach ${q(mount)} -quiet`, { stdio: 'ignore' }); } catch { /* already gone */ }
        fs.rmSync(mount, { recursive: true, force: true });
      }
    }

    case 'pkg':
    case 'msi':
    case 'exe': {
      // These are installers with their own UI: running one *is* the install,
      // and the user approves or cancels it there.
      const launch = asset.kind === 'msi'
        ? { cmd: 'msiexec', args: ['/i', file] }
        : asset.kind === 'pkg' ? openCommand(file) : { cmd: file, args: [] };
      return { installedPath: file, launch, message: `Opening ${asset.name}` };
    }

    case 'archive': {
      const dest = path.join(appsDir, asset.tag || 'latest');
      fs.rmSync(dest, { recursive: true, force: true });
      extract(file, dest);
      const found = findLaunchable(dest, repoName);
      if (!found) return { installedPath: dest, launch: null, message: `Extracted to ${dest}` };
      if (found.endsWith('.app') || /\.exe$/i.test(found)) {
        return { installedPath: found, launch: openCommand(found), message: `Installed ${path.basename(found)}` };
      }
      // An executable from a tarball is far more often a CLI than a GUI app:
      // report where it is rather than start it with no terminal attached.
      return { installedPath: found, launch: null, message: `Installed command-line tool at ${found}` };
    }
  }
}

/**
 * Starts the installed app detached from the service, so it outlives it and
 * does not hold its stdio.
 */
export function launchApp(launch: { cmd: string; args: string[] }): void {
  const child = shell.spawn(launch.cmd, launch.args, { detached: true, stdio: 'ignore' }) as any;
  child?.on?.('error', () => { /* reported as launched; the app's own failure is not ours */ });
  child?.unref?.();
}
