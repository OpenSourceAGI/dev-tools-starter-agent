import { describe, expect, it } from 'vitest';
import {
  BADGES,
  GROUPS,
  renderBadge,
  renderBadgeBlock,
  selectBadges,
  shieldsBadge,
  stackChip,
} from '../src/badges.js';

const context = {
  repoSlug: 'acme/widget',
  owner: 'acme',
  repo: 'widget',
  defaultBranch: 'main',
  npmPackage: 'widget',
  workflowFile: 'tests.yml',
};

describe('shieldsBadge', () => {
  it('doubles literal hyphens so the label survives shields.io parsing', () => {
    // A single `-` is shields.io's field separator: "PRs-welcome" would render
    // as the label "PRs" with the message "welcome".
    expect(shieldsBadge('PRs-welcome', 'brightgreen')).toContain('PRs--welcome-brightgreen');
  });

  it('appends logo params as a query string', () => {
    expect(shieldsBadge('Docs', 'blue', { logo: 'ReadTheDocs' })).toBe(
      'https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs',
    );
  });
});

describe('selectBadges', () => {
  it('skips badges whose inputs are missing, and says what they were', () => {
    const { included, skipped } = selectBadges(context);

    expect(included.map((badge) => badge.id)).toContain('stars');
    expect(skipped.find((entry) => entry.id === 'doi')).toEqual({ id: 'doi', missing: ['doi'] });
  });

  it('includes a badge once its input is supplied', () => {
    const { included } = selectBadges({ ...context, doi: '10.5281/zenodo.1' });
    expect(included.map((badge) => badge.id)).toContain('doi');
  });

  it('honours only and exclude', () => {
    expect(selectBadges(context, { only: ['stars'] }).included.map((b) => b.id)).toEqual(['stars']);
    expect(selectBadges(context, { exclude: ['stars'] }).included.map((b) => b.id)).not.toContain('stars');
  });

  it('drops npm badges when nothing is published', () => {
    const { skipped } = selectBadges({ ...context, npmPackage: undefined });
    expect(skipped.map((entry) => entry.id)).toEqual(expect.arrayContaining(['npm-version', 'npm-downloads']));
  });
});

describe('renderBadge', () => {
  it('pins the CI badge to the default branch', () => {
    // Without ?branch=, the badge shows the latest run on any branch, so a
    // failing feature branch reads as a broken default branch.
    const badge = BADGES.find((entry) => entry.id === 'workflow');
    expect(renderBadge(badge, context)).toContain('badge.svg?branch=main');
  });

  it('renders the stack chips from a comma-separated list', () => {
    const badge = BADGES.find((entry) => entry.id === 'stack');
    const html = renderBadge(badge, { ...context, stack: 'Claude,Next.js' });

    expect(html).toContain('alt="Claude"');
    expect(html).toContain('alt="Next.js"');
    // simple-icons spells the dot out rather than dropping it: the slug is
    // `nextdotjs`, and `nextjs` renders a chip with a blank square on it.
    expect(html).toContain('logo=nextdotjs');
  });

  it('spaces and slashes in a chip name survive into the label but not the slug', () => {
    const badge = BADGES.find((entry) => entry.id === 'stack');
    const html = renderBadge(badge, { ...context, stack: 'Tailwind CSS,shadcn/ui' });

    expect(html).toContain('logo=tailwindcss');
    expect(html).toContain('logo=shadcnui');
    expect(html).toContain('alt="shadcn/ui"');
  });

  it('leaves off the logo for a chip simple-icons has no icon for', () => {
    // A wrong slug renders a blank square where the logo should be, which looks
    // like a broken image rather than a deliberate text chip.
    expect(stackChip('better-auth')).not.toContain('logo=');
    expect(stackChip('better-auth')).toContain('alt="better-auth"');
  });

  it('gives every badge a non-empty alt text', () => {
    const full = { ...context, doi: '10.5281/zenodo.1', docsUrl: 'https://d', apiUrl: 'https://a',
      youtubeUrl: 'https://y', uptimeUrl: 'https://u', testReportUrl: 'https://t',
      discordId: '1', discordInvite: 'https://d', stack: 'Bun', cloudflareDeploy: 'true' };

    for (const badge of selectBadges(full).included) {
      expect(renderBadge(badge, full)).toMatch(/alt="[^"]+"/);
    }
  });
});

describe('GitHub activity badges', () => {
  // Stars alone say a repo was noticed once. These say whether anything is
  // moving through it now.
  it('links each count at the page that explains it', () => {
    const expected = {
      issues: '/issues',
      'pull-requests': '/pulls',
      'prs-merged': '/pulls?q=is%3Apr+is%3Aclosed',
      discussions: '/discussions',
      contributors: '/graphs/contributors',
      forks: '/forks',
    };

    for (const [id, suffix] of Object.entries(expected)) {
      const badge = BADGES.find((entry) => entry.id === id);
      expect(renderBadge(badge, context), id).toContain(`href="https://github.com/acme/widget${suffix}"`);
    }
  });

  it('labels the two PR counts apart', () => {
    // Both come off shields.io as bare numbers; unlabelled, two adjacent PR
    // badges read as one number printed twice.
    const open = BADGES.find((entry) => entry.id === 'pull-requests');
    const merged = BADGES.find((entry) => entry.id === 'prs-merged');

    expect(renderBadge(open, context)).toContain('label=PRs');
    expect(renderBadge(merged, context)).toContain('label=PRs%20merged');
  });

  it('renders every activity count without any configuration', () => {
    const { included } = selectBadges(context);
    expect(included.map((badge) => badge.id)).toEqual(
      expect.arrayContaining(['issues', 'pull-requests', 'prs-merged', 'discussions', 'contributors', 'forks']),
    );
  });
});

describe('renderBadgeBlock', () => {
  it('groups badges into rows separated by <br />', () => {
    const { markdown } = renderBadgeBlock(context);

    expect(markdown.startsWith('<p align="center">')).toBe(true);
    expect(markdown.trimEnd().endsWith('</p>')).toBe(true);
    expect(markdown).toContain('<br />');
  });

  it('renders one row per group, in GROUPS order', () => {
    // Four rows is the shape the block is designed around: what it is and where
    // to try it, whether anyone uses it and whether it works, whether it is
    // alive, and how to run it yourself. A fifth row would mean a badge landed
    // in a group nobody named.
    const { markdown } = renderBadgeBlock({ ...context, stack: 'Bun' });
    const rows = markdown.split('<br />');

    expect(rows).toHaveLength(GROUPS.length);
    expect(rows[0]).toContain('deepwiki');
    expect(rows[1]).toContain('npm/v');
    expect(rows[2]).toContain('issues-pr');
    expect(rows[3]).toContain('alt="Bun"');
  });

  it('puts stars with the download counts, not with the PR queue', () => {
    // Both answer the same question — is anyone using this — so they read as
    // one row. Stars next to the open-issue count reads as project chatter.
    const { markdown } = renderBadgeBlock({ ...context, stack: 'Bun' });
    const rows = markdown.split('<br />');

    expect(rows[1]).toContain('github/stars');
    expect(rows[2]).not.toContain('github/stars');
  });

  it('keeps the sandbox buttons off the row that links to the live app', () => {
    // Row one is the click that matters. "Open in StackBlitz" next to it
    // competes with the app link for the one decision a visitor makes.
    const { markdown } = renderBadgeBlock({
      ...context,
      websiteUrl: 'https://example.com',
      stackblitzUrl: 'https://stackblitz.com/github/acme/widget',
      stack: 'Bun',
    });
    const rows = markdown.split('<br />');

    expect(rows[0]).toContain('alt="Website"');
    expect(rows[0]).not.toContain('stackblitz');
    expect(rows[3]).toContain('stackblitz');
  });

  it('never emits an undefined url', () => {
    const { markdown } = renderBadgeBlock(context);
    expect(markdown).not.toContain('undefined');
  });
});

describe('stackChip', () => {
  it('uses the brand colour for known tools and a neutral grey otherwise', () => {
    expect(stackChip('Cloudflare')).toContain('F38020');
    expect(stackChip('Something Else')).toContain('555555');
  });
});

describe('package-scoped badges', () => {
  // In a monorepo the repo-wide numbers are the wrong ones to put on a package
  // README: they describe sixteen other packages too.
  const pkgContext = { ...context, npmPackage: 'manage-storage' };

  it('counts downloads for one package, not the workspace', () => {
    for (const id of ['npm-downloads', 'npm-total-downloads']) {
      const badge = BADGES.find((entry) => entry.id === id);
      expect(renderBadge(badge, pkgContext)).toContain('manage-storage');
    }
  });

  it('narrows coverage to the package flag', () => {
    const badge = BADGES.find((entry) => entry.id === 'codecov-flag');
    const html = renderBadge(badge, { ...pkgContext, codecovFlag: 'manage-storage' });

    expect(html).toContain('flag=manage-storage');
    // The label has to say which package, or two flagged badges look identical.
    expect(html).toContain('label=manage-storage%20coverage');
  });

  it('skips the flagged coverage badge until a flag is named', () => {
    // Falling back to the repo-wide number here would be worse than no badge:
    // it reads as this package's coverage while measuring the whole monorepo.
    const { skipped } = selectBadges(pkgContext);
    expect(skipped.find((entry) => entry.id === 'codecov-flag')).toEqual({
      id: 'codecov-flag',
      missing: ['codecovFlag'],
    });
  });

  it('points StackBlitz at the directory it was given', () => {
    const url = 'https://stackblitz.com/github/acme/widget/tree/main/packages/manage-storage';
    const badge = BADGES.find((entry) => entry.id === 'stackblitz');

    expect(renderBadge(badge, { ...pkgContext, stackblitzUrl: url })).toContain(`href="${url}"`);
  });

  it('reports types and install size for the same single package', () => {
    for (const id of ['npm-types', 'install-size']) {
      const badge = BADGES.find((entry) => entry.id === id);
      expect(renderBadge(badge, pkgContext)).toContain('manage-storage');
    }
  });
});
