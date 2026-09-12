#!/usr/bin/env node
/**
 * Undo `pin-workspace-deps.mjs` across the workspace, keeping only the version
 * bumps that the publish step made.
 *
 * After a publish run, each published package's package.json holds two kinds of
 * edit: a `version` bump, which must be committed so the next run does not
 * re-derive it, and the `workspace:*` -> `^x.y.z` pinning, which must not —
 * committing that would freeze siblings at whatever version they happened to
 * have and break local development.
 *
 * Restoring each file from `git show HEAD:` and patching only the version
 * string back in keeps the committed diff to one line per bumped package, and
 * keeps each file's original formatting.
 *
 * Usage: node .github/scripts/restore-pinned-deps.mjs [packagesRoot...]
 *   Defaults to `packages`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/**
 * Put `version` back into the *original* file text, leaving everything else as
 * it was committed.
 *
 * A string replace rather than parse/serialize: reserializing would reformat
 * files that use different indentation or key order, turning a one-line version
 * bump into a whole-file diff.
 *
 * @param {string} original the committed file text
 * @param {string} fromVersion version in the committed text
 * @param {string} toVersion version to restore
 * @returns {string}
 */
export function patchVersion(original, fromVersion, toVersion) {
  if (fromVersion === toVersion) return original;

  const needle = `"version": "${fromVersion}"`;
  if (original.includes(needle)) {
    return original.replace(needle, `"version": "${toVersion}"`);
  }

  // Different spacing around the colon (e.g. 4-space or minified manifests).
  return original.replace(
    new RegExp(`("version"\\s*:\\s*)"${fromVersion.replace(/\./g, '\\.')}"`),
    `$1"${toVersion}"`,
  );
}

/**
 * @param {string[]} roots directories containing package directories
 * @param {(file: string) => string} [showHead] injection point for tests
 * @returns {string[]} log lines
 */
export function restore(roots, showHead = defaultShowHead) {
  const messages = [];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const file = path.join(root, entry.name, 'package.json');
      if (!fs.existsSync(file)) continue;

      let committed;
      try {
        committed = showHead(file);
      } catch {
        // Untracked package: there is no committed text to restore it to, and
        // its whole manifest is new, so leave it exactly as it is.
        continue;
      }

      const current = JSON.parse(fs.readFileSync(file, 'utf8'));
      const original = JSON.parse(committed);

      if (original.version !== current.version) {
        messages.push(`Keeping version bump for ${current.name} -> ${current.version}`);
      }

      fs.writeFileSync(file, patchVersion(committed, original.version, current.version));
    }
  }

  return messages;
}

function defaultShowHead(file) {
  return execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const roots = process.argv.slice(2);
  for (const message of restore(roots.length > 0 ? roots : ['packages'])) {
    console.log(message);
  }
}
