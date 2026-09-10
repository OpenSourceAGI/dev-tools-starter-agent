#!/usr/bin/env node
/**
 * Rewrite `workspace:*` ranges in the current directory's package.json to real
 * semver ranges, immediately before `npm publish` packs it.
 *
 * npm keeps the literal `workspace:*` protocol in the published tarball, and no
 * consumer outside the monorepo can resolve it — installing such a package dies
 * with EUNSUPPORTEDPROTOCOL. Every workspace has to substitute real ranges at
 * pack time; this is that substitution, moved out of the inline `node -e` it
 * used to be so it can be tested.
 *
 * A dependency on a local package that is private (and so never published) is
 * dropped rather than pinned: pinning it produces a tarball that cannot install
 * at all.
 *
 * The edit is left in the working tree on purpose — `restore-pinned-deps.mjs`
 * takes it back out after the publish, keeping only any version bump.
 *
 *   node .github/scripts/pin-workspace-deps.mjs [packageDir] [siblingsRoot...]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

/**
 * Map local package name -> { version, private } across the given roots.
 *
 * @param {string[]} roots
 * @returns {Map<string, { version: string, private: boolean }>}
 */
export function readSiblings(roots) {
  const siblings = new Map();

  for (const root of roots) {
    if (!existsSync(root)) continue;

    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const manifest = join(root, entry.name, "package.json");
      if (!existsSync(manifest)) continue;

      try {
        const pkg = JSON.parse(readFileSync(manifest, "utf8"));
        if (pkg.name && pkg.version) {
          siblings.set(pkg.name, { version: pkg.version, private: Boolean(pkg.private) });
        }
      } catch {
        // A sibling with an unreadable manifest cannot be pinned against.
      }
    }
  }

  return siblings;
}

/**
 * Substitute every `workspace:` range in `pkg`, in place.
 *
 * @param {Record<string, any>} pkg parsed package.json, mutated
 * @param {Map<string, { version: string, private: boolean }>} siblings
 * @returns {string[]} log lines describing what changed
 */
export function pinWorkspaceDeps(pkg, siblings) {
  const changes = [];

  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;

    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== "string" || !range.startsWith("workspace:")) continue;

      const sibling = siblings.get(name);

      if (!sibling || sibling.private) {
        delete deps[name];
        changes.push(`Removed unpublishable workspace dependency: ${name}`);
        continue;
      }

      // `workspace:1.2.3` and `workspace:^1.2.3` already carry the range the
      // author chose; only the `*`, `~` and `^` shorthands need the local
      // version substituted in.
      const suffix = range.slice("workspace:".length);
      deps[name] = /^[~^]?\d/.test(suffix) ? suffix : `^${sibling.version}`;
      changes.push(`Pinned workspace dependency ${name} -> ${deps[name]}`);
    }
  }

  return changes;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [packageDir = ".", ...rootArgs] = process.argv.slice(2);
  // Default roots are the publish workflow's: siblings live one level up from
  // the package being published.
  const roots = rootArgs.length > 0 ? rootArgs : [join(packageDir, "..")];

  const manifestPath = join(packageDir, "package.json");
  const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));

  const changes = pinWorkspaceDeps(pkg, readSiblings(roots));
  for (const change of changes) console.log(change);

  if (changes.length > 0) writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);
}
