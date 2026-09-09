#!/usr/bin/env node
/**
 * Warns when a package is about to publish a tarball that does not contain the
 * files its own package.json points at.
 *
 * api2ai is why this exists: its `main`, `module` and `types` all point into
 * `dist/`, its `files` field ships only `dist/`, and its build script builds
 * the Next.js app instead — so every one of its 29 releases is a tarball
 * holding a README and a package.json, and `import 'api2ai'` has never
 * resolved. Nothing in the pipeline noticed, because publishing succeeded.
 *
 * Usage:  node check-package-entrypoints.mjs <package-dir>
 *
 * Always exits 0: a missing entry point is a packaging bug to fix in the
 * package, not a reason to hold back everything else in the release.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Paths a consumer resolves through, in the order a reader would look for them. */
export function declaredEntryPoints(pkg) {
  const entries = [];

  // `main`, `module`, `types` and `bin` are always paths inside the package,
  // with or without a `./`. Only `exports` targets have to declare the `./`,
  // and only there can a value be something else entirely.
  const add = (field, value) => {
    if (typeof value === 'string') entries.push({ field, target: value, isPath: true });
  };

  add('main', pkg.main);
  add('module', pkg.module);
  add('types', pkg.types ?? pkg.typings);

  if (typeof pkg.bin === 'string') {
    add('bin', pkg.bin);
  } else if (pkg.bin && typeof pkg.bin === 'object') {
    for (const [name, target] of Object.entries(pkg.bin)) add(`bin[${name}]`, target);
  }

  const walkExports = (node, trail) => {
    if (typeof node === 'string') {
      entries.push({ field: `exports${trail}`, target: node, isPath: node.startsWith('./') });
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) walkExports(value, `${trail}["${key}"]`);
  };
  walkExports(pkg.exports, '');

  return entries;
}

/** npm stores tarball paths without a leading `./`; declarations usually have one. */
export function normalizeTarballPath(target) {
  return path.posix.normalize(String(target).replace(/^\.\//, ''));
}

export function findMissingEntryPoints(pkg, packedPaths) {
  const packed = new Set(packedPaths.map(normalizeTarballPath));

  // A wildcard target (`./dist/*.js`) stands for a set of files, not one, so
  // there is nothing to look up.
  return declaredEntryPoints(pkg).filter(
    ({ target, isPath }) => isPath && !target.includes('*') && !packed.has(normalizeTarballPath(target)),
  );
}

function packedPathsOf(dir) {
  const output = execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts', '--no-workspaces'],
    { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );

  const [result] = JSON.parse(output);
  return (result?.files ?? []).map((file) => file.path);
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    process.stderr.write('usage: check-package-entrypoints.mjs <package-dir>\n');
    process.exit(2);
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

  let missing;
  try {
    missing = findMissingEntryPoints(pkg, packedPathsOf(dir));
  } catch (error) {
    process.stderr.write(`::warning::could not inspect the ${pkg.name} tarball: ${error.message}\n`);
    return;
  }

  if (missing.length === 0) return;

  const detail = missing.map(({ field, target }) => `${field} → ${target}`).join(', ');
  process.stderr.write(
    `::warning::${pkg.name}@${pkg.version} is publishing a tarball that does not contain ` +
      `${missing.length === 1 ? 'the file it points at' : 'the files it points at'}: ${detail}. ` +
      `Consumers will fail to resolve ${missing.length === 1 ? 'it' : 'them'}. ` +
      `Check the package's "files" field and its build script.\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
