#!/usr/bin/env node
/**
 * Emit the test matrix for `.github/workflows/tests.yml`.
 *
 * This was an inline `node --input-type=module -e '...'` in the workflow. Moved
 * out for two reasons: an inline heredoc cannot be unit tested, and the inline
 * version hardcoded `["packages", "apps"]` as the places to look. A repo whose
 * workspaces are `libs/*` got an empty matrix and no error — the failure mode
 * of the hand-maintained matrix this was meant to replace.
 *
 * The workspace globs from the root package.json are the source of truth now.
 *
 *   node .github/scripts/list-test-packages.mjs [rootDir]
 *
 * Writes `packages=<json>` and `any=<bool>` to $GITHUB_OUTPUT (or stdout when
 * that is unset, which is what the tests read).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

/** The script a package must define to be picked up, best first. */
const TEST_SCRIPTS = ["test:ci", "test:coverage", "test"];

/** Read and parse a JSON file, treating any failure as absent. */
function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Expand the root package.json `workspaces` field into directories.
 *
 * Only a trailing `/*` is expanded — anything cleverer would need a glob
 * dependency in a script that runs before `install`. Both the array and the
 * `{ packages: [] }` object forms are accepted, because npm and bun both do.
 *
 * Falls back to `packages` and `apps` so a repo with no workspaces field
 * behaves as it did before this script existed.
 *
 * @param {string} [root]
 * @returns {string[]} directories relative to the repo root
 */
export function workspaceDirectories(root = ".") {
  const manifest = readJson(join(root, "package.json"));
  const globs = Array.isArray(manifest?.workspaces)
    ? manifest.workspaces
    : (manifest?.workspaces?.packages ?? ["packages/*", "apps/*"]);

  const directories = [];

  for (const glob of globs) {
    if (!glob.endsWith("/*")) {
      if (existsSync(join(root, glob))) directories.push(glob);
      continue;
    }

    const parent = glob.slice(0, -2);
    if (!existsSync(join(root, parent))) continue;

    for (const entry of readdirSync(join(root, parent), { withFileTypes: true })) {
      if (entry.isDirectory()) directories.push(`${parent}/${entry.name}`);
    }
  }

  return directories.sort();
}

/**
 * Every workspace package that declares a test script.
 *
 * @param {string} [root]
 * @returns {{ name: string, dir: string, flag: string, script: string }[]}
 */
export function testPackages(root = ".") {
  const found = [];

  for (const dir of workspaceDirectories(root)) {
    const pkg = readJson(join(root, dir, "package.json"));
    if (!pkg) continue;

    const script = TEST_SCRIPTS.find((candidate) => pkg.scripts?.[candidate]);
    if (!script) continue;

    found.push({
      name: pkg.name ?? basename(dir),
      dir,
      // The Codecov flag is the directory name, which is what someone reading
      // the Codecov dashboard is looking for.
      flag: basename(dir),
      script,
    });
  }

  return found;
}

/**
 * @param {ReturnType<typeof testPackages>} packages
 * @returns {string} the $GITHUB_OUTPUT lines
 */
export function formatOutput(packages) {
  // `any` exists because GitHub fails a job whose matrix is empty, which would
  // make a repo with no suites look broken rather than untested.
  return `packages=${JSON.stringify(packages)}\nany=${packages.length > 0}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const packages = testPackages(process.argv[2]);

  console.log(
    packages.length > 0
      ? packages.map((p) => `${p.dir} (${p.script})`).join("\n")
      : "No workspace package defines a test script.",
  );

  const output = formatOutput(packages);
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, output);
  } else {
    process.stdout.write(output);
  }
}
