import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOKENS,
  FULL_SECTIONS,
  SUMMARY_SECTIONS,
  interpolate,
  renderHtml,
  renderMarkdown,
  renderText,
  resolveLegalDoc,
} from '../src/index';
import type { Section } from '../src/types';

/** Flatten a section tree to ids so assertions can look for nested sections. */
function allIds(sections: Section[]): string[] {
  return sections.flatMap((s) => [s.id, ...allIds(s.subsections ?? [])]);
}

/** Every string in the tree, for leak checks on tokens. */
function allText(sections: Section[]): string {
  return JSON.stringify(sections);
}

describe('interpolate', () => {
  it('substitutes known tokens', () => {
    expect(interpolate('Hello {{appName}}', { ...DEFAULT_TOKENS, appName: 'Acme' })).toBe(
      'Hello Acme',
    );
  });

  it('leaves unknown tokens visible rather than blanking the clause', () => {
    expect(interpolate('Contact {{nope}}', DEFAULT_TOKENS)).toBe('Contact {{nope}}');
  });

  it('tolerates whitespace inside the braces', () => {
    expect(interpolate('{{ appName }}', { ...DEFAULT_TOKENS, appName: 'Acme' })).toBe('Acme');
  });
});

describe('resolveLegalDoc', () => {
  it('defaults to the full variant', () => {
    expect(resolveLegalDoc().variant).toBe('full');
    expect(resolveLegalDoc().sections).toHaveLength(FULL_SECTIONS.length);
  });

  it('renders the summary variant when asked', () => {
    const doc = resolveLegalDoc({ variant: 'summary' });
    expect(doc.sections).toHaveLength(SUMMARY_SECTIONS.length);
    expect(doc.sections.map((s) => s.id)).toContain('data-collection');
  });

  it('fills companyName and effectiveDate from their fallbacks', () => {
    const doc = resolveLegalDoc({ appName: 'Acme', lastRevisedDate: 'May 5, 2026' });
    expect(doc.tokens.companyName).toBe('Acme');
    expect(doc.tokens.effectiveDate).toBe('May 5, 2026');
  });

  it('keeps an explicit companyName distinct from appName', () => {
    const doc = resolveLegalDoc({ appName: 'Acme', companyName: 'Acme Holdings, Inc.' });
    expect(doc.tokens.companyName).toBe('Acme Holdings, Inc.');
  });

  it('ignores undefined token overrides instead of blanking the default', () => {
    const doc = resolveLegalDoc({ appName: 'Acme', contactEmail: undefined });
    expect(doc.tokens.contactEmail).toBe(DEFAULT_TOKENS.contactEmail);
    expect(JSON.stringify(doc.sections)).not.toContain('{{contactEmail}}');
  });

  it('leaves no unsubstituted tokens in either variant', () => {
    for (const variant of ['summary', 'full'] as const) {
      const doc = resolveLegalDoc({ variant, appName: 'Acme' });
      expect(allText(doc.sections)).not.toMatch(/\{\{/);
    }
  });

  it('drops a named part and everything under it', () => {
    const doc = resolveLegalDoc({ parts: { ai: false } });
    const ids = allIds(doc.sections);
    expect(ids).not.toContain('ai-ethics');
    expect(ids).not.toContain('ai-trust-but-verify');
    expect(ids).toContain('introduction');
  });

  it('ignores an attempt to drop the core part', () => {
    const doc = resolveLegalDoc({ parts: { core: false } });
    expect(allIds(doc.sections)).toContain('introduction');
  });

  it('drops a single section by id', () => {
    const doc = resolveLegalDoc({ exclude: ['social-features'] });
    expect(allIds(doc.sections)).not.toContain('social-features');
  });

  it('drops a subsection without losing its parent', () => {
    const doc = resolveLegalDoc({ exclude: ['california-selling'] });
    const ids = allIds(doc.sections);
    expect(ids).toContain('california');
    expect(ids).toContain('california-rights');
    expect(ids).not.toContain('california-selling');
  });

  it('keeps only whitelisted sections', () => {
    const doc = resolveLegalDoc({ include: ['introduction', 'contact'] });
    expect(doc.sections.map((s) => s.id)).toEqual(['introduction', 'contact']);
  });

  it('keeps the whole subtree of an explicitly included parent', () => {
    const doc = resolveLegalDoc({ include: ['ai-ethics'] });
    expect(doc.sections.map((s) => s.id)).toEqual(['ai-ethics']);
    expect(doc.sections[0].subsections).toHaveLength(4);
  });

  it('still honours exclude inside an included parent', () => {
    const doc = resolveLegalDoc({ include: ['ai-ethics'], exclude: ['ai-truthfulness'] });
    expect(doc.sections[0].subsections?.map((s) => s.id)).not.toContain('ai-truthfulness');
    expect(doc.sections[0].subsections).toHaveLength(3);
  });

  it('keeps a parent when only one of its children is whitelisted', () => {
    const doc = resolveLegalDoc({ include: ['california-rights'] });
    expect(doc.sections.map((s) => s.id)).toEqual(['california']);
    expect(doc.sections[0].subsections?.map((s) => s.id)).toEqual(['california-rights']);
  });

  it('applies exclude on top of include', () => {
    const doc = resolveLegalDoc({ include: ['introduction', 'contact'], exclude: ['contact'] });
    expect(doc.sections.map((s) => s.id)).toEqual(['introduction']);
  });

  it('patches a section in place, keeping unspecified fields', () => {
    const doc = resolveLegalDoc({
      replace: { contact: { blocks: [{ type: 'p', text: 'Write to {{appName}} legal.' }] } },
      appName: 'Acme',
    });
    const contact = doc.sections.find((s) => s.id === 'contact');
    expect(contact?.title).toBe('How to Contact Us');
    expect(contact?.blocks).toEqual([{ type: 'p', text: 'Write to Acme legal.' }]);
  });

  it('patches a subsection by id', () => {
    const doc = resolveLegalDoc({
      replace: { 'california-selling': { title: 'We Do Not Sell Your Data' } },
    });
    const california = doc.sections.find((s) => s.id === 'california');
    expect(california?.subsections?.map((s) => s.title)).toContain('We Do Not Sell Your Data');
  });

  it('inserts a section after a named one', () => {
    const doc = resolveLegalDoc({
      add: [
        {
          after: 'introduction',
          section: {
            id: 'arbitration',
            title: 'Arbitration',
            blocks: [{ type: 'p', text: '{{appName}} disputes go to arbitration.' }],
          },
        },
      ],
      appName: 'Acme',
    });
    const ids = doc.sections.map((s) => s.id);
    expect(ids[ids.indexOf('introduction') + 1]).toBe('arbitration');
    expect(JSON.stringify(doc.sections)).toContain('Acme disputes go to arbitration.');
  });

  it('inserts a section before a named one, and appends when the anchor is missing', () => {
    const section = { id: 'extra', title: 'Extra' };
    expect(
      resolveLegalDoc({ add: [{ before: 'contact', section }] }).sections.map((s) => s.id).at(-2),
    ).toBe('extra');
    expect(
      resolveLegalDoc({ add: [{ after: 'nope', section }] }).sections.map((s) => s.id).at(-1),
    ).toBe('extra');
  });

  it('reorders named sections to the front and keeps the rest in order', () => {
    const doc = resolveLegalDoc({ order: ['contact', 'introduction'] });
    const ids = doc.sections.map((s) => s.id);
    expect(ids.slice(0, 2)).toEqual(['contact', 'introduction']);
    expect(ids[2]).toBe('changes');
  });

  it('merges feature overrides over the defaults', () => {
    const doc = resolveLegalDoc({ features: { badges: false } });
    expect(doc.features.badges).toBe(false);
    expect(doc.features.backLink).toBe(true);
  });

  it('does not mutate the shared built-in content', () => {
    const before = JSON.stringify(FULL_SECTIONS);
    resolveLegalDoc({ appName: 'Acme', replace: { contact: { title: 'Reach Us' } } });
    expect(JSON.stringify(FULL_SECTIONS)).toBe(before);
  });
});

describe('renderMarkdown', () => {
  it('numbers sections and subsections', () => {
    const md = renderMarkdown({ appName: 'Acme' });
    expect(md).toContain('## 1. Introduction');
    expect(md).toContain('### 3.1 Trust, But Verify Outputs');
  });

  it('drops numbering when the feature is off', () => {
    const md = renderMarkdown({ features: { numbered: false } });
    expect(md).toContain('## Introduction');
    expect(md).not.toContain('## 1. Introduction');
  });

  it('renders nested list items with indentation', () => {
    const md = renderMarkdown({ include: ['california-rights'] });
    expect(md).toMatch(/\n {2}1\. categories of personal information/);
  });

  it('ends with exactly one trailing newline and no blank-line runs', () => {
    const md = renderMarkdown();
    expect(md.endsWith('\n')).toBe(true);
    expect(md).not.toMatch(/\n{3}/);
  });
});

describe('renderHtml', () => {
  it('escapes markup in interpolated values', () => {
    const html = renderHtml({ appName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('links emails and URLs found in the text', () => {
    const html = renderHtml({ contactEmail: 'legal@acme.com', include: ['contact'] });
    expect(html).toContain('<a href="mailto:legal@acme.com">legal@acme.com</a>');
    expect(renderHtml({ include: ['cookies'] })).toContain(
      '<a href="https://tools.google.com/dlpage/gaoptout">',
    );
  });

  it('emits section anchors matching the section ids', () => {
    expect(renderHtml({ include: ['introduction'] })).toContain('<section id="introduction">');
  });

  it('wraps a full page only when standalone is requested', () => {
    expect(renderHtml({}, { standalone: true })).toMatch(/^<!doctype html>/);
    expect(renderHtml({})).toMatch(/^<main/);
  });
});

describe('renderText', () => {
  it('upper-cases headings and keeps the body readable', () => {
    const text = renderText({ appName: 'Acme' });
    expect(text).toContain('1. INTRODUCTION');
    expect(text).toContain('These Terms of Service');
    expect(text).not.toContain('<');
  });
});
