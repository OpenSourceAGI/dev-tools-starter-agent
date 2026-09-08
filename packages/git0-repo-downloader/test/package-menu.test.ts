import { describe, test, expect } from 'vitest';
import { buildReleaseChoices } from '../src/package-menu.ts';
import type { CategorizedRelease, PlatformInfo } from '../src/types.ts';

const LINUX: PlatformInfo = { os: 'linux', arch: 'x86_64', platform: 'linux', architecture: 'x64' };
const MACOS: PlatformInfo = { os: 'macos', arch: 'arm64', platform: 'darwin', architecture: 'arm64' };

function makeRelease(tag: string, overrides: Partial<CategorizedRelease['platformAssets']> = {}): CategorizedRelease {
  const base = { windows: [], macos: [], linux: [], universal: [] };
  return {
    tag_name: tag,
    assets: [],
    platformAssets: { ...base, ...overrides },
  };
}

function makeAsset(name: string): any {
  return {
    name,
    size: 10 * 1024 * 1024,
    browser_download_url: `https://example.com/${name}`,
    detectedArch: 'x86_64',
    platform: 'linux',
  };
}

describe('buildReleaseChoices', () => {
  test('returns empty array when releases have no assets', () => {
    const release = makeRelease('v1');
    expect(buildReleaseChoices([release], LINUX)).toHaveLength(0);
  });

  test('includes a disabled header for each non-empty platform section', () => {
    const release = makeRelease('v1', { linux: [makeAsset('app-linux-x64.tar.gz')] });
    const choices = buildReleaseChoices([release], LINUX);
    const headers = choices.filter(c => c.disabled === true && c.name?.includes('v1'));
    expect(headers.length).toBeGreaterThan(0);
  });

  test('includes a selectable choice for each asset', () => {
    const release = makeRelease('v1', {
      linux: [makeAsset('app-linux-x64.tar.gz'), makeAsset('app-linux-arm64.tar.gz')],
    });
    const choices = buildReleaseChoices([release], LINUX);
    const selectable = choices.filter(c => c.value);
    expect(selectable).toHaveLength(2);
  });

  test('selectable choice value contains release and asset', () => {
    const a = makeAsset('app-linux-x64.tar.gz');
    const release = makeRelease('v1', { linux: [a] });
    const choices = buildReleaseChoices([release], LINUX);
    const choice = choices.find(c => c.value);
    expect(choice?.value?.asset?.name).toBe('app-linux-x64.tar.gz');
    expect(choice?.value?.release?.tag_name).toBe('v1');
  });

  test('renders asset size in MB', () => {
    const a = makeAsset('app.tar.gz');
    const release = makeRelease('v1', { linux: [a] });
    const choices = buildReleaseChoices([release], LINUX);
    const assetChoice = choices.find(c => c.value);
    // 10 MB asset
    expect(assetChoice?.name).toContain('10.00 MB');
  });

  test('inserts separators between platform sections', () => {
    const release = makeRelease('v1', {
      linux: [makeAsset('app-linux.tar.gz')],
      macos: [makeAsset('app.dmg')],
    });
    const choices = buildReleaseChoices([release], LINUX);
    const separators = choices.filter(c => c.disabled && c.name?.includes('────'));
    expect(separators.length).toBeGreaterThan(0);
  });

  test('respects the limit parameter (default 2)', () => {
    const releases = [
      makeRelease('v3', { linux: [makeAsset('a.tar.gz')] }),
      makeRelease('v2', { linux: [makeAsset('b.tar.gz')] }),
      makeRelease('v1', { linux: [makeAsset('c.tar.gz')] }),
    ];
    // default limit=2 → only v3 and v2 appear
    const choices = buildReleaseChoices(releases, LINUX);
    const names = choices.map(c => c.name ?? '').join(' ');
    expect(names).toContain('v3');
    expect(names).toContain('v2');
    expect(names).not.toContain('v1');
  });

  test('custom limit=1 shows only the first release', () => {
    const releases = [
      makeRelease('v2', { linux: [makeAsset('b.tar.gz')] }),
      makeRelease('v1', { linux: [makeAsset('a.tar.gz')] }),
    ];
    const choices = buildReleaseChoices(releases, LINUX, 1);
    const names = choices.map(c => c.name ?? '').join(' ');
    expect(names).toContain('v2');
    expect(names).not.toContain('v1');
  });

  test('universal section appears for all platforms', () => {
    const universalAsset = { ...makeAsset('app-universal'), detectedArch: 'universal', platform: 'universal' };
    const release = makeRelease('v1', { universal: [universalAsset] });

    const linuxChoices = buildReleaseChoices([release], LINUX);
    const macChoices   = buildReleaseChoices([release], MACOS);

    expect(linuxChoices.filter(c => c.value)).toHaveLength(1);
    expect(macChoices.filter(c => c.value)).toHaveLength(1);
  });

  test('platform order is windows → macos → linux → universal', () => {
    const release = makeRelease('v1', {
      windows:   [makeAsset('app.exe')],
      macos:     [makeAsset('app.dmg')],
      linux:     [makeAsset('app.tar.gz')],
      universal: [{ ...makeAsset('app'), detectedArch: 'universal', platform: 'universal' }],
    });
    const choices = buildReleaseChoices([release], LINUX);
    const headerNames = choices
      .filter(c => c.disabled && !c.name?.includes('────'))
      .map(c => c.name ?? '');

    const winIdx  = headerNames.findIndex(n => n.includes('Windows'));
    const macIdx  = headerNames.findIndex(n => n.includes('macOS'));
    const linIdx  = headerNames.findIndex(n => n.includes('Linux'));
    const uniIdx  = headerNames.findIndex(n => n.includes('Universal'));

    expect(winIdx).toBeLessThan(macIdx);
    expect(macIdx).toBeLessThan(linIdx);
    expect(linIdx).toBeLessThan(uniIdx);
  });
});
