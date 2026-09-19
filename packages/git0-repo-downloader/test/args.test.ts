import { describe, test, expect, vi } from 'vitest';
import { parseArgs } from '../src/args.ts';

describe('parseArgs', () => {
  test('treats bare arguments as positional', () => {
    const { positional, flags } = parseArgs(['facebook/react', 'my-folder']);
    expect(positional).toEqual(['facebook/react', 'my-folder']);
    expect(flags.history).toBe(false);
  });

  test('keeps URLs intact, including deep ones', () => {
    const url = 'https://github.com/debate/debate-ai.com/blob/master/.continue/agents/x.yaml';
    expect(parseArgs([url]).positional).toEqual([url]);
  });

  test('reads --path and --branch values', () => {
    const { flags } = parseArgs(['facebook/react', '--path=packages/react-dom', '--branch=v18']);
    expect(flags.path).toBe('packages/react-dom');
    expect(flags.branch).toBe('v18');
  });

  test('accepts --ref as an alias for --branch', () => {
    expect(parseArgs(['a/b', '--ref=main']).flags.branch).toBe('main');
  });

  test('reads the history flags', () => {
    expect(parseArgs(['a/b', '--history']).flags.history).toBe(true);
    expect(parseArgs(['a/b', '--git']).flags.history).toBe(true);
    expect(parseArgs(['a/b', '--history-only']).flags.historyOnly).toBe(true);
    expect(parseArgs(['a/b', '--mirror']).flags.mirror).toBe(true);
  });

  test('keeps a path containing an equals sign in one piece', () => {
    expect(parseArgs(['a/b', '--path=dir/a=b']).flags.path).toBe('dir/a=b');
  });

  test('warns about an unknown flag instead of treating it as a query', () => {
    const warn = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { positional } = parseArgs(['a/b', '--nope']);
    expect(positional).toEqual(['a/b']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
