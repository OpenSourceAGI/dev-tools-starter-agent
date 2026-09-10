#!/usr/bin/env node
/**
 * Undo `pin-workspace-deps.mjs` across the workspace, keeping only the version
 * bumps the publish step made.
 *
 * After a publish run each published package.json holds two kinds of edit: a
 * `version` bump, which must be committed so the next run does not re-derive
 * it, and the `workspace:*` -> `^x.y.z` pinning, which must not — committing
 * that would freeze siblings at whatever version they happened to have and
 * break local development.
 *
 * Restoring each file from `git show HEAD:` and patching only the version back
 * in keeps the committed diff to one line per bumped package, and keeps each
 * file's original formatting.
 *
 * This replaces an inline `node -e` that matched the literal string
 * `"version": "<old>"`. A package.json without the space after the colon — or
 * with tab indentation — silently kept its pinned dependencies and lost its
 * bump, while logging that it had kept it. The rewrite is now verified: a patch
 * that matches nothing is an error, not a silent no-op.
 *
 *   node .github/scripts/restore-pinned-deps.mjs [packagesRoot...]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Put `toVersion` back into the committed file text, leaving all else as it was
 * committed.
 *
 * A targeted replace rather than parse-and-reserialize: reserializing would
 * reformat files that use different indentation or key order, turning a
 * one-line version bump into a whole-file diff.
 *
 * @param {string} original the committed file text
 * @param {string} fromVersion version in the committed text
 * @param {string} toVersion version to restore
 * @returns {string}
 * @throws if the version field could not be found
 */
export function patchVersion(original, fromVersion, toVersion) {
  if (fromVersion === toVersion) return original;

  const pattern = new RegExp(`("version"\\s*:\\s*)"${fromVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  const patched = original.replace(pattern, `$1"${toVersion}"`);

  if (patched === original) {
    throw new Error(`could not find "version": "${fromVersion}" to replace with "${toVersion}"`);
  }

  return patched;
}

/**
 * One package whose version field cannot be rewritten must not abort the loop
 * and leave every later package still carrying its pinned dependencies, so a
 * failure is collected and reported rather than thrown.
 *
 * @param {string[]} roots
 * @param {(file: string) => string} [showHead] injection point for tests
 * @returns {{ messages: string[], failures: string[] }}
 */
export function restore(roots, showHead = defaultShowHead) {
  const messages = [];
  const failures = [];

  for (const root of roots) {
    if (!existsSync(root)) continue;

    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const file = join(root, entry.name, "package.json");
      if (!existsSync(file)) continue;

      let committed;
      try {
        committed = showHead(file);
      } catch {
        // An untracked package has no committed text to restore to, and its
        // whole manifest is new — leave it exactly as it is.
        continue;
      }

      const current = JSON.parse(readFileSync(file, "utf8"));
      const original = JSON.parse(committed);

      let restored;
      try {
        restored = patchVersion(committed, original.version, current.version);
      } catch {
        // The package was published under the new version; if the repo keeps
        // the old one, the next run republishes the same content forever.
        failures.push(
          `::error title=Version bump lost::Could not rewrite the version field in ${file}. ` +
            `${current.name} was published as ${current.version} but the repo still says ${original.version}.`,
        );
        continue;
      }

      if (original.version !== current.version) {
        messages.push(`Keeping version bump for ${current.name} -> ${current.version}`);
      }

      writeFileSync(file, restored);
    }
  }

  return { messages, failures };
}

function defaultShowHead(file) {
  return execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const roots = process.argv.slice(2);
  const { messages, failures } = restore(roots.length > 0 ? roots : ["packages", "apps"]);

  for (const message of messages) console.log(message);
  for (const failure of failures) console.log(failure);

  if (failures.length > 0) process.exitCode = 1;
}
