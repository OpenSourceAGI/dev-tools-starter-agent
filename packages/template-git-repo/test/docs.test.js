import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BADGES } from '../src/badges.js';
import { generate, DOCS_PATH } from '../scripts/generate-badge-docs.mjs';
import { parseArgs } from '../bin/template-git-repo.js';

describe('docs/BADGES.md', () => {
  it('matches the catalog it is generated from', () => {
    // The setup instructions are the reason this package exists. Letting the
    // docs drift from the catalog would make them worse than nothing.
    expect(fs.readFileSync(DOCS_PATH, 'utf8')).toBe(generate());
  });

  it('documents every badge', () => {
    const docs = fs.readFileSync(DOCS_PATH, 'utf8');
    for (const badge of BADGES) {
      expect(docs, badge.id).toContain(`### ${badge.id}`);
    }
  });

  it('gives every badge a setup note with something to act on', () => {
    for (const badge of BADGES) {
      expect(badge.setup.length, badge.id).toBeGreaterThan(40);
    }
  });
});

describe('docs/ACTIONS.md', () => {
  const docs = fs.readFileSync(new URL('../docs/ACTIONS.md', import.meta.url), 'utf8');

  it('documents every secret the workflows read', () => {
    for (const secret of ['CODECOV_TOKEN', 'NPM_TOKEN', 'GIT_TOKEN', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) {
      expect(docs, secret).toContain(secret);
    }
  });

  it('documents every shipped workflow', () => {
    for (const workflow of [
      'tests.yml',
      'npm-publish.yml',
      'auto-merge-claude.yml',
      'auto-merge-and-create-prs.yml',
      'deploy-test-reports.yml',
    ]) {
      expect(docs, workflow).toContain(workflow);
    }
  });
});

describe('parseArgs', () => {
  it('reads flags with and without values', () => {
    expect(parseArgs(['--dry-run', '--repo', 'acme/widget'])).toEqual({
      'dry-run': true,
      repo: 'acme/widget',
    });
  });

  it('treats a following flag as the end of the previous one', () => {
    expect(parseArgs(['--badges-only', '--force'])).toEqual({ 'badges-only': true, force: true });
  });

  it('ignores bare positional arguments', () => {
    expect(parseArgs(['setup', '--force'])).toEqual({ force: true });
  });
});
