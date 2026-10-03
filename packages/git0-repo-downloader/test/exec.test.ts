import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { exec } from '../src/utils.ts';
import { installFakeShell, type FakeShell } from './helpers/fake-shell.ts';

describe('exec', () => {
  let fake: FakeShell;
  let errors: string[];
  let origError: typeof console.error;

  beforeEach(() => {
    errors = [];
    origError = console.error;
    console.error = (...a: unknown[]) => void errors.push(a.join(' '));
  });

  afterEach(() => {
    console.error = origError;
    fake?.restore();
  });

  test('runs the command through the shell', () => {
    fake = installFakeShell();
    exec('tool --flag value');
    expect(fake.commands).toEqual(['tool --flag value']);
  });

  test('swallows failures silently by default', () => {
    fake = installFakeShell({ failing: ['tool'] });
    expect(() => exec('tool')).not.toThrow();
    expect(errors).toEqual([]);
  });

  test('reports the failed command when showError is set', () => {
    fake = installFakeShell({ failing: ['tool'] });
    exec('tool', true);
    expect(errors.join('\n')).toContain('Failed: tool');
  });
});
