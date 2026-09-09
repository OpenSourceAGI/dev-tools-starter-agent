/** Run with: node --test .github/scripts/*.test.mjs */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  declaredEntryPoints,
  findMissingEntryPoints,
  normalizeTarballPath,
} from './check-package-entrypoints.mjs';

test('collects every path a consumer resolves through', () => {
  const fields = declaredEntryPoints({
    main: 'dist/index.js',
    module: 'dist/index.mjs',
    types: 'dist/index.d.ts',
    bin: { cli: './bin/cli.js' },
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
  }).map((entry) => entry.field);

  assert.deepEqual(fields, [
    'main',
    'module',
    'types',
    'bin[cli]',
    'exports["."]["types"]',
    'exports["."]["import"]',
  ]);
});

test('falls back to typings when types is absent', () => {
  const [entry] = declaredEntryPoints({ typings: 'dist/index.d.ts' });
  assert.deepEqual(entry, { field: 'types', target: 'dist/index.d.ts', isPath: true });
});

test('reads a string bin as one entry', () => {
  const [entry] = declaredEntryPoints({ bin: './cli.js' });
  assert.equal(entry.field, 'bin');
});

test('compares paths the way npm writes them into the tarball', () => {
  assert.equal(normalizeTarballPath('./dist/index.js'), 'dist/index.js');
  assert.equal(normalizeTarballPath('dist/./index.js'), 'dist/index.js');
});

test('passes a package whose declared files are all packed', () => {
  const missing = findMissingEntryPoints(
    { main: 'dist/index.js', exports: { '.': { import: './dist/index.js' } } },
    ['package.json', 'README.md', 'dist/index.js'],
  );
  assert.deepEqual(missing, []);
});

// api2ai: `files: ["dist"]` with a build script that builds the Next.js app,
// so the tarball is a README and a package.json.
test('flags entry points missing from the tarball', () => {
  const missing = findMissingEntryPoints(
    { main: 'dist/index.js', module: 'dist/index.mjs' },
    ['package.json', 'README.md'],
  );
  assert.deepEqual(
    missing.map((entry) => entry.field),
    ['main', 'module'],
  );
});

test('ignores exports conditions that are not package-relative paths', () => {
  const missing = findMissingEntryPoints(
    { exports: { '.': { node: 'some-other-package/entry', default: './dist/index.js' } } },
    ['dist/index.js'],
  );
  assert.deepEqual(missing, []);
});

test('ignores wildcard subpath exports, which stand for a set of files', () => {
  const missing = findMissingEntryPoints({ exports: { './*': './dist/*.js' } }, ['dist/a.js']);
  assert.deepEqual(missing, []);
});

test('reads a null exports condition without tripping over it', () => {
  assert.deepEqual(findMissingEntryPoints({ exports: { './internal': null } }, []), []);
});
