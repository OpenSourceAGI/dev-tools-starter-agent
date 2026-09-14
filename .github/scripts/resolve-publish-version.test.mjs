/**
 * Run with: node --test .github/scripts/
 *
 * The publish workflow runs these before it publishes anything, so a change to
 * the version rules that would deadlock the pipeline again fails the run
 * instead of burning a version number on every package.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolvePublishVersion } from './resolve-publish-version.mjs';

test('publishes the tree version when the package is new to the registry', () => {
  const { version } = resolvePublishVersion({ current: '0.1.0', versions: [], latestTag: null });
  assert.equal(version, '0.1.0');
});

test('bumps a patch past the tree version in the ordinary case', () => {
  const { version } = resolvePublishVersion({
    current: '1.2.3',
    versions: ['1.2.2', '1.2.3'],
    latestTag: '1.2.3',
  });
  assert.equal(version, '1.2.4');
});

// The regression this whole script exists for: master fell a patch behind the
// registry because the bump commit never landed, and every run afterwards
// re-published the version npm already had.
test('catches up when the registry is ahead of the working tree', () => {
  const { version } = resolvePublishVersion({
    current: '0.0.64',
    versions: ['0.0.63', '0.0.64', '0.0.65'],
    latestTag: '0.0.65',
  });
  assert.equal(version, '0.0.66');
});

test('catches up across a wide gap in one step', () => {
  const { version } = resolvePublishVersion({
    current: '0.0.60',
    versions: ['0.0.60', '0.0.65', '0.0.70'],
    latestTag: '0.0.70',
  });
  assert.equal(version, '0.0.71');
});

test('never returns a version that is already published', () => {
  const { version } = resolvePublishVersion({
    current: '2.0.0',
    versions: ['2.0.0', '2.0.1', '2.0.2', '2.0.3'],
    latestTag: '2.0.1',
  });
  assert.equal(version, '2.0.4');
});

// A maintainer who edits the version by hand means it: publish 0.3.0, not 0.3.1.
test('honours a hand-written bump that has not been published', () => {
  const { version, reason } = resolvePublishVersion({
    current: '0.3.0',
    versions: ['0.2.8', '0.2.9'],
    latestTag: '0.2.9',
  });
  assert.equal(version, '0.3.0');
  assert.match(reason, /already in package.json/);
});

test('does not honour a hand-written bump that is already published', () => {
  const { version } = resolvePublishVersion({
    current: '0.3.0',
    versions: ['0.2.9', '0.3.0'],
    latestTag: '0.3.0',
  });
  assert.equal(version, '0.3.1');
});

// api2ai: an abandoned 1.0.x line sits above the 0.2.x line still shipping, so
// the highest version on the registry is not the one `latest` points at. The
// resolver stays on the live line and leaves 1.0.6 where it is.
test('stays on the line the latest tag follows, ignoring a higher stale line', () => {
  const { version } = resolvePublishVersion({
    current: '0.2.42',
    versions: ['0.2.28', '0.2.29', '1.0.5', '1.0.6'],
    latestTag: '0.2.29',
  });
  assert.equal(version, '0.2.42');
});

test('keeps bumping the live line on later runs', () => {
  const { version } = resolvePublishVersion({
    current: '0.2.42',
    versions: ['0.2.29', '0.2.42', '1.0.6'],
    latestTag: '0.2.42',
  });
  assert.equal(version, '0.2.43');
});

// The invariant the workflow's explicit `--tag latest` leans on.
test('always resolves above the current latest tag', () => {
  const cases = [
    { current: '0.0.64', versions: ['0.0.64', '0.0.65'], latestTag: '0.0.65' },
    { current: '1.2.3', versions: ['1.2.3'], latestTag: '1.2.3' },
    { current: '0.2.42', versions: ['0.2.29', '1.0.6'], latestTag: '0.2.29' },
    { current: '0.3.0', versions: ['0.2.9'], latestTag: '0.2.9' },
  ];

  for (const input of cases) {
    const { version } = resolvePublishVersion(input);
    assert.ok(
      version.localeCompare(input.latestTag) !== 0,
      `${version} must differ from ${input.latestTag}`,
    );
    assert.ok(!input.versions.includes(version), `${version} must not already be published`);
  }
});

test('rejects a version package.json cannot mean', () => {
  assert.throws(
    () => resolvePublishVersion({ current: 'v1.2', versions: ['1.0.0'], latestTag: '1.0.0' }),
    /valid semver/,
  );
});
