import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyPlan, planFiles, walk, wireTurbo, TEMPLATE_DIR, TURBO_SCRIPTS } from '../src/apply.js';
import { injectBadges, hasUnmarkedBadges, START_MARKER, END_MARKER } from '../src/readme.js';

const temporaryDirectories = [];

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgr-apply-'));
  temporaryDirectories.push(dir);
  return dir;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

const context = {
  defaultBranch: 'main',
  packageManager: 'bun',
  packagesDir: 'packages',
  packagesGlob: 'packages/*',
  repoSlug: 'acme/widget',
  owner: 'acme',
  repo: 'widget',
};

describe('the shipped template', () => {
  it('carries the workflows, scripts and configs the docs promise', () => {
    const files = walk(TEMPLATE_DIR);

    expect(files).toEqual(
      expect.arrayContaining([
        '.github/workflows/tests.yml',
        '.github/workflows/npm-publish.yml',
        '.github/workflows/auto-merge-claude.yml',
        '.github/workflows/auto-merge-and-create-prs.yml',
        '.github/workflows/deploy-test-reports.yml',
        '.github/scripts/workspace-build-order.mjs',
        '.github/scripts/next-free-version.mjs',
        '.github/scripts/pin-workspace-deps.mjs',
        '.github/scripts/restore-pinned-deps.mjs',
        '.github/scripts/list-test-packages.mjs',
        'turbo.json',
        'codecov.yml',
      ]),
    );
  });

  it('leaves no unsubstituted placeholder after planning', () => {
    // The whole point of the token scheme is that a rendered workflow is ready
    // to run. A `{{...}}` surviving into the repo is a broken workflow.
    const root = scratch();
    for (const entry of planFiles({ context: { ...context, root } })) {
      expect(entry.content, entry.path).not.toMatch(/\{\{[A-Z_]+\}\}/);
    }
  });

  it('keeps every ${{ }} Actions expression intact', () => {
    const root = scratch();
    const tests = planFiles({ context: { ...context, root } }).find(
      (entry) => entry.path === '.github/workflows/tests.yml',
    );

    expect(tests.content).toContain('${{ matrix.flag }}');
    expect(tests.content).toContain('${{ secrets.CODECOV_TOKEN }}');
  });

  it('every template script parses as JavaScript', async () => {
    // These run in CI with no install step behind them, so a syntax error
    // surfaces as a failed workflow rather than a failed test.
    const scriptsDir = path.join(TEMPLATE_DIR, '.github', 'scripts');
    const scripts = walk(scriptsDir);

    // A silent zero here would make the check vacuous the next time the
    // helpers move, which is exactly how they last went unnoticed.
    expect(scripts.length).toBeGreaterThan(0);

    for (const file of scripts) {
      await expect(import(path.join(scriptsDir, file))).resolves.toBeDefined();
    }
  });

  it('template json files are valid json', () => {
    for (const file of ['turbo.json']) {
      expect(() => JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8'))).not.toThrow();
    }
  });
});

describe('planFiles', () => {
  it('marks existing files as skip unless forced', () => {
    const root = scratch();
    fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(root, '.github', 'workflows', 'tests.yml'), 'name: mine\n');

    const skip = planFiles({ context: { ...context, root } }).find((e) => e.path === '.github/workflows/tests.yml');
    expect(skip.action).toBe('skip');

    const forced = planFiles({ context: { ...context, root }, force: true }).find(
      (e) => e.path === '.github/workflows/tests.yml',
    );
    expect(forced.action).toBe('overwrite');
  });

  it('reports an identical file as skip even with --force', () => {
    const root = scratch();
    const plan = planFiles({ context: { ...context, root } });
    applyPlan(plan);

    // A no-op run must not report changes it did not make.
    const second = planFiles({ context: { ...context, root }, force: true });
    expect(second.every((entry) => entry.action === 'skip')).toBe(true);
  });

  it('honours include, for --actions-only', () => {
    const root = scratch();
    const paths = planFiles({ context: { ...context, root }, include: ['.github'] }).map((e) => e.path);

    expect(paths.every((file) => file.startsWith('.github/'))).toBe(true);
    expect(paths).not.toContain('turbo.json');
  });
});

describe('applyPlan', () => {
  it('writes nothing on a dry run', () => {
    const root = scratch();
    const plan = planFiles({ context: { ...context, root } });
    const { written } = applyPlan(plan, { dryRun: true });

    expect(written.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(root, 'turbo.json'))).toBe(false);
  });

  it('makes the .mjs helpers executable', () => {
    const root = scratch();
    applyPlan(planFiles({ context: { ...context, root } }));

    const mode = fs.statSync(path.join(root, '.github', 'scripts', 'next-free-version.mjs')).mode;
    expect(mode & 0o111).toBeTruthy();
  });
});

describe('wireTurbo', () => {
  it('adds the scripts, turbo and workspaces without clobbering existing ones', () => {
    const { manifest, changes } = wireTurbo({ scripts: { build: 'tsc -b' } });

    // An existing build script almost certainly does something this template
    // cannot know about.
    expect(manifest.scripts.build).toBe('tsc -b');
    expect(manifest.scripts.test).toBe(TURBO_SCRIPTS.test);
    expect(manifest.devDependencies.turbo).toBeTruthy();
    expect(manifest.workspaces).toEqual(['packages/*', 'apps/*']);
    expect(changes).not.toContain('scripts.build');
  });

  it('reports no changes when everything is already wired', () => {
    const first = wireTurbo({}).manifest;
    expect(wireTurbo(first).changes).toEqual([]);
  });

  it("uses the repo's own packages directory", () => {
    const { manifest } = wireTurbo({}, { packagesDir: 'libs' });
    expect(manifest.workspaces).toContain('libs/*');
  });
});

describe('injectBadges', () => {
  it('replaces only what is between the markers', () => {
    const readme = `# Title\n\n${START_MARKER}\nold\n${END_MARKER}\n\nBody text.\n`;
    const { content, action } = injectBadges(readme, 'new');

    expect(action).toBe('replaced');
    expect(content).toContain('new');
    expect(content).not.toContain('old');
    expect(content).toContain('Body text.');
    expect(content).toContain('# Title');
  });

  it('inserts at the top of an existing README', () => {
    const { content, action } = injectBadges('# Title\n', 'badges');
    expect(action).toBe('inserted');
    expect(content.indexOf('badges')).toBeLessThan(content.indexOf('# Title'));
  });

  it('is idempotent', () => {
    const once = injectBadges('# Title\n', 'badges').content;
    expect(injectBadges(once, 'badges').content).toBe(once);
  });

  it('handles an empty README', () => {
    expect(injectBadges('', 'badges').content).toBe(`${START_MARKER}\nbadges\n${END_MARKER}\n`);
  });
});

describe('hasUnmarkedBadges', () => {
  it('spots hand-written badges so they are not silently duplicated', () => {
    expect(hasUnmarkedBadges('<img src="https://img.shields.io/npm/v/x.svg">')).toBe(true);
    expect(hasUnmarkedBadges(`${START_MARKER}\nx\n${END_MARKER}`)).toBe(false);
    expect(hasUnmarkedBadges('# Just a title')).toBe(false);
  });
});
