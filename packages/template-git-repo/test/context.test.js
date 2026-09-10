import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  detectPackageManager,
  detectPackagesDir,
  detectNpmPackage,
  findRepoRoot,
  parseRepoSlug,
  substitute,
} from '../src/context.js';

const temporaryDirectories = [];

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgr-'));
  temporaryDirectories.push(dir);
  return dir;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe('parseRepoSlug', () => {
  it.each([
    ['https://github.com/acme/widget.git', 'acme/widget'],
    ['https://github.com/acme/widget', 'acme/widget'],
    ['git@github.com:acme/widget.git', 'acme/widget'],
    ['ssh://git@github.com/acme/widget.git', 'acme/widget'],
  ])('parses %s', (url, expected) => {
    expect(parseRepoSlug(url)).toBe(expected);
  });

  it('returns null for a non-GitHub remote', () => {
    expect(parseRepoSlug('https://gitlab.com/acme/widget.git')).toBeNull();
    expect(parseRepoSlug('')).toBeNull();
  });
});

describe('findRepoRoot', () => {
  it('walks up to the directory holding .git', () => {
    const root = scratch();
    fs.mkdirSync(path.join(root, '.git'));
    const nested = path.join(root, 'packages', 'thing');
    fs.mkdirSync(nested, { recursive: true });

    // fs.realpath: macOS puts temp dirs under a /var -> /private/var symlink.
    expect(fs.realpathSync(findRepoRoot(nested))).toBe(fs.realpathSync(root));
  });

  it('returns null outside a repo', () => {
    expect(findRepoRoot(scratch())).toBeNull();
  });
});

describe('detectPackageManager', () => {
  it('prefers the packageManager field', () => {
    const root = scratch();
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.0.0' }));
    expect(detectPackageManager(root)).toBe('pnpm');
  });

  it('falls back to the lockfile', () => {
    const root = scratch();
    fs.writeFileSync(path.join(root, 'bun.lock'), '');
    expect(detectPackageManager(root)).toBe('bun');
  });

  it('defaults to npm', () => {
    expect(detectPackageManager(scratch())).toBe('npm');
  });
});

describe('detectPackagesDir', () => {
  it('reads both workspaces shapes', () => {
    expect(detectPackagesDir({ workspaces: ['libs/*'] })).toBe('libs');
    expect(detectPackagesDir({ workspaces: { packages: ['modules/*'] } })).toBe('modules');
  });

  it('defaults to packages', () => {
    expect(detectPackagesDir(null)).toBe('packages');
  });
});

describe('detectNpmPackage', () => {
  it('skips private packages when picking one to advertise', () => {
    const root = scratch();
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'monorepo', private: true }));
    fs.mkdirSync(path.join(root, 'packages', 'a-private'), { recursive: true });
    fs.mkdirSync(path.join(root, 'packages', 'b-public'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'packages', 'a-private', 'package.json'),
      JSON.stringify({ name: 'a-private', private: true }),
    );
    fs.writeFileSync(
      path.join(root, 'packages', 'b-public', 'package.json'),
      JSON.stringify({ name: 'b-public' }),
    );

    expect(detectNpmPackage(root, 'packages')).toBe('b-public');
  });
});

describe('substitute', () => {
  const context = { defaultBranch: 'canary', packageManager: 'bun', packagesDir: 'libs', packagesGlob: 'libs/*', repoSlug: 'acme/widget', owner: 'acme', repo: 'widget' };

  it('replaces every known token', () => {
    expect(substitute('branches: [{{DEFAULT_BRANCH}}]', context)).toBe('branches: [canary]');
    expect(substitute('{{PACKAGE_MANAGER}} install', context)).toBe('bun install');
    expect(substitute("git add '{{PACKAGES_GLOB}}/package.json'", context)).toBe("git add 'libs/*/package.json'");
  });

  it('leaves unknown tokens visible rather than writing undefined', () => {
    // A workflow with a visible {{THING}} is an obvious bug; one that runs
    // `undefined install` is a confusing one.
    expect(substitute('{{MYSTERY}}', context)).toBe('{{MYSTERY}}');
  });

  it('does not touch GitHub Actions expressions', () => {
    const yaml = 'flags: ${{ matrix.flag }}';
    expect(substitute(yaml, context)).toBe(yaml);
  });
});
