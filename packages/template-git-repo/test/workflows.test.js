import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_DIR } from '../src/apply.js';
import { substitute } from '../src/context.js';

const WORKFLOWS_DIR = path.join(TEMPLATE_DIR, '.github', 'workflows');
const workflows = fs.readdirSync(WORKFLOWS_DIR).filter((file) => file.endsWith('.yml'));

const context = {
  defaultBranch: 'main',
  packageManager: 'bun',
  packagesDir: 'packages',
  packagesGlob: 'packages/*',
  repoSlug: 'acme/widget',
  owner: 'acme',
  repo: 'widget',
};

/** @param {string} file */
function load(file) {
  return parse(substitute(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8'), context));
}

describe.each(workflows)('%s', (file) => {
  // Shipping a workflow that GitHub cannot parse is the one failure this
  // package must never have: it lands in someone's repo and fails there.
  it('is valid YAML once substituted', () => {
    expect(() => load(file)).not.toThrow();
  });

  it('has a name, a trigger and at least one job', () => {
    const workflow = load(file);

    expect(workflow.name).toBeTruthy();
    // `on:` is YAML 1.1's boolean `true`, which is why this reads oddly.
    expect(workflow.on ?? workflow[true]).toBeTruthy();
    expect(Object.keys(workflow.jobs ?? {}).length).toBeGreaterThan(0);
  });

  it('pins every job to a runner and every action to a major version', () => {
    const workflow = load(file);

    for (const [name, job] of Object.entries(workflow.jobs)) {
      expect(job['runs-on'], `${file}:${name}`).toBeTruthy();

      for (const step of job.steps ?? []) {
        if (!step.uses) continue;
        // A floating `uses: actions/checkout` follows the default branch of
        // someone else's repo into your CI.
        expect(step.uses, `${file}:${name}`).toMatch(/@v?\d/);
      }
    }
  });
});

describe('the template as a whole', () => {
  it('substitutes the default branch into every workflow that pins one', () => {
    for (const file of workflows) {
      const raw = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
      if (!raw.includes('{{DEFAULT_BRANCH}}')) continue;

      expect(substitute(raw, context)).toContain('branches: [main]');
    }
  });

  it('guards the workflows that push or deploy with a concurrency group', () => {
    // Two publish runs racing is how a half-staged version gets reserved.
    for (const file of ['npm-publish.yml', 'auto-merge-and-create-prs.yml', 'deploy-test-reports.yml']) {
      expect(load(file).concurrency?.group, file).toBeTruthy();
    }
  });

  it('never lets one matrix entry cancel the others', () => {
    const tests = load('tests.yml');
    expect(tests.jobs.test.strategy['fail-fast']).toBe(false);
  });
});
