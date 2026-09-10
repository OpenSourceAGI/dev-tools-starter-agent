import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../bin/template-git-repo.js';

const originalCwd = process.cwd();
let root;
let output;

/**
 * A repo-shaped scratch directory. `.git` is what `findRepoRoot` looks for; the
 * remote is supplied with --repo so the tests do not depend on git config.
 */
function scratchRepo({ readme = '# Widget\n\nA thing.\n', manifest } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgr-cli-'));
  fs.mkdirSync(path.join(dir, '.git'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(manifest ?? { name: 'widget-monorepo', private: true, workspaces: ['packages/*'] }, null, 2),
  );
  fs.mkdirSync(path.join(dir, 'packages', 'core'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'packages', 'core', 'package.json'),
    JSON.stringify({ name: 'widget-core', version: '1.0.0', scripts: { 'test:coverage': 'vitest run' } }),
  );
  if (readme !== null) fs.writeFileSync(path.join(dir, 'README.md'), readme);
  return dir;
}

const BASE = ['--repo', 'acme/widget', '--branch', 'main'];

beforeEach(() => {
  root = scratchRepo();
  process.chdir(root);
  output = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => output.push(args.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...args) => output.push(args.join(' ')));
});

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

/** @param {string} file */
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

describe('a full run', () => {
  it('writes the workflows, scripts, configs, turbo wiring and badges', async () => {
    expect(await main(BASE)).toBe(0);

    expect(exists('.github/workflows/tests.yml')).toBe(true);
    expect(exists('.github/workflows/npm-publish.yml')).toBe(true);
    expect(exists('scripts/list-test-packages.mjs')).toBe(true);
    expect(exists('turbo.json')).toBe(true);
    expect(exists('codecov.yml')).toBe(true);

    const manifest = JSON.parse(read('package.json'));
    expect(manifest.scripts.test).toBe('turbo run test');
    expect(manifest.devDependencies.turbo).toBeTruthy();

    const readme = read('README.md');
    expect(readme).toContain('img.shields.io/github/stars/acme/widget');
    // The original content survives.
    expect(readme).toContain('A thing.');
  });

  it('substitutes the detected branch and package manager into the workflows', async () => {
    await main([...BASE, '--pm', 'pnpm']);

    const tests = read('.github/workflows/tests.yml');
    expect(tests).toContain('branches: [main]');
    expect(tests).toContain('pnpm install --ignore-scripts');
    expect(tests).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it('is idempotent — a second run changes nothing', async () => {
    await main(BASE);
    const before = read('README.md');
    output = [];

    await main(BASE);

    expect(read('README.md')).toBe(before);
    expect(output.join('\n')).toContain('Already set up');
  });

  it('points the npm badges at the first non-private workspace package', async () => {
    await main(BASE);
    expect(read('README.md')).toContain('npm/v/widget-core.svg');
  });
});

describe('--dry-run', () => {
  it('writes nothing at all', async () => {
    expect(await main([...BASE, '--dry-run'])).toBe(0);

    expect(exists('turbo.json')).toBe(false);
    expect(exists('.github/workflows/tests.yml')).toBe(false);
    expect(read('README.md')).not.toContain('shields.io');
    expect(JSON.parse(read('package.json')).devDependencies).toBeUndefined();
    expect(output.join('\n')).toContain('Dry run');
  });
});

describe('scoped runs', () => {
  it('--actions-only leaves turbo.json, package.json and the README alone', async () => {
    await main([...BASE, '--actions-only']);

    expect(exists('.github/workflows/tests.yml')).toBe(true);
    expect(exists('scripts/next-free-version.mjs')).toBe(true);
    expect(exists('turbo.json')).toBe(false);
    expect(read('README.md')).not.toContain('shields.io');
    expect(JSON.parse(read('package.json')).scripts).toBeUndefined();
  });

  it('--badges-only writes only the README', async () => {
    await main([...BASE, '--badges-only']);

    expect(exists('.github/workflows/tests.yml')).toBe(false);
    expect(read('README.md')).toContain('shields.io');
  });

  it('--no-turbo skips turbo.json and the manifest, but still writes the workflows', async () => {
    await main([...BASE, '--no-turbo']);

    expect(exists('.github/workflows/tests.yml')).toBe(true);
    expect(exists('turbo.json')).toBe(false);
    expect(JSON.parse(read('package.json')).devDependencies).toBeUndefined();
  });
});

describe('existing files', () => {
  it('are kept unless --force', async () => {
    fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(root, '.github', 'workflows', 'tests.yml'), 'name: mine\n');

    await main(BASE);
    expect(read('.github/workflows/tests.yml')).toBe('name: mine\n');

    await main([...BASE, '--force']);
    expect(read('.github/workflows/tests.yml')).toContain('discover');
  });

  it('warns about hand-written badges instead of deleting them', async () => {
    fs.writeFileSync(path.join(root, 'README.md'), '# Widget\n\n<img src="https://img.shields.io/npm/v/x.svg">\n');

    await main(BASE);

    expect(read('README.md')).toContain('npm/v/x.svg');
    expect(output.join('\n')).toContain('already had badges of its own');
  });
});

describe('badge inputs', () => {
  it('reports the badges it left out and what they needed', async () => {
    await main(BASE);

    const log = output.join('\n');
    expect(log).toContain('Badges not included');
    expect(log).toMatch(/doi\s+needs doi/);
  });

  it('includes a badge once its input arrives', async () => {
    await main([...BASE, '--doi', '10.5281/zenodo.1', '--stack', 'Bun,Cloudflare']);

    const readme = read('README.md');
    expect(readme).toContain('zenodo.org/badge/DOI/10.5281/zenodo.1.svg');
    expect(readme).toContain('alt="Cloudflare"');
    expect(output.join('\n')).not.toMatch(/doi\s+needs doi/);
  });

  it('honours --exclude', async () => {
    await main([...BASE, '--exclude', 'stars,license']);

    const readme = read('README.md');
    expect(readme).not.toContain('github/stars');
    expect(readme).not.toContain('github/license');
    expect(readme).toContain('codecov.io');
  });
});

describe('failure modes', () => {
  it('refuses to guess the repo, and says how to supply it', async () => {
    // No --repo and no git remote in the scratch dir.
    expect(await main([])).toBe(1);
    expect(output.join('\n')).toContain('--repo owner/repo');
    expect(exists('turbo.json')).toBe(false);
  });

  it('carries on when there is no root package.json to wire turbo into', async () => {
    fs.rmSync(path.join(root, 'package.json'));

    expect(await main(BASE)).toBe(0);
    expect(exists('.github/workflows/tests.yml')).toBe(true);
    expect(output.join('\n')).toContain('package.json not found');
  });

  it('creates a README when the repo has none', async () => {
    fs.rmSync(path.join(root, 'README.md'));

    await main(BASE);

    expect(read('README.md')).toContain('shields.io');
  });

  it('--help prints usage and writes nothing', async () => {
    expect(await main(['--help'])).toBe(0);
    expect(output.join('\n')).toContain('Usage');
    expect(exists('turbo.json')).toBe(false);
  });
});
