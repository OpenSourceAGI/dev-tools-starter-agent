import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  normalizeSubPath,
  subPathFilter,
  subPathDirName,
  hoistSubPath,
} from '../src/download.ts';

describe('normalizeSubPath', () => {
  test('returns empty string for nothing', () => {
    expect(normalizeSubPath(null)).toBe('');
    expect(normalizeSubPath(undefined)).toBe('');
    expect(normalizeSubPath('')).toBe('');
  });

  test('strips leading, trailing and doubled separators', () => {
    expect(normalizeSubPath('/packages//ui/')).toBe('packages/ui');
  });

  test('drops "." segments and normalizes backslashes', () => {
    expect(normalizeSubPath('./packages/./ui')).toBe('packages/ui');
    expect(normalizeSubPath('packages\\ui')).toBe('packages/ui');
  });

  test('keeps dotfile directories, which are not "." segments', () => {
    expect(normalizeSubPath('.continue/agents')).toBe('.continue/agents');
  });

  test('rejects traversal rather than normalizing it away', () => {
    expect(() => normalizeSubPath('../../etc')).toThrow(/\.\./);
    expect(() => normalizeSubPath('packages/../../etc')).toThrow(/\.\./);
  });
});

describe('subPathFilter', () => {
  test('keeps every entry when there is no sub-path', () => {
    const keep = subPathFilter('');
    expect(keep('react-abc123/package.json')).toBe(true);
    expect(keep('react-abc123/src/index.ts')).toBe(true);
  });

  test('keeps the sub-path itself and everything under it', () => {
    const keep = subPathFilter('packages/ui');
    expect(keep('react-abc123/packages/ui')).toBe(true);
    expect(keep('react-abc123/packages/ui/')).toBe(true);
    expect(keep('react-abc123/packages/ui/src/index.ts')).toBe(true);
  });

  test('drops everything outside it', () => {
    const keep = subPathFilter('packages/ui');
    expect(keep('react-abc123/package.json')).toBe(false);
    expect(keep('react-abc123/packages/core/index.ts')).toBe(false);
  });

  test('matches whole segments, not string prefixes', () => {
    const keep = subPathFilter('src/lib');
    expect(keep('repo-abc123/src/library.ts')).toBe(false);
    expect(keep('repo-abc123/src/lib/index.ts')).toBe(true);
  });

  test('matches a single file', () => {
    const keep = subPathFilter('.continue/agents/new-config.yaml');
    expect(keep('debate-ai.com-abc123/.continue/agents/new-config.yaml')).toBe(true);
    expect(keep('debate-ai.com-abc123/.continue/agents/other.yaml')).toBe(false);
  });
});

describe('subPathDirName', () => {
  test('falls back to the repo name when there is no sub-path', () => {
    expect(subPathDirName('')).toBeUndefined();
  });

  test('uses the last segment of a folder path', () => {
    expect(subPathDirName('packages/ui', 'tree')).toBe('ui');
    expect(subPathDirName('.continue/agents', 'tree')).toBe('agents');
  });

  test('uses the enclosing folder for a file path', () => {
    expect(subPathDirName('.continue/agents/new-config.yaml', 'blob')).toBe('agents');
  });

  test('falls back to the repo name for a file at the repo root', () => {
    expect(subPathDirName('readme.md', 'blob')).toBeUndefined();
  });

  test('treats an untyped shorthand path as a folder', () => {
    expect(subPathDirName('packages/react-dom')).toBe('react-dom');
  });
});

describe('hoistSubPath', () => {
  let tmp: string;
  let extractPath: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-hoist-test-'));
    extractPath = path.join(tmp, 'target');
    fs.mkdirSync(extractPath);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('is a no-op without a sub-path', () => {
    fs.writeFileSync(path.join(extractPath, 'a.txt'), 'a');
    hoistSubPath(extractPath, '');
    expect(fs.readdirSync(extractPath)).toEqual(['a.txt']);
  });

  test('lifts a nested folder to the extraction root', () => {
    fs.mkdirSync(path.join(extractPath, 'packages', 'ui', 'src'), { recursive: true });
    fs.writeFileSync(path.join(extractPath, 'packages', 'ui', 'package.json'), '{}');
    fs.writeFileSync(path.join(extractPath, 'packages', 'ui', 'src', 'index.ts'), 'export {}');

    hoistSubPath(extractPath, 'packages/ui');

    expect(fs.readdirSync(extractPath).sort()).toEqual(['package.json', 'src']);
    expect(fs.readFileSync(path.join(extractPath, 'src', 'index.ts'), 'utf8')).toBe('export {}');
  });

  test('removes the wrapper directories it hoisted out of', () => {
    fs.mkdirSync(path.join(extractPath, 'packages', 'ui'), { recursive: true });
    fs.writeFileSync(path.join(extractPath, 'packages', 'ui', 'a.txt'), 'a');

    hoistSubPath(extractPath, 'packages/ui');

    expect(fs.existsSync(path.join(extractPath, 'packages'))).toBe(false);
  });

  test('lifts a single file and keeps its own name', () => {
    fs.mkdirSync(path.join(extractPath, '.continue', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(extractPath, '.continue', 'agents', 'new-config.yaml'), 'name: x');

    hoistSubPath(extractPath, '.continue/agents/new-config.yaml');

    expect(fs.readdirSync(extractPath)).toEqual(['new-config.yaml']);
    expect(fs.readFileSync(path.join(extractPath, 'new-config.yaml'), 'utf8')).toBe('name: x');
  });

  test('handles a single-segment sub-path', () => {
    fs.mkdirSync(path.join(extractPath, 'src'));
    fs.writeFileSync(path.join(extractPath, 'src', 'index.ts'), 'x');

    hoistSubPath(extractPath, 'src');

    expect(fs.readdirSync(extractPath)).toEqual(['index.ts']);
  });

  test('only clears the wrapper it hoisted out of, not unrelated siblings', () => {
    // In the real flow the tar filter means nothing outside the sub-path is
    // ever written. Hoisting still scopes its cleanup to the sub-path's own
    // first segment, so it can never delete files it was not asked about.
    fs.mkdirSync(path.join(extractPath, 'packages', 'ui'), { recursive: true });
    fs.writeFileSync(path.join(extractPath, 'packages', 'ui', 'a.txt'), 'a');
    fs.writeFileSync(path.join(extractPath, 'README.md'), 'readme');

    hoistSubPath(extractPath, 'packages/ui');

    expect(fs.readdirSync(extractPath).sort()).toEqual(['README.md', 'a.txt']);
  });

  test('explains itself when the path is not in the repository', () => {
    expect(() => hoistSubPath(extractPath, 'packages/nope')).toThrow(/not found/);
  });

  test('leaves no staging directory behind', () => {
    fs.mkdirSync(path.join(extractPath, 'packages', 'ui'), { recursive: true });
    fs.writeFileSync(path.join(extractPath, 'packages', 'ui', 'a.txt'), 'a');

    hoistSubPath(extractPath, 'packages/ui');

    expect(fs.readdirSync(tmp)).toEqual(['target']);
  });
});
