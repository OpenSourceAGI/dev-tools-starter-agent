import { describe, test, expect } from 'vitest';
import { categorizeReleasesByPlatform, filterReleasesByPlatform } from '../src/releases.ts';
import type { PlatformInfo } from '../src/types.ts';

/** Minimal asset factory. size/url are arbitrary but required by the type. */
function asset(name: string) {
  return {
    name,
    size: 1024 * 1024,
    browser_download_url: `https://example.com/${name}`,
    detectedArch: '',
    platform: '',
  };
}

function release(tag: string, assets: ReturnType<typeof asset>[]) {
  return { tag_name: tag, assets, [Symbol.iterator]: undefined };
}

const LINUX: PlatformInfo = { os: 'linux', arch: 'x86_64', platform: 'linux', architecture: 'x64' };
const MACOS: PlatformInfo = { os: 'macos', arch: 'arm64', platform: 'darwin', architecture: 'arm64' };
const WINDOWS: PlatformInfo = { os: 'windows', arch: 'x86_64', platform: 'win32', architecture: 'x64' };

// ─── categorizeReleasesByPlatform ────────────────────────────────────────────

describe('categorizeReleasesByPlatform', () => {
  test('routes .exe asset to windows bucket', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app.exe')])]);
    expect(r.platformAssets.windows).toHaveLength(1);
    expect(r.platformAssets.windows[0].name).toBe('app.exe');
  });

  test('routes .dmg asset to macos bucket', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app.dmg')])]);
    expect(r.platformAssets.macos).toHaveLength(1);
  });

  test('routes linux-x64 tarball to linux bucket', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-linux-x64.tar.gz')])]);
    expect(r.platformAssets.linux).toHaveLength(1);
  });

  test('detects x86_64 arch from amd64 keyword', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-linux-amd64.tar.gz')])]);
    expect(r.platformAssets.linux[0].detectedArch).toBe('x86_64');
  });

  test('detects arm64 arch from aarch64 keyword', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-linux-aarch64.tar.gz')])]);
    expect(r.platformAssets.linux[0].detectedArch).toBe('arm64');
  });

  test('detects arm64 arch from arm64 keyword', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-darwin-arm64')]  )]);
    expect(r.platformAssets.macos[0].detectedArch).toBe('arm64');
  });

  test('routes asset with no known platform keyword to universal', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-v1.0')])]);
    expect(r.platformAssets.universal).toHaveLength(1);
    expect(r.platformAssets.universal[0].detectedArch).toBe('universal');
  });

  test('routes asset explicitly named "universal" to universal bucket', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-universal.tar.gz')])]);
    expect(r.platformAssets.universal).toHaveLength(1);
  });

  test('drops releases that have no assets at all', () => {
    const result = categorizeReleasesByPlatform([release('v1', [])]);
    expect(result).toHaveLength(0);
  });

  test('handles multiple releases independently', () => {
    const result = categorizeReleasesByPlatform([
      release('v1', [asset('app.exe')]),
      release('v2', [asset('app-linux-x64.tar.gz')]),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].tag_name).toBe('v1');
    expect(result[1].tag_name).toBe('v2');
  });

  test('annotates asset with its detected platform', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-windows-x64.exe')])]);
    expect(r.platformAssets.windows[0].platform).toBe('windows');
  });

  test('.msi routes to windows', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('setup.msi')])]);
    expect(r.platformAssets.windows).toHaveLength(1);
  });

  test('.deb routes to linux', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app_1.0_amd64.deb')])]);
    expect(r.platformAssets.linux).toHaveLength(1);
  });

  test('.rpm routes to linux', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-1.0.x86_64.rpm')])]);
    expect(r.platformAssets.linux).toHaveLength(1);
  });

  test('.AppImage routes to linux', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('App-1.0.AppImage')])]);
    expect(r.platformAssets.linux).toHaveLength(1);
  });

  test('.pkg routes to macos', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-1.0.pkg')])]);
    expect(r.platformAssets.macos).toHaveLength(1);
  });

  test('preserves all original asset fields', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-linux-x64.tar.gz')])]);
    expect(r.platformAssets.linux[0].browser_download_url).toContain('app-linux-x64');
    expect(r.platformAssets.linux[0].size).toBe(1024 * 1024);
  });

  test('unknown arch falls back to "unknown"', () => {
    const [r] = categorizeReleasesByPlatform([release('v1', [asset('app-linux.tar.gz')])]);
    expect(r.platformAssets.linux[0].detectedArch).toBe('unknown');
  });
});

// ─── filterReleasesByPlatform ─────────────────────────────────────────────────

describe('filterReleasesByPlatform', () => {
  test('returns only linux-compatible releases for linux platform', () => {
    const releases = [
      release('v1', [asset('app-linux-x64.tar.gz')]),
      release('v2', [asset('app-windows-x64.exe')]),
    ];
    const result = filterReleasesByPlatform(releases, LINUX);
    expect(result).toHaveLength(1);
    expect(result[0].tag_name).toBe('v1');
  });

  test('includes universal assets for any platform', () => {
    const releases = [release('v1', [asset('app-v1.0')])];
    expect(filterReleasesByPlatform(releases, LINUX)).toHaveLength(1);
    expect(filterReleasesByPlatform(releases, MACOS)).toHaveLength(1);
    expect(filterReleasesByPlatform(releases, WINDOWS)).toHaveLength(1);
  });

  test('returns empty array when no compatible release exists', () => {
    const releases = [release('v1', [asset('app.exe')])];
    expect(filterReleasesByPlatform(releases, LINUX)).toHaveLength(0);
  });

  test('returns release when it has both native and universal assets', () => {
    const releases = [release('v1', [asset('app-linux-x64.tar.gz'), asset('app-v1.0')])];
    expect(filterReleasesByPlatform(releases, LINUX)).toHaveLength(1);
  });

  test('filters macos releases correctly', () => {
    const releases = [
      release('v1', [asset('app.dmg')]),
      release('v2', [asset('app-linux.tar.gz')]),
    ];
    const result = filterReleasesByPlatform(releases, MACOS);
    expect(result).toHaveLength(1);
    expect(result[0].tag_name).toBe('v1');
  });

  test('returns empty array for empty releases input', () => {
    expect(filterReleasesByPlatform([], LINUX)).toHaveLength(0);
  });
});
