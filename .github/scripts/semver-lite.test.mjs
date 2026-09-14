/** Run with: node --test .github/scripts/ */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compare, incPatch, isPrerelease, isValid, maxVersion, parse } from './semver-lite.mjs';

test('parses the shapes package.json versions take', () => {
  assert.deepEqual(parse('1.2.3'), { major: 1, minor: 2, patch: 3, prerelease: [] });
  assert.deepEqual(parse('0.0.0-rc.1'), { major: 0, minor: 0, patch: 0, prerelease: ['rc', '1'] });
  assert.equal(parse('1.2.3+build.5').prerelease.length, 0);
});

test('refuses what it cannot compare rather than guessing', () => {
  for (const bad of ['v1.2.3', '1.2', '1.2.3.4', 'latest', '', null, undefined]) {
    assert.equal(isValid(bad), false, `${bad} should be invalid`);
  }
});

test('orders by precedence, not by string', () => {
  assert.equal(compare('0.0.10', '0.0.9'), 1, 'numeric, not lexicographic');
  assert.equal(compare('1.0.6', '0.2.43'), 1);
  assert.equal(compare('1.2.3', '1.2.3'), 0);
  assert.equal(compare('0.2.9', '0.10.0'), -1);
});

test('ranks a prerelease below its release', () => {
  assert.equal(compare('1.0.0-rc.1', '1.0.0'), -1);
  assert.equal(compare('1.0.0-rc.1', '1.0.0-rc.2'), -1);
  assert.equal(compare('1.0.0-alpha', '1.0.0-alpha.1'), -1);
  assert.equal(compare('1.0.0-2', '1.0.0-beta'), -1, 'numeric ids rank below alphanumeric');
  assert.equal(isPrerelease('1.0.0-rc.1'), true);
  assert.equal(isPrerelease('1.0.0'), false);
});

test('increments the patch, and resolves a prerelease to its release', () => {
  assert.equal(incPatch('0.0.65'), '0.0.66');
  assert.equal(incPatch('1.2.9'), '1.2.10');
  assert.equal(incPatch('1.0.0-rc.1'), '1.0.0');
});

test('finds the highest version and skips ones it cannot read', () => {
  assert.equal(maxVersion(['0.2.29', '1.0.6', '0.2.43']), '1.0.6');
  assert.equal(maxVersion(['0.0.9', 'not-a-version', '0.0.10']), '0.0.10');
  assert.equal(maxVersion([]), null);
});
