#!/usr/bin/env node
/**
 * Picks the version a package should be published under, from the registry
 * rather than from the working tree.
 *
 * The workflow used to run `npm version patch` and publish whatever came out.
 * That only works while the repo's idea of each version stays in step with
 * npm's, and it does not: the version bumps are committed back to master in a
 * step that runs after publishing, so anything that stops that commit — a
 * failed run, a push race, a branch protection — leaves every package one
 * patch behind the registry forever. The next run then bumps into a version
 * that is already published, npm rejects it with
 *
 *   You cannot publish over the previously published versions: 0.0.65.
 *
 * every package fails, nothing is committed, and the deadlock repeats. Asking
 * the registry what exists closes that loop: the answer is correct on the
 * first run after a failure, with no repair commit needed.
 *
 * Usage:  node resolve-publish-version.mjs <package-dir>
 *
 * Prints the resolved version on stdout and nothing else, so the caller can
 * read it straight into a shell variable. Everything human-facing — including
 * GitHub Actions annotations — goes to stderr.
 */

import fs from 'node:fs';
import path from 'node:path';

import { gt, incPatch, isPrerelease, isValid, maxVersion } from './semver-lite.mjs';

const REGISTRY = process.env.NPM_CONFIG_REGISTRY ?? 'https://registry.npmjs.org';

/**
 * Resolves the version to publish, given what the registry currently holds.
 *
 * @param {object} input
 * @param {string} input.current      version in the package's package.json
 * @param {string[]} input.versions   every version already published
 * @param {string | null} input.latestTag  version the `latest` dist-tag points at
 * @returns {{version: string, reason: string}}
 */
export function resolvePublishVersion({ current, versions, latestTag }) {
  if (!isValid(current)) {
    throw new Error(`package.json version is not a valid semver version: ${current}`);
  }

  const published = new Set(versions);

  // Nothing published yet: the version in the tree is the first release.
  if (published.size === 0) {
    return { version: current, reason: 'first publish' };
  }

  // A version the tree has moved to deliberately — a hand-written minor or
  // major bump — is published as written. Patching over it would silently skip
  // the release the author asked for.
  if (!published.has(current) && (latestTag === null || gt(current, latestTag))) {
    return { version: current, reason: 'unpublished version already in package.json' };
  }

  // Otherwise take the next free patch, counting from whichever of the tree and
  // the `latest` tag is further ahead. Starting from `latest` rather than from
  // the tree is what lets a repo that has fallen behind catch up in one run.
  let candidate = latestTag !== null && gt(latestTag, current) ? latestTag : current;
  do {
    candidate = incPatch(candidate);
  } while (published.has(candidate));

  return { version: candidate, reason: 'next free patch' };
}

/** Reads name + version without requiring the file to be a module. */
function readPackageJson(dir) {
  const file = path.join(dir, 'package.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Abbreviated packument — a fraction of the size of the full document and all
 * this needs. A package that has never been published answers 404.
 */
async function fetchRegistryVersions(name) {
  const url = `${REGISTRY.replace(/\/+$/, '')}/${name.replace('/', '%2f')}`;
  const response = await fetch(url, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  });

  if (response.status === 404) return { versions: [], latestTag: null };

  if (!response.ok) {
    throw new Error(`Registry answered ${response.status} ${response.statusText} for ${name}`);
  }

  const packument = await response.json();

  return {
    versions: Object.keys(packument.versions ?? {}),
    latestTag: packument['dist-tags']?.latest ?? null,
  };
}

function annotate(level, message) {
  process.stderr.write(`::${level}::${message}\n`);
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    process.stderr.write('usage: resolve-publish-version.mjs <package-dir>\n');
    process.exit(2);
  }

  const pkg = readPackageJson(dir);
  const { versions, latestTag } = await fetchRegistryVersions(pkg.name);
  const { version, reason } = resolvePublishVersion({
    current: pkg.version,
    versions,
    latestTag,
  });

  process.stderr.write(
    `${pkg.name}: ${pkg.version} (tree) → ${version} — ${reason}` +
      ` [latest: ${latestTag ?? 'none'}, published: ${versions.length}]\n`,
  );

  // The workflow publishes with an explicit `--tag latest`, which switches off
  // npm's guard against pointing `latest` at something older than it already
  // is. Re-assert that guard here, where the guarantee actually comes from, so
  // a future change to the rules above cannot quietly walk the tag backwards.
  if (latestTag !== null && !gt(version, latestTag)) {
    throw new Error(
      `refusing to publish ${version}: it would move the "latest" tag back from ${latestTag}`,
    );
  }

  if (isPrerelease(version)) {
    throw new Error(`refusing to publish prerelease ${version} to the "latest" tag`);
  }

  // The reason the explicit tag is needed: some higher version exists that the
  // `latest` tag does not point at. api2ai is the standing example — an
  // abandoned 1.0.x line sits above the 0.2.x line still being released.
  const highest = maxVersion(versions);
  if (highest !== null && gt(highest, version)) {
    annotate(
      'notice',
      `${pkg.name}@${version} publishes below ${highest}, which is already on the registry. ` +
        `"latest" moves from ${latestTag} to ${version}; ${highest} keeps whatever tag it has.`,
    );
  }

  process.stdout.write(`${version}\n`);
}

// Only run when invoked directly, so the tests can import the resolver.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    annotate('error', error.message);
    process.exit(1);
  });
}
