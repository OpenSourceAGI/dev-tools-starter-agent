'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { LegalDoc, LegalDocOptions, Section, Variant } from '../types';
import { resolveLegalDoc } from '../resolve';
import { BlockView } from './blocks';
import { accentOf, resolveIcon, type IconMap } from './icons';

export interface LegalTermsPrivacyPolicyProps extends LegalDocOptions {
  /**
   * Controlled variant. When set, the switch calls `onVariantChange` instead
   * of holding its own state — use it to drive the variant from the URL.
   */
  variant?: Variant;
  /** Initial variant for the uncontrolled case. Defaults to `'summary'`. */
  defaultVariant?: Variant;
  onVariantChange?: (variant: Variant) => void;
  /** Extra icons for caller-authored sections, keyed by the name used in `icon`. */
  icons?: IconMap;
  /** Extra classes on the outermost element. */
  className?: string;
}

/** Numbered heading label for a section at `index`, or '' when unnumbered. */
function label(doc: LegalDoc, index: number, parent?: string) {
  if (!doc.features.numbered || doc.variant !== 'full') return '';
  return parent ? `${parent.replace(/\.$/, '')}.${index + 1}` : `${index + 1}.`;
}

function SectionBody({
  doc,
  section,
  index,
  parentLabel,
  icons,
}: {
  doc: LegalDoc;
  section: Section;
  index: number;
  parentLabel?: string;
  icons?: IconMap;
}) {
  const isSummary = doc.variant === 'summary';
  const tint = accentOf(section.accent);
  const Icon = resolveIcon(section.icon, icons);
  const heading = label(doc, index, parentLabel);
  const depth = parentLabel === undefined ? 0 : 1;
  const Heading = depth === 0 ? 'h2' : 'h3';

  const body = (
    <>
      {section.blocks?.map((block, i) => (
        <BlockView
          key={i}
          block={block}
          accent={section.accent}
          icons={icons}
          style={isSummary ? 'cards' : 'prose'}
        />
      ))}
      {section.subsections?.map((sub, i) => (
        <SectionBody
          key={sub.id}
          doc={doc}
          section={sub}
          index={i}
          parentLabel={heading || ''}
          icons={icons}
        />
      ))}
    </>
  );

  return (
    <section id={section.id} className={depth === 0 ? 'mb-12 scroll-mt-24' : 'mt-8 scroll-mt-24'}>
      <Heading
        className={
          depth === 0
            ? 'mb-4 flex items-center text-2xl font-bold'
            : 'mb-2 flex items-center text-lg font-semibold'
        }
      >
        {isSummary && section.icon ? (
          <Icon className={`mr-3 h-6 w-6 shrink-0 ${tint.icon}`} />
        ) : null}
        {heading ? <span className="mr-2 tabular-nums opacity-60">{heading}</span> : null}
        {section.title}
      </Heading>
      {isSummary && depth === 0 ? (
        <div className={`rounded-xl border bg-gradient-to-br p-6 shadow-sm ${tint.card}`}>
          {body}
        </div>
      ) : (
        body
      )}
    </section>
  );
}

/**
 * A combined Terms of Service and Privacy Policy page with two presentations
 * of the same policy — a scannable card summary and the full legal text — and
 * a switch between them.
 *
 * Content, tokens, which sections appear and in what order all come from
 * {@link LegalDocOptions}; nothing here needs editing to adopt it.
 *
 * @example
 * ```tsx
 * <LegalTermsPrivacyPolicy
 *   appName="QwkSearch"
 *   contactEmail="legal@qwksearch.com"
 *   lastRevisedDate="March 1, 2026"
 *   defaultVariant="full"
 *   parts={{ california: false }}
 * />
 * ```
 */
export default function LegalTermsPrivacyPolicy({
  variant: controlledVariant,
  defaultVariant = 'summary',
  onVariantChange,
  icons,
  className = '',
  ...options
}: LegalTermsPrivacyPolicyProps) {
  const [uncontrolled, setUncontrolled] = useState<Variant>(defaultVariant);
  const variant = controlledVariant ?? uncontrolled;

  const setVariant = useCallback(
    (next: Variant) => {
      if (controlledVariant === undefined) setUncontrolled(next);
      onVariantChange?.(next);
    },
    [controlledVariant, onVariantChange],
  );

  // `options` is a fresh object on every render (it's a rest spread), so the
  // memo is keyed on its serialized value instead — the option tree is plain
  // data, and this keeps `doc` stable enough for the scroll effect below.
  const optionsKey = JSON.stringify(options);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doc = useMemo(() => resolveLegalDoc({ ...options, variant }), [optionsKey, variant]);

  const [activeSection, setActiveSection] = useState(doc.sections[0]?.id ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Highlight whichever section currently crosses the top of the viewport.
  useEffect(() => {
    if (!doc.features.sidebar && !doc.features.tableOfContents) return;
    const onScroll = () => {
      let current = doc.sections[0]?.id ?? '';
      for (const el of document.querySelectorAll<HTMLElement>('section[id]')) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom >= 120) current = el.id;
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [doc]);

  const scrollTo = useCallback((id: string) => {
    setActiveSection(id);
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access is denied in some embeds; the email is still selectable.
    }
  }, []);

  const CopyIcon = resolveIcon('Copy', icons);
  const CheckIcon = resolveIcon('Check', icons);
  const MenuIcon = resolveIcon('Menu', icons);
  const CloseIcon = resolveIcon('X', icons);
  const BackIcon = resolveIcon('ArrowLeft', icons);
  const CalendarIcon = resolveIcon('Calendar', icons);
  const isSummary = variant === 'summary';
  const showRail = isSummary && doc.features.sidebar;

  return (
    <div className={`min-h-screen bg-white text-gray-800 dark:bg-slate-950 dark:text-slate-200 ${className}`}>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8 sm:px-6">
        {showRail ? (
          <aside className="sticky top-24 hidden h-fit w-14 shrink-0 flex-col items-center gap-3 rounded-xl border bg-white/70 py-4 backdrop-blur-md lg:flex dark:border-slate-800 dark:bg-slate-900/70">
            {doc.sections.map((section) => {
              const Icon = resolveIcon(section.icon, icons);
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  title={section.title}
                  aria-label={section.title}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => scrollTo(section.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                    active
                      ? 'scale-110 bg-indigo-600 text-white shadow'
                      : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </aside>
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {doc.features.backLink ? (
              <a
                href={String(doc.tokens.homeUrl)}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <BackIcon className="h-4 w-4" />
                Back to Home
              </a>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              {showRail ? (
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Table of contents"
                  className="rounded-lg p-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                </button>
              ) : null}

              {doc.features.variantSwitch ? (
                <div
                  role="tablist"
                  aria-label="Policy detail level"
                  className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  {(
                    [
                      ['summary', 'Summary'],
                      ['full', 'Full Text'],
                    ] as const
                  ).map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={variant === value}
                      onClick={() => setVariant(value)}
                      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                        variant === value
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-gray-600 hover:text-indigo-600 dark:text-slate-300'
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {menuOpen && showRail ? (
            <nav className="mb-6 rounded-xl border p-3 lg:hidden dark:border-slate-800">
              {doc.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollTo(section.id)}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-800"
                >
                  {section.title}
                </button>
              ))}
            </nav>
          ) : null}

          <header className={isSummary ? 'mb-8 text-center' : 'mb-8'}>
            <h1
              className={
                isSummary
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-4xl font-black text-transparent'
                  : 'text-3xl font-bold'
              }
            >
              {doc.title}
            </h1>
            {doc.features.badges && doc.badges.length ? (
              <div
                className={`mt-4 flex flex-wrap gap-2 ${isSummary ? 'justify-center' : ''}`}
              >
                {doc.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1 text-xs font-medium text-white shadow"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </header>

          <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm">
                <p className="font-medium">Last Updated: {doc.tokens.lastRevisedDate}</p>
                {doc.tokens.effectiveDate !== doc.tokens.lastRevisedDate ? (
                  <p className="opacity-75">Effective Date: {doc.tokens.effectiveDate}</p>
                ) : null}
              </div>
            </div>
            {doc.features.copyButtons ? (
              <button
                type="button"
                aria-label="Copy contact email"
                title={`Copy ${doc.tokens.contactEmail}`}
                onClick={() => copy(String(doc.tokens.contactEmail), 'email')}
                className="rounded-lg p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/40"
              >
                {copied === 'email' ? (
                  <CheckIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </button>
            ) : null}
          </div>

          {!isSummary && doc.features.tableOfContents ? (
            <nav className="mb-10 rounded-xl border p-4 dark:border-slate-800">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">
                Contents
              </h2>
              <ol className="grid gap-1 sm:grid-cols-2">
                {doc.sections.map((section, i) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(section.id)}
                      className="text-left text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {doc.features.numbered ? `${i + 1}. ` : ''}
                      {section.title}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          {doc.sections.map((section, i) => (
            <SectionBody key={section.id} doc={doc} section={section} index={i} icons={icons} />
          ))}

          {doc.features.footer ? (
            <footer className="mt-12 border-t pt-8 text-center text-sm opacity-70 dark:border-slate-800">
              © {new Date().getFullYear()} {doc.tokens.companyName}. All rights reserved. | Last
              updated: {doc.tokens.lastRevisedDate}
            </footer>
          ) : null}
        </main>
      </div>
    </div>
  );
}
