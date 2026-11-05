import { describe, expect, test } from 'vitest';
import {
  assetArch,
  assetOs,
  installKind,
  normalizeRepoSlug,
  parseSchemeUrl,
  pickAsset,
  type RawRelease,
} from '../src/service/assets.ts';
import type { PlatformInfo } from '../src/types.ts';

const linux: PlatformInfo = { os: 'linux', arch: 'x86_64', platform: 'linux', architecture: 'x64' };
const linuxArm: PlatformInfo = { os: 'linux', arch: 'arm64', platform: 'linux', architecture: 'arm64' };
const macArm: PlatformInfo = { os: 'macos', arch: 'arm64', platform: 'darwin', architecture: 'arm64' };
const macIntel: PlatformInfo = { os: 'macos', arch: 'x86_64', platform: 'darwin', architecture: 'x64' };
const win: PlatformInfo = { os: 'windows', arch: 'x86_64', platform: 'win32', architecture: 'x64' };

const release = (tag: string, names: string[], extra: Partial<RawRelease> = {}): RawRelease => ({
  tag_name: tag,
  assets: names.map(name => ({ name, size: 100, browser_download_url: `https://dl/${tag}/${name}` })),
  ...extra,
});

describe('assetOs', () => {
  test('does not read darwin as windows', () => {
    expect(assetOs('fzf-0.55.0-darwin_arm64.tar.gz')).toBe('macos');
  });
  test('reads OS from extension', () => {
    expect(assetOs('App.Setup.1.0.exe')).toBe('windows');
    expect(assetOs('App-1.0.dmg')).toBe('macos');
    expect(assetOs('app_1.0_amd64.deb')).toBe('linux');
  });
  test('any when nothing says, ambiguous when several do', () => {
    expect(assetOs('tool.tar.gz')).toBe('any');
    expect(assetOs('tool-win-mac-linux.zip')).toBe('ambiguous');
  });
});

describe('assetArch', () => {
  test.each([
    ['app-linux-aarch64.tar.gz', 'arm64'],
    ['app_amd64.deb', 'x86_64'],
    ['app-x86_64.AppImage', 'x86_64'],
    ['app-armv7.tar.gz', 'arm'],
    ['app-i686.exe', 'i386'],
    ['App-universal.dmg', 'universal'],
    ['app.tar.gz', 'unknown'],
  ])('%s → %s', (name, arch) => {
    expect(assetArch(name)).toBe(arch);
  });
});

describe('installKind', () => {
  test.each([
    ['Obsidian-1.6.7.AppImage', 'appimage'],
    ['a.deb', 'deb'],
    ['a.rpm', 'rpm'],
    ['a.dmg', 'dmg'],
    ['a.pkg', 'pkg'],
    ['a.exe', 'exe'],
    ['a.msi', 'msi'],
    ['a.tar.gz', 'archive'],
    ['a.zip', 'archive'],
    ['ripgrep', 'binary'],
    ['fzf-0.55.0-linux_amd64', 'binary'],
    ['notes.jar', null],
  ])('%s → %s', (name, kind) => {
    expect(installKind(name)).toBe(kind);
  });
});

describe('pickAsset', () => {
  const fzf = release('v0.55.0', [
    'fzf-0.55.0-darwin_amd64.tar.gz',
    'fzf-0.55.0-darwin_arm64.tar.gz',
    'fzf-0.55.0-linux_amd64.tar.gz',
    'fzf-0.55.0-linux_arm64.tar.gz',
    'fzf-0.55.0-windows_amd64.zip',
    'fzf_0.55.0_checksums.txt',
  ]);

  test('matches OS and architecture', () => {
    expect(pickAsset([fzf], linux)?.name).toBe('fzf-0.55.0-linux_amd64.tar.gz');
    expect(pickAsset([fzf], linuxArm)?.name).toBe('fzf-0.55.0-linux_arm64.tar.gz');
    expect(pickAsset([fzf], macArm)?.name).toBe('fzf-0.55.0-darwin_arm64.tar.gz');
    expect(pickAsset([fzf], win)?.name).toBe('fzf-0.55.0-windows_amd64.zip');
  });

  test('carries tag, url and install kind', () => {
    expect(pickAsset([fzf], linux)).toEqual({
      name: 'fzf-0.55.0-linux_amd64.tar.gz',
      url: 'https://dl/v0.55.0/fzf-0.55.0-linux_amd64.tar.gz',
      size: 100,
      tag: 'v0.55.0',
      kind: 'archive',
    });
  });

  test('prefers installer formats over archives', () => {
    const app = release('v1', [
      'App-1.0.dmg', 'App-1.0-mac.zip', 'App-1.0.AppImage', 'app_1.0_amd64.deb',
      'App-Setup-1.0.exe', 'App-1.0-win.zip', 'App-1.0.dmg.blockmap', 'latest.yml',
    ]);
    expect(pickAsset([app], macIntel)?.name).toBe('App-1.0.dmg');
    expect(pickAsset([app], linux)?.name).toBe('App-1.0.AppImage');
    expect(pickAsset([app], win)?.name).toBe('App-Setup-1.0.exe');
  });

  test('prefers an exact arch over an unlabelled one', () => {
    const app = release('v1', ['app-linux.AppImage', 'app-linux-arm64.AppImage']);
    expect(pickAsset([app], linuxArm)?.name).toBe('app-linux-arm64.AppImage');
    expect(pickAsset([app], linux)?.name).toBe('app-linux.AppImage');
  });

  test('never picks a build for another architecture', () => {
    const app = release('v1', ['app-linux-arm64.tar.gz']);
    expect(pickAsset([app], linux)).toBeNull();
  });

  test('lets Apple Silicon fall back to an Intel build', () => {
    const app = release('v1', ['app-darwin-x86_64.tar.gz']);
    expect(pickAsset([app], macArm)?.name).toBe('app-darwin-x86_64.tar.gz');
  });

  test('takes the newest release that has a match', () => {
    const newest = release('v2', ['app-windows.exe']);
    const older = release('v1', ['app-linux.AppImage']);
    expect(pickAsset([newest, older], linux)?.tag).toBe('v1');
    expect(pickAsset([release('v3', ['a.AppImage']), older], linux)?.tag).toBe('v3');
  });

  test('skips drafts, and pre-releases while a stable one matches', () => {
    const draft = release('v4', ['a.AppImage'], { draft: true });
    const pre = release('v3-rc', ['a.AppImage'], { prerelease: true });
    const stable = release('v2', ['a.AppImage']);
    expect(pickAsset([draft, pre, stable], linux)?.tag).toBe('v2');
    expect(pickAsset([draft, pre], linux)?.tag).toBe('v3-rc');
  });

  test('returns null when nothing fits', () => {
    expect(pickAsset([], linux)).toBeNull();
    expect(pickAsset([release('v1', ['source.tar.gz', 'SHA256SUMS'])], linux)).toBeNull();
  });
});

describe('normalizeRepoSlug', () => {
  test.each([
    ['junegunn/fzf', 'junegunn/fzf'],
    ['https://github.com/junegunn/fzf', 'junegunn/fzf'],
    ['https://github.com/junegunn/fzf/releases/latest', 'junegunn/fzf'],
    ['github.com/junegunn/fzf.git', 'junegunn/fzf'],
    ['git@github.com:junegunn/fzf.git', 'junegunn/fzf'],
  ])('%s → %s', (input, slug) => {
    expect(normalizeRepoSlug(input)).toBe(slug);
  });

  test.each(['', 'fzf', '../etc/passwd', 'a/..', 'https://evil.com/a/b', 'own er/repo', null])(
    'rejects %p',
    input => {
      expect(normalizeRepoSlug(input as any)).toBeNull();
    }
  );
});

describe('parseSchemeUrl', () => {
  test.each([
    ['git0://install/junegunn/fzf', 'junegunn/fzf'],
    ['git0://install?repo=junegunn%2Ffzf', 'junegunn/fzf'],
    ['git0://junegunn/fzf', 'junegunn/fzf'],
    ['git0:junegunn/fzf', 'junegunn/fzf'],
    ['git0://install/https%3A%2F%2Fgithub.com%2Fjunegunn%2Ffzf', 'junegunn/fzf'],
  ])('%s → %s', (link, slug) => {
    expect(parseSchemeUrl(link)).toBe(slug);
  });

  test('rejects other schemes and junk', () => {
    expect(parseSchemeUrl('https://github.com/junegunn/fzf')).toBeNull();
    expect(parseSchemeUrl('git0://install/')).toBeNull();
  });
});
