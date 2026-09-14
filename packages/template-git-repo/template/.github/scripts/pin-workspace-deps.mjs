#!/usr/bin/env node
/**
 * Rewrite `workspace:*` dependency ranges in the *current directory's*
 * package.json to real semver ranges, immediately before `npm publish` packs it.
 *
 * npm keeps the literal `workspace:*` protocol in the published tarball, and no
 * consumer outside this monorepo can resolve it — `npm install` of such a
 * package dies with EUNSUPPORTEDPROTOCOL. Every workspace has to substitute
 * real ranges at pack time; this is that substitution.
 *
 * A `workspace:*` dependency on a local package that is private (and so never
 * published) is dropped rather than pinned: pinning it would produce a tarball
 * that cannot install at all.
 *
 * The edit is deliberately left in the working tree — `restore-pinned-deps.mjs`
 * takes it back out after the publish, keeping only any version bump.
 *
 * Usage: node .github/scripts/pin-workspace-deps.mjs [packageDir] [workspaceRoot]
 *   Both default to what the publish loop needs: the current directory, and its
 *   parent as the directory holding sibling packages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/**
 * Map local package name -> { version, private } for every sibling.
 *
 * @param {string} siblingsRoot directory containing the package directories
 * @returns {Map<string, { version: string, private: boolean }>}
 */
export function readSiblings(siblingsRoot) {
  const siblings = new Map();
  if (!fs.existsSync(siblingsRoot)) return siblings;

  for (const entry of fs.readdirSync(siblingsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const manifestPath = path.join(siblingsRoot, entry.name, 'package.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (pkg.name && pkg.version) {
        siblings.set(pkg.name, { version: pkg.version, private: Boolean(pkg.private) });
      }
    } catch {
      // A sibling with an unreadable manifest simply cannot be pinned against.
    }
  }

  return siblings;
}

/**
 * Substitute every `workspace:` range in `pkg`, in place.
 *
 * @param {Record<string, any>} pkg parsed package.json, mutated
 * @param {Map<string, { version: string, private: boolean }>} siblings
 * @returns {string[]} human-readable log lines describing what changed
 */
export function pinWorkspaceDeps(pkg, siblings) {
  const changes = [];

  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;

    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== 'string' || !range.startsWith('workspace:')) continue;

      const sibling = siblings.get(name);

      if (!sibling || sibling.private) {
        delete deps[name];
        changes.push(`Removed unpublishable workspace dependency: ${name}`);
        continue;
      }

      // `workspace:1.2.3` and `workspace:^1.2.3` already carry the range the
      // author wants; only the `*`/`~`/`^` shorthands need the local version.
      const suffix = range.slice('workspace:'.length);
      deps[name] = /^[\d]/.test(suffix) || /^[~^][\d]/.test(suffix)
        ? suffix
        : `^${sibling.version}`;
      changes.push(`Pinned workspace dependency ${name} -> ${deps[name]}`);
    }
  }

  return changes;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const packageDir = process.argv[2] ?? '.';
  const siblingsRoot = process.argv[3] ?? path.join(packageDir, '..');

  const manifestPath = path.join(packageDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const changes = pinWorkspaceDeps(pkg, readSiblings(siblingsRoot));
  for (const change of changes) console.log(change);

  if (changes.length > 0) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}
