#!/usr/bin/env node
/**
 * Emit the GitHub Actions matrix for `.github/workflows/tests.yml`.
 *
 * A hand-written matrix fails silently: a package added to the repo but not to
 * the matrix is simply never tested, and nothing goes red to say so. This reads
 * the workspace globs out of the root package.json instead, so the matrix is
 * whatever the repo actually contains.
 *
 * Each entry gets:
 *   name          the package name, for `turbo --filter`
 *   dir           its directory, for `working-directory`
 *   flag          the Codecov flag — the directory basename, which is what a
 *                 human reading the Codecov dashboard expects to see
 *   script        `test:coverage` if it exists, else `test`
 *   allowFailure  from `"ci": { "allowFailure": true }` in its package.json
 *
 * Output is GitHub Actions `$GITHUB_OUTPUT` key=value lines:
 *   matrix={"include":[...]}
 *   empty=true|false
 *
 * `empty` exists because GitHub fails a job whose matrix has no entries, which
 * would make a repo with no test suites look broken rather than untested.
 *
 * Usage: node scripts/list-test-packages.mjs [rootDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Scripts that count as "this package has a suite", best first. */
const TEST_SCRIPTS = ['test:coverage', 'test:ci', 'test'];

/**
 * Expand the `workspaces` field into the directories it names.
 *
 * Only the one glob shape workspaces actually use in practice is supported —
 * a trailing `/*` — because anything cleverer would need a glob dependency in
 * a script that must run before `install`.
 *
 * @param {string} root repo root
 * @returns {string[]} directories relative to the repo root
 */
export function workspaceDirectories(root = '.') {
  const manifestPath = path.join(root, 'package.json');
  if (!fs.existsSync(manifestPath)) return [];

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return [];
  }

  // npm/bun accept both `workspaces: []` and `workspaces: { packages: [] }`.
  const globs = Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : (manifest.workspaces?.packages ?? []);

  const directories = [];

  for (const glob of globs) {
    if (!glob.endsWith('/*')) {
      if (fs.existsSync(path.join(root, glob))) directories.push(glob);
      continue;
    }

    const parent = glob.slice(0, -2);
    const parentPath = path.join(root, parent);
    if (!fs.existsSync(parentPath)) continue;

    for (const entry of fs.readdirSync(parentPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      directories.push(`${parent}/${entry.name}`);
    }
  }

  return directories.sort();
}

/**
 * @param {string} [root]
 * @returns {{ name: string, dir: string, flag: string, script: string, allowFailure: boolean }[]}
 */
export function testablePackages(root = '.') {
  const entries = [];

  for (const dir of workspaceDirectories(root)) {
    const manifestPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(manifestPath)) continue;

    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      console.error(`Skipping ${manifestPath}: not valid JSON`);
      continue;
    }
    if (!pkg.name) continue;

    const script = TEST_SCRIPTS.find((candidate) => pkg.scripts?.[candidate]);
    if (!script) continue;

    entries.push({
      name: pkg.name,
      dir,
      flag: path.basename(dir),
      script,
      allowFailure: Boolean(pkg.ci?.allowFailure),
    });
  }

  return entries;
}

/**
 * @param {{ name: string }[]} packages
 * @returns {string} the `$GITHUB_OUTPUT` lines, newline-terminated
 */
export function formatOutput(packages) {
  return [
    `matrix=${JSON.stringify({ include: packages })}`,
    `empty=${packages.length === 0}`,
    '',
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const packages = testablePackages(process.argv[2]);
  for (const entry of packages) {
    console.error(`✓ ${entry.name} (${entry.dir}) via ${entry.script}`);
  }
  if (packages.length === 0) {
    console.error('No workspace package declares a test script — the test matrix is empty.');
  }
  process.stdout.write(formatOutput(packages));
}
