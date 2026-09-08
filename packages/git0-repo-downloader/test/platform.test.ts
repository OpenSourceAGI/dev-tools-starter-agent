import { describe, test, expect, afterEach, vi } from 'vitest';

/**
 * `getCurrentPlatform` reads `os.platform()`/`os.arch()` at call time, so each
 * case swaps in a stubbed `os` module and re-imports the module under test.
 * `vi.doMock` (rather than `vi.mock`) is used because it is not hoisted and can
 * therefore vary per test.
 */
async function loadWith(platform: string, arch: string) {
  vi.resetModules();
  vi.doMock('os', () => {
    const stub = { platform: () => platform, arch: () => arch };
    return { ...stub, default: stub };
  });
  const mod = await import('../src/platform.ts');
  return mod.getCurrentPlatform;
}

afterEach(() => {
  vi.doUnmock('os');
  vi.resetModules();
});

describe('getCurrentPlatform', () => {
  test('maps darwin/x64 → macos/x86_64', async () => {
    const p = (await loadWith('darwin', 'x64'))();
    expect(p.os).toBe('macos');
    expect(p.arch).toBe('x86_64');
    expect(p.platform).toBe('darwin');
    expect(p.architecture).toBe('x64');
  });

  test('maps win32/ia32 → windows/i386', async () => {
    const p = (await loadWith('win32', 'ia32'))();
    expect(p.os).toBe('windows');
    expect(p.arch).toBe('i386');
  });

  test('maps linux/arm64 → linux/arm64', async () => {
    const p = (await loadWith('linux', 'arm64'))();
    expect(p.os).toBe('linux');
    expect(p.arch).toBe('arm64');
  });

  test('maps darwin/arm64 → macos/arm64 (Apple Silicon)', async () => {
    const p = (await loadWith('darwin', 'arm64'))();
    expect(p.os).toBe('macos');
    expect(p.arch).toBe('arm64');
  });

  test('passes through unknown platform/arch as-is', async () => {
    const p = (await loadWith('freebsd', 'mips'))();
    expect(p.os).toBe('freebsd');
    expect(p.arch).toBe('mips');
  });

  test('returns raw platform and architecture fields alongside mapped ones', async () => {
    const p = (await loadWith('linux', 'x64'))();
    expect(p.platform).toBe('linux');
    expect(p.architecture).toBe('x64');
  });
});
