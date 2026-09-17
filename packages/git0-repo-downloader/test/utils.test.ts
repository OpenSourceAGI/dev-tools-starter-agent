import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { printLogo, resetLogo } from '../src/utils.ts';

describe('printLogo', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetLogo();
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockRestore();
    resetLogo();
  });

  test('prints the logo', () => {
    printLogo();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain('__ _(_)');
  });

  test('prints it once however many times it is called', () => {
    // main() prints the banner, then so does the download path it hands off to.
    printLogo();
    printLogo();
    printLogo();
    expect(log).toHaveBeenCalledTimes(1);
  });

  test('resetLogo lets the next call print again', () => {
    printLogo();
    resetLogo();
    printLogo();
    expect(log).toHaveBeenCalledTimes(2);
  });
});
