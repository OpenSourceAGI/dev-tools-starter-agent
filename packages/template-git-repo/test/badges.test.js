import { describe, expect, it } from 'vitest';
import {
  BADGES,
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
    // The dot is not part of a simple-icons slug.
    expect(html).toContain('logo=nextjs');
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

describe('renderBadgeBlock', () => {
  it('groups badges into rows separated by <br />', () => {
    const { markdown } = renderBadgeBlock(context);

    expect(markdown.startsWith('<p align="center">')).toBe(true);
    expect(markdown.trimEnd().endsWith('</p>')).toBe(true);
    expect(markdown).toContain('<br />');
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
