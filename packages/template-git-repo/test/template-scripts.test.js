import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TEMPLATE_DIR } from '../src/apply.js';
import { testablePackages, workspaceDirectories, formatOutput } from '../template/.github/scripts/list-test-packages.mjs';
import { pinWorkspaceDeps, readSiblings } from '../template/.github/scripts/pin-workspace-deps.mjs';
import { patchVersion, restore } from '../template/.github/scripts/restore-pinned-deps.mjs';
import { nextFreeVersion, takenVersions } from '../template/.github/scripts/next-free-version.mjs';
import { workspaceBuildOrder } from '../template/.github/scripts/workspace-build-order.mjs';

const temporaryDirectories = [];

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgr-scripts-'));
  temporaryDirectories.push(dir);
  return dir;
}

/** Write a package.json at `<root>/<dir>/package.json`. */
function writePackage(root, dir, manifest) {
  const target = path.join(root, dir);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(manifest, null, 2));
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe('list-test-packages', () => {
  it('expands the workspaces globs', () => {
    const root = scratch();
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
    writePackage(root, 'packages/a', { name: 'a' });
    writePackage(root, 'packages/b', { name: 'b' });

    expect(workspaceDirectories(root)).toEqual(['packages/a', 'packages/b']);
  });

  it('picks test:coverage over test, and carries the Codecov flag', () => {
    const root = scratch();
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
    writePackage(root, 'packages/covered', { name: 'covered', scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' } });
    writePackage(root, 'packages/plain', { name: 'plain', scripts: { test: 'node --test' } });
    writePackage(root, 'packages/untested', { name: 'untested' });

    expect(testablePackages(root)).toEqual([
      { name: 'covered', dir: 'packages/covered', flag: 'covered', script: 'test:coverage', allowFailure: false },
      { name: 'plain', dir: 'packages/plain', flag: 'plain', script: 'test', allowFailure: false },
    ]);
  });

  it('reads allowFailure out of the package manifest', () => {
    const root = scratch();
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
    writePackage(root, 'packages/red', { name: 'red', scripts: { test: 'x' }, ci: { allowFailure: true } });

    expect(testablePackages(root)[0].allowFailure).toBe(true);
  });

  it('emits GITHUB_OUTPUT lines, flagging an empty matrix', () => {
    // GitHub fails a job whose matrix has no entries, which would make a repo
    // with no suites look broken rather than untested.
    expect(formatOutput([])).toBe('matrix={"include":[]}\nempty=true\n');
    expect(formatOutput([{ name: 'a' }])).toContain('empty=false');
  });
});

describe('workspace-build-order', () => {
  it('puts a package after every sibling it depends on', () => {
    const root = scratch();
    writePackage(root, 'ui', { name: 'ui', dependencies: { core: 'workspace:*' } });
    writePackage(root, 'core', { name: 'core' });

    const order = workspaceBuildOrder(root);
    expect(order.indexOf(`${root}/core/`)).toBeLessThan(order.indexOf(`${root}/ui/`));
  });

  it('still returns every package when there is a cycle', () => {
    const root = scratch();
    writePackage(root, 'a', { name: 'a', dependencies: { b: 'workspace:*' } });
    writePackage(root, 'b', { name: 'b', dependencies: { a: 'workspace:*' } });

    expect(workspaceBuildOrder(root)).toHaveLength(2);
  });
});

describe('pin-workspace-deps', () => {
  it('replaces workspace:* with a real range from the sibling', () => {
    const siblings = new Map([['core', { version: '1.2.3', private: false }]]);
    const pkg = { dependencies: { core: 'workspace:*', lodash: '^4.0.0' } };

    pinWorkspaceDeps(pkg, siblings);

    expect(pkg.dependencies.core).toBe('^1.2.3');
    // A registry dependency must come through untouched.
    expect(pkg.dependencies.lodash).toBe('^4.0.0');
  });

  it('drops a dependency on a private sibling that will never be published', () => {
    const siblings = new Map([['internal', { version: '0.0.1', private: true }]]);
    const pkg = { dependencies: { internal: 'workspace:*' } };

    pinWorkspaceDeps(pkg, siblings);

    expect(pkg.dependencies.internal).toBeUndefined();
  });

  it('drops a dependency on a package that is not in the workspace at all', () => {
    const pkg = { dependencies: { ghost: 'workspace:*' } };
    pinWorkspaceDeps(pkg, new Map());
    expect(pkg.dependencies.ghost).toBeUndefined();
  });

  it('keeps an explicit range the author wrote', () => {
    const siblings = new Map([['core', { version: '9.9.9', private: false }]]);
    const pkg = { dependencies: { core: 'workspace:^1.0.0' } };

    pinWorkspaceDeps(pkg, siblings);

    expect(pkg.dependencies.core).toBe('^1.0.0');
  });

  it('reads sibling versions off disk', () => {
    const root = scratch();
    writePackage(root, 'core', { name: 'core', version: '2.0.0' });

    expect(readSiblings(root).get('core')).toEqual({ version: '2.0.0', private: false });
  });
});

describe('restore-pinned-deps', () => {
  it('patches the version into the committed text without reformatting it', () => {
    const committed = '{\n    "name": "x",\n    "version": "1.0.0"\n}\n';
    expect(patchVersion(committed, '1.0.0', '1.0.1')).toBe('{\n    "name": "x",\n    "version": "1.0.1"\n}\n');
  });

  it('leaves the text alone when the version did not move', () => {
    const committed = '{"version":"1.0.0"}';
    expect(patchVersion(committed, '1.0.0', '1.0.0')).toBe(committed);
  });

  it('restores the pinned deps but keeps the bump', () => {
    const root = scratch();
    const committed = JSON.stringify({ name: 'a', version: '1.0.0', dependencies: { core: 'workspace:*' } }, null, 2);

    writePackage(root, 'a', { name: 'a', version: '1.0.1', dependencies: { core: '^2.0.0' } });

    restore([root], () => committed);

    const result = JSON.parse(fs.readFileSync(path.join(root, 'a', 'package.json'), 'utf8'));
    expect(result.version).toBe('1.0.1');
    expect(result.dependencies.core).toBe('workspace:*');
  });

  it('leaves an untracked package alone', () => {
    const root = scratch();
    writePackage(root, 'new', { name: 'new', version: '0.1.0' });

    restore([root], () => {
      throw new Error('fatal: path does not exist in HEAD');
    });

    expect(JSON.parse(fs.readFileSync(path.join(root, 'new', 'package.json'), 'utf8')).version).toBe('0.1.0');
  });
});

describe('next-free-version', () => {
  it('counts versions the registry only remembers in its timeline', () => {
    // The E409 case: a version staged by an interrupted publish is absent from
    // `versions` but present in `time`, and npm still refuses a PUT for it.
    const taken = takenVersions({ versions: ['1.0.0'], time: { '1.0.1': 'x', created: 'y' } });
    expect(taken).toEqual(new Set(['1.0.0', '1.0.1']));
    expect(nextFreeVersion('1.0.0', taken)).toBe('1.0.2');
  });

  it('always bumps, never returns the local version', () => {
    expect(nextFreeVersion('1.0.0', new Set())).toBe('1.0.1');
  });
});

describe('the template ships what the workflows call', () => {
  it('every .github/scripts/*.mjs referenced in a workflow exists', () => {
    const workflowsDir = path.join(TEMPLATE_DIR, '.github', 'workflows');
    const referenced = new Set();

    for (const file of fs.readdirSync(workflowsDir)) {
      const yaml = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      for (const match of yaml.matchAll(/node\s+"?(?:\$repo_root\/)?(\.github\/scripts\/[\w-]+\.mjs)/g)) {
        referenced.add(match[1]);
      }
    }

    expect(referenced.size).toBeGreaterThan(0);
    for (const script of referenced) {
      expect(fs.existsSync(path.join(TEMPLATE_DIR, script)), script).toBe(true);
    }
  });
});
