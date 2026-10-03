import { describe, test, expect, beforeEach, afterEach } from 'vitest';

/**
 * Only the offline branch of the CLI entry is exercised here: with no
 * arguments it prints usage and exits 1 before touching the network. The
 * download and search branches talk to GitHub and are covered through
 * downloadRepo / GithubAPI instead.
 */
describe('cli entry', () => {
  let lines: string[];
  let exits: Array<number | undefined>;
  let origLog: typeof console.log;
  let origErr: typeof console.error;
  let origExit: typeof process.exit;
  let origArgv: string[];

  beforeEach(() => {
    lines = [];
    exits = [];
    origLog = console.log;
    origErr = console.error;
    origExit = process.exit;
    origArgv = process.argv;
    console.log = (...a: unknown[]) => void lines.push(a.join(' '));
    console.error = (...a: unknown[]) => void lines.push(a.join(' '));
    (process as any).exit = (code?: number) => {
      exits.push(code);
      // First exit halts main(); the .catch handler's own exit must not throw.
      if (exits.length === 1) throw new Error('process.exit');
    };
  });

  afterEach(() => {
    console.log = origLog;
    console.error = origErr;
    process.exit = origExit;
    process.argv = origArgv;
  });

  test('prints usage and exits 1 when given no arguments', async () => {
    process.argv = ['bun', 'cli.ts'];
    await import('../src/cli.ts?no-args');
    await new Promise((r) => setTimeout(r, 20));

    const text = lines.join('\n');
    expect(text).toContain('Usage: git0 <github-url | owner/repo[/path] | search-query>');
    expect(text).toContain('--history-only');
    expect(text).toContain('--mirror');
    expect(exits[0]).toBe(1);
  });
});
