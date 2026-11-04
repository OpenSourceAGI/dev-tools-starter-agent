import type { PlatformInfo } from '../types.js';

/**
 * How a downloaded release asset gets onto the machine. Read off the file
 * name alone, so it can be decided before a byte is downloaded.
 */
export type InstallKind =
  | 'appimage'  // Linux: chmod +x, run in place
  | 'deb'       // Linux: dpkg via pkexec (graphical sudo prompt)
  | 'rpm'       // Linux: rpm via pkexec
  | 'dmg'       // macOS: mount, copy the .app into ~/Applications
  | 'pkg'       // macOS: hand to Installer.app
  | 'exe'       // Windows: run it — installer or portable app
  | 'msi'       // Windows: msiexec /i
  | 'archive'   // any OS: extract, then find something to launch
  | 'binary';   // bare executable: chmod +x, keep in the apps folder

/** A release asset chosen for this machine, with how to install it. */
export interface PickedAsset {
  name: string;
  url: string;
  size: number;
  tag: string;
  kind: InstallKind;
}

/** The fields of a GitHub release this module reads. */
export interface RawRelease {
  tag_name: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: Array<{ name: string; size: number; browser_download_url: string }>;
}

/** Files attached to releases that are never the thing to install. */
const NOT_INSTALLABLE =
  /(\.(sha\d*|sha256sum|md5|sig|asc|pem|crt|txt|json|ya?ml|blockmap|sbom|spdx|intoto\.jsonl|zsync|sym|pdb|dSYM\.zip)$)|checksum|sha256sums|(^|[-_.])src([-_.]|$)|source/i;

/**
 * Splits a file name into lowercase tokens on anything that is not a letter or
 * digit. Matching whole tokens rather than substrings is the point: the
 * substring `win` is inside `darwin`, and `arm` is inside `alarm`.
 */
function tokens(name: string): Set<string> {
  return new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

/**
 * Which operating system an asset targets, judged by whole-word keywords and
 * by extension. Returns `'any'` when nothing says, and `'ambiguous'` when the
 * name names more than one OS (e.g. a combined `win-mac-linux.zip`).
 *
 * @example
 * assetOs('app-darwin-arm64.tar.gz'); // → 'macos' (not 'windows' — `darwin` ≠ `win`)
 * assetOs('app_1.0_amd64.deb');       // → 'linux'
 * assetOs('app.jar');                 // → 'any'
 */
export function assetOs(name: string): 'windows' | 'macos' | 'linux' | 'any' | 'ambiguous' {
  const lower = name.toLowerCase();
  const t = tokens(name);
  const has = (...words: string[]) => words.some(w => t.has(w));

  const hits: Array<'windows' | 'macos' | 'linux'> = [];
  if (has('win', 'windows', 'win32', 'win64', 'msvc', 'mingw') || /\.(exe|msi|msix|appx)$/.test(lower)) {
    hits.push('windows');
  }
  if (has('mac', 'macos', 'darwin', 'osx', 'apple', 'macosx') || /\.(dmg|pkg)$/.test(lower)) {
    hits.push('macos');
  }
  if (has('linux', 'ubuntu', 'debian', 'fedora', 'musl', 'gnu') || /\.(deb|rpm|appimage|snap|flatpak)$/.test(lower)) {
    hits.push('linux');
  }

  if (hits.length === 1) return hits[0];
  return hits.length === 0 ? 'any' : 'ambiguous';
}

/**
 * Which CPU architecture an asset targets. `'unknown'` when the name does not
 * say, which in practice usually means x86_64 — so it is allowed, and ranked
 * below an exact match.
 *
 * @example
 * assetArch('fzf-0.55.0-linux_arm64.tar.gz'); // → 'arm64'
 * assetArch('app-x86_64.AppImage');           // → 'x86_64'
 * assetArch('App-universal.dmg');             // → 'universal'
 */
export function assetArch(name: string): string {
  const n = name.toLowerCase();
  if (/universal/.test(n)) return 'universal';
  if (/aarch64|arm64/.test(n)) return 'arm64';
  if (/armv[67]|armhf|armel|(^|[^a-z])arm([^a-z0-9]|$)/.test(n)) return 'arm';
  if (/x86[_-]64|amd64|x64|win64/.test(n)) return 'x86_64';
  if (/i[36]86|x86[_-]32|ia32|win32|(^|[^a-z0-9])386([^0-9]|$)|(^|[^a-z0-9])x86([^_0-9-]|$)/.test(n)) return 'i386';
  return 'unknown';
}

/**
 * Reads the install kind from the file name.
 *
 * @example
 * installKind('Obsidian-1.6.7.AppImage'); // → 'appimage'
 * installKind('app.tar.gz');              // → 'archive'
 * installKind('ripgrep');                 // → 'binary'
 */
export function installKind(name: string): InstallKind | null {
  const n = name.toLowerCase();
  if (n.endsWith('.appimage')) return 'appimage';
  if (n.endsWith('.deb')) return 'deb';
  if (n.endsWith('.rpm')) return 'rpm';
  if (n.endsWith('.dmg')) return 'dmg';
  if (n.endsWith('.pkg')) return 'pkg';
  if (n.endsWith('.exe')) return 'exe';
  if (n.endsWith('.msi')) return 'msi';
  if (/\.(zip|tar\.gz|tgz|tar\.xz|txz|tar\.bz2|tbz2?|tar\.zst|tar)$/.test(n)) return 'archive';
  // No extension at all, or only a version-ish suffix: a bare executable.
  if (!/\.[a-z][a-z0-9]{0,4}$/.test(n)) return 'binary';
  return null;
}

/**
 * How much each install kind is preferred on each OS. Higher wins. A kind
 * missing from an OS's table cannot be installed there.
 *
 * The order favours what installs and launches without a terminal: an
 * AppImage over a `.deb` (no root), a `.dmg` over a `.zip`, a setup `.exe`
 * over a portable `.zip`.
 */
const KIND_SCORE: Record<string, Partial<Record<InstallKind, number>>> = {
  linux:   { appimage: 40, deb: 30, rpm: 25, archive: 20, binary: 15 },
  macos:   { dmg: 40, pkg: 35, archive: 25, binary: 15 },
  windows: { exe: 40, msi: 35, archive: 20 },
};

/**
 * Scores one asset for this machine, or returns `null` when it cannot run
 * here at all — wrong OS, wrong architecture, or not an installable file.
 *
 * @internal
 */
export function scoreAsset(name: string, platform: PlatformInfo): number | null {
  if (NOT_INSTALLABLE.test(name)) return null;

  const kind = installKind(name);
  if (!kind) return null;

  const kindScore = KIND_SCORE[platform.os]?.[kind];
  if (kindScore === undefined) return null;

  const os = assetOs(name);
  if (os === 'ambiguous') return null;
  if (os !== 'any' && os !== platform.os) return null;

  const arch = assetArch(name);
  let archScore: number;
  if (arch === platform.arch) archScore = 100;
  else if (arch === 'universal') archScore = 90;
  // Unlabelled builds are x86_64 by convention (electron-builder names its
  // x64 AppImage `App-1.0.AppImage`), so on x86_64 that is nearly a match;
  // anywhere else it is a guess.
  else if (arch === 'unknown') archScore = platform.arch === 'x86_64' ? 95 : 50;
  // Apple Silicon runs x86_64 builds under Rosetta, and 64-bit Windows runs
  // 32-bit ones — worse than native, better than nothing.
  else if (platform.os === 'macos' && platform.arch === 'arm64' && arch === 'x86_64') archScore = 10;
  else if (platform.os === 'windows' && platform.arch === 'x86_64' && arch === 'i386') archScore = 10;
  else return null;

  // An asset that names its OS is a surer bet than one that names nothing.
  const osScore = os === platform.os ? 5 : 0;

  return archScore + kindScore + osScore;
}

/**
 * Picks the one release asset to install on this machine.
 *
 * Walks releases newest first, skipping drafts and — unless nothing else has a
 * match — pre-releases, and returns the best-scoring asset of the first
 * release that has any match at all. A newer release is always preferred over
 * a better-packaged older one.
 *
 * @param releases - `GET /repos/{owner}/{repo}/releases`, newest first.
 * @param platform - From `getCurrentPlatform()`.
 * @returns The chosen asset, or `null` when no release ships one for this
 *   OS/arch.
 *
 * @example
 * pickAsset(releases, { os: 'linux', arch: 'x86_64', … });
 * // → { name: 'app-1.2.0-x86_64.AppImage', kind: 'appimage', tag: 'v1.2.0', … }
 */
export function pickAsset(releases: RawRelease[], platform: PlatformInfo): PickedAsset | null {
  const published = releases.filter(r => !r.draft);
  const stable = published.filter(r => !r.prerelease);

  for (const pool of [stable, published]) {
    for (const release of pool) {
      let best: PickedAsset | null = null;
      let bestScore = -1;

      for (const asset of release.assets ?? []) {
        const score = scoreAsset(asset.name, platform);
        if (score === null || score <= bestScore) continue;
        bestScore = score;
        best = {
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
          tag: release.tag_name,
          kind: installKind(asset.name)!,
        };
      }

      if (best) return best;
    }
  }

  return null;
}

/**
 * Accepts the forms a download button might pass and reduces them to
 * `owner/repo`. Anything else is rejected — this string ends up in a GitHub
 * API path, so it is validated rather than trusted.
 *
 * @example
 * normalizeRepoSlug('https://github.com/junegunn/fzf/releases'); // → 'junegunn/fzf'
 * normalizeRepoSlug('junegunn/fzf.git');                         // → 'junegunn/fzf'
 * normalizeRepoSlug('../../etc/passwd');                         // → null
 */
export function normalizeRepoSlug(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  s = s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  s = s.replace(/^git@github\.com:/i, '');
  const [owner, repo] = s.split(/[/?#]/);
  if (!owner || !repo) return null;
  const name = repo.replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) return null;
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(name) || name === '.' || name === '..') return null;
  return `${owner}/${name}`;
}

/**
 * Reads the repository out of a `git0://` link, the custom URL scheme the
 * service registers with the OS.
 *
 * @example
 * parseSchemeUrl('git0://install/junegunn/fzf');      // → 'junegunn/fzf'
 * parseSchemeUrl('git0://install?repo=junegunn/fzf'); // → 'junegunn/fzf'
 * parseSchemeUrl('git0://junegunn/fzf');              // → 'junegunn/fzf'
 */
export function parseSchemeUrl(link: string): string | null {
  const m = link.match(/^git0:\/{0,2}(.*)$/i);
  if (!m) return null;
  let rest = m[1];
  const query = rest.match(/[?&]repo=([^&#]+)/);
  if (query) return normalizeRepoSlug(decodeURIComponent(query[1]));
  rest = rest.replace(/^install\/?/i, '').replace(/[?#].*$/, '');
  return normalizeRepoSlug(decodeURIComponent(rest));
}
