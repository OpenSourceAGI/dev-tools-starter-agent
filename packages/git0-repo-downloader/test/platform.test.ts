import os from 'os';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getCurrentPlatform } from '../src/platform.ts';

// Spy on the `os` default export rather than mocking the whole module: it is
// the same object `src/platform.ts` imports, and the spies are restored after
// every test so nothing leaks into the other suites (download.test.ts calls
// os.tmpdir()).
function mockPlatform(platform: string, arch: string) {
  vi.spyOn(os, 'platform').mockReturnValue(platform as NodeJS.Platform);
  vi.spyOn(os, 'arch').mockReturnValue(arch);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getCurrentPlatform', () => {
  test('maps darwin/x64 → macos/x86_64', () => {
    mockPlatform('darwin', 'x64');
    const p = getCurrentPlatform();
    expect(p.os).toBe('macos');
    expect(p.arch).toBe('x86_64');
    expect(p.platform).toBe('darwin');
    expect(p.architecture).toBe('x64');
  });

  test('maps win32/ia32 → windows/i386', () => {
    mockPlatform('win32', 'ia32');
    const p = getCurrentPlatform();
    expect(p.os).toBe('windows');
    expect(p.arch).toBe('i386');
  });

  test('maps linux/arm64 → linux/arm64', () => {
    mockPlatform('linux', 'arm64');
    const p = getCurrentPlatform();
    expect(p.os).toBe('linux');
    expect(p.arch).toBe('arm64');
  });

  test('maps darwin/arm64 → macos/arm64 (Apple Silicon)', () => {
    mockPlatform('darwin', 'arm64');
    const p = getCurrentPlatform();
    expect(p.os).toBe('macos');
    expect(p.arch).toBe('arm64');
  });

  test('passes through unknown platform/arch as-is', () => {
    mockPlatform('freebsd', 'mips');
    const p = getCurrentPlatform();
    expect(p.os).toBe('freebsd');
    expect(p.arch).toBe('mips');
  });

  test('returns raw platform and architecture fields alongside mapped ones', () => {
    mockPlatform('linux', 'x64');
    const p = getCurrentPlatform();
    expect(p.platform).toBe('linux');
    expect(p.architecture).toBe('x64');
  });
});
