import { describe, test, expect, mock, afterAll } from 'bun:test';
import os from 'os';

// `mock.module` is process-global and is never rolled back on its own, so a
// bare `{ platform, arch }` stub here would follow us into every test file
// that bun happens to run afterwards (download.test.ts calls os.tmpdir()).
// Keep the real module underneath the two functions we override, and put the
// untouched module back once this file is done.
const realOs = os;

function mockPlatform(platform: string, arch: string) {
  mock.module('os', () => ({ ...realOs, default: { ...realOs, platform: () => platform, arch: () => arch } }));
}

afterAll(() => {
  mock.module('os', () => ({ ...realOs, default: realOs }));
});

describe('getCurrentPlatform', () => {
  test('maps darwin/x64 → macos/x86_64', async () => {
    mockPlatform('darwin', 'x64');
    const fn = await load();
    const p = fn();
    expect(p.os).toBe('macos');
    expect(p.arch).toBe('x86_64');
    expect(p.platform).toBe('darwin');
    expect(p.architecture).toBe('x64');
  });

  test('maps win32/ia32 → windows/i386', async () => {
    mockPlatform('win32', 'ia32');
    const fn = await load();
    const p = fn();
    expect(p.os).toBe('windows');
    expect(p.arch).toBe('i386');
  });

  test('maps linux/arm64 → linux/arm64', async () => {
    mockPlatform('linux', 'arm64');
    const fn = await load();
    const p = fn();
    expect(p.os).toBe('linux');
    expect(p.arch).toBe('arm64');
  });

  test('maps darwin/arm64 → macos/arm64 (Apple Silicon)', async () => {
    mockPlatform('darwin', 'arm64');
    const fn = await load();
    const p = fn();
    expect(p.os).toBe('macos');
    expect(p.arch).toBe('arm64');
  });

  test('passes through unknown platform/arch as-is', async () => {
    mockPlatform('freebsd', 'mips');
    const fn = await load();
    const p = fn();
    expect(p.os).toBe('freebsd');
    expect(p.arch).toBe('mips');
  });

  test('returns raw platform and architecture fields alongside mapped ones', async () => {
    mockPlatform('linux', 'x64');
    const fn = await load();
    const p = fn();
    expect(p.platform).toBe('linux');
    expect(p.architecture).toBe('x64');
  });
});
