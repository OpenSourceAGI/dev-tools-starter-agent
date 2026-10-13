import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BADGES,
  DEFAULT_TOKENS,
  FULL_SECTIONS,
  SECURITY_BADGE,
  SECURITY_FULL_SECTIONS,
  SECURITY_SUMMARY_SECTIONS,
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

describe('document selection', () => {
  const ids = (options: Parameters<typeof resolveLegalDoc>[0]) =>
    resolveLegalDoc(options).sections.map((s) => s.id);

  it('defaults to the combined Terms of Service and Privacy Policy', () => {
    const doc = resolveLegalDoc({ appName: 'Acme' });
    expect(doc.documents).toEqual(['terms', 'privacy']);
    expect(doc.title).toBe('Acme Terms of Service & Privacy Policy');
    expect(doc.sections.map((s) => s.id)).toEqual(FULL_SECTIONS.map((s) => s.id));
    expect(resolveLegalDoc({ document: 'combined' }).sections).toEqual(
      resolveLegalDoc({}).sections,
    );
  });

  it('tags every built-in top-level section with its policy', () => {
    for (const section of [...FULL_SECTIONS, ...SUMMARY_SECTIONS]) {
      expect(section.documents?.length, section.id).toBeGreaterThan(0);
    }
  });

  it('renders only the Terms of Service', () => {
    for (const variant of ['full', 'summary'] as const) {
      const doc = resolveLegalDoc({ appName: 'Acme', document: 'terms', variant });
      expect(doc.title).toBe('Acme Terms of Service');
      expect(doc.badges).toEqual([]);
      expect(doc.sections.every((s) => s.documents?.includes('terms'))).toBe(true);
      expect(doc.sections.map((s) => s.id)).not.toContain('privacy-policy');
      expect(doc.sections.map((s) => s.id)).toContain('liability');
    }
  });

  it('renders only the Privacy Policy', () => {
    for (const variant of ['full', 'summary'] as const) {
      const doc = resolveLegalDoc({ appName: 'Acme', document: 'privacy', variant });
      expect(doc.title).toBe('Acme Privacy Policy');
      expect(doc.badges).toEqual(DEFAULT_BADGES);
      expect(doc.sections.map((s) => s.id)).toContain('privacy-policy');
      expect(doc.sections.map((s) => s.id)).not.toContain('liability');
      expect(doc.sections.map((s) => s.id)).toContain('contact');
    }
  });

  it('splits the combined text without losing a section', () => {
    const terms = ids({ document: 'terms' });
    const privacy = ids({ document: 'privacy' });
    expect(new Set([...terms, ...privacy])).toEqual(new Set(FULL_SECTIONS.map((s) => s.id)));
  });

  it('renders the Security Policy with the security email falling back to contactEmail', () => {
    const doc = resolveLegalDoc({
      appName: 'Acme',
      contactEmail: 'legal@acme.com',
      document: 'security',
    });
    expect(doc.title).toBe('Acme Security Policy');
    expect(doc.badges).toEqual([SECURITY_BADGE]);
    expect(doc.sections.map((s) => s.id)).toEqual(SECURITY_FULL_SECTIONS.map((s) => s.id));
    const text = allText(doc.sections);
    expect(text).toContain('email a report to legal@acme.com');
    expect(text).toContain('within 3 business days');
    expect(text).not.toMatch(/\{\{\w+\}\}/);

    const custom = resolveLegalDoc({
      document: 'security',
      securityEmail: 'security@acme.com',
      supportedVersions: '2.x',
      disclosureDays: 60,
    });
    expect(allText(custom.sections)).toContain('security@acme.com');
    expect(allText(custom.sections)).toContain('2.x: supported');
    expect(allText(custom.sections)).toContain('up to 60 days');
  });

  it('keeps the summary Security Policy free of unsubstituted tokens', () => {
    const doc = resolveLegalDoc({ document: 'security', variant: 'summary' });
    expect(doc.sections.map((s) => s.id)).toEqual(SECURITY_SUMMARY_SECTIONS.map((s) => s.id));
    expect(allText(doc.sections)).not.toMatch(/\{\{\w+\}\}/);
  });

  it('combines several policies on one page', () => {
    const doc = resolveLegalDoc({ appName: 'Acme', document: ['security', 'terms'] });
    expect(doc.documents).toEqual(['terms', 'security']);
    expect(doc.title).toBe('Acme Terms of Service & Security Policy');
    const all = resolveLegalDoc({ appName: 'Acme', document: ['terms', 'privacy', 'security'] });
    expect(all.title).toBe('Acme Terms of Service, Privacy Policy & Security Policy');
    expect(all.sections.at(-1)?.id).toBe('security-policy-contact');
    expect(new Set(all.sections.map((s) => s.id)).size).toBe(all.sections.length);
  });

  it('applies include/exclude and parts on top of the selection', () => {
    expect(ids({ document: 'security', exclude: ['security-policy-scope'] })).not.toContain(
      'security-policy-scope',
    );
    // `parts.security` is the Privacy Policy's data security section, not the Security Policy.
    expect(ids({ document: 'security', parts: { security: false } })).toContain(
      'security-policy-reporting',
    );
  });

  it('renders a single policy as Markdown', () => {
    const md = renderMarkdown({ appName: 'Acme', document: 'security' });
    expect(md).toContain('# Acme Security Policy');
    expect(md).toContain('Reporting a Vulnerability');
    expect(md).not.toContain('Privacy Policy');
  });
});
