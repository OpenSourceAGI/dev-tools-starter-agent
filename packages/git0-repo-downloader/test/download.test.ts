import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAvailableDirectoryName } from '../src/download.ts';

describe('getAvailableDirectoryName', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('returns basePath unchanged when it does not exist', () => {
    const target = path.join(tmp, 'newdir');
    expect(getAvailableDirectoryName(target)).toBe(target);
  });

  test('appends -2 when basePath already exists', () => {
    const target = path.join(tmp, 'repo');
    fs.mkdirSync(target);
    expect(getAvailableDirectoryName(target)).toBe(`${target}-2`);
  });

  test('increments counter until a free slot is found', () => {
    const target = path.join(tmp, 'repo');
    fs.mkdirSync(target);
    fs.mkdirSync(`${target}-2`);
    fs.mkdirSync(`${target}-3`);
    expect(getAvailableDirectoryName(target)).toBe(`${target}-4`);
  });

  test('returns basePath when only suffixed variants exist', () => {
    const target = path.join(tmp, 'repo');
    // Create repo-2 but NOT repo — basePath itself is free.
    fs.mkdirSync(`${target}-2`);
    expect(getAvailableDirectoryName(target)).toBe(target);
  });

  test('works with deeply nested non-existent paths', () => {
    const target = path.join(tmp, 'a', 'b', 'c');
    expect(getAvailableDirectoryName(target)).toBe(target);
  });
});
