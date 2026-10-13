import type {
  Block,
  DocumentId,
  DocumentSelection,
  Card,
  LegalDoc,
  LegalDocOptions,
  LegalFeatures,
  LegalTokens,
  ListItem,
  PartId,
  Section,
  Variant,
} from './types';
import { FULL_SECTIONS } from './content/full';
import { SUMMARY_SECTIONS } from './content/summary';
import { SECURITY_FULL_SECTIONS, SECURITY_SUMMARY_SECTIONS } from './content/security';

/**
 * Placeholder values. Every one is overridable; `appName` is the only field
 * most callers need to set, and `companyName`/`effectiveDate` fall back to
 * `appName`/`lastRevisedDate` when left out.
 */
export const DEFAULT_TOKENS: LegalTokens = {
  appName: 'Our Service',
  companyName: '',
  contactEmail: 'legal@example.com',
  homeUrl: '/',
  lastRevisedDate: 'January 1, 2025',
  effectiveDate: '',
  jurisdiction: 'the United States',
  minimumAge: 18,
  childrenAge: 13,
  dataDeletionDays: 30,
  securityEmail: '',
  supportedVersions: 'The latest release',
  securityResponseDays: 3,
  disclosureDays: 90,
};

/** Chrome shown unless a caller turns it off. */
export const DEFAULT_FEATURES: LegalFeatures = {
  backLink: true,
  sidebar: true,
  tableOfContents: true,
  copyButtons: true,
  badges: true,
  variantSwitch: true,
  footer: true,
  numbered: true,
};

/** Compliance pills shown under the title when `features.badges` is on. */
export const DEFAULT_BADGES = ['GDPR Compliant', 'CCPA Compliant', 'Cookie Policy'];

/** Pill added to the defaults when the Security Policy is on the page. */
export const SECURITY_BADGE = 'Coordinated Disclosure';

/**
 * The built-in combined Terms of Service + Privacy Policy section trees, keyed
 * by variant. Each top-level section's `documents` field says which of the two
 * policies it belongs to.
 */
export const VARIANTS: Record<Variant, Section[]> = {
  summary: SUMMARY_SECTIONS,
  full: FULL_SECTIONS,
};

/** The built-in Security Policy section trees, keyed by variant. */
export const SECURITY_VARIANTS: Record<Variant, Section[]> = {
  summary: SECURITY_SUMMARY_SECTIONS,
  full: SECURITY_FULL_SECTIONS,
};

/** Display names of each policy, used to build the default title. */
export const DOCUMENT_TITLES: Record<DocumentId, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  security: 'Security Policy',
};

const DOCUMENT_ORDER: DocumentId[] = ['terms', 'privacy', 'security'];
const COMBINED: DocumentId[] = ['terms', 'privacy'];

/**
 * Turn a {@link DocumentSelection} into the list of policies it names, in
 * canonical order (terms, privacy, security). `'combined'`, an empty list or
 * nothing at all means the Terms of Service and Privacy Policy together.
 */
export function normalizeDocuments(selection?: DocumentSelection): DocumentId[] {
  if (!selection || selection === 'combined') return [...COMBINED];
  const list: string[] = Array.isArray(selection) ? selection : [selection];
  const documents = DOCUMENT_ORDER.filter((id) => list.includes(id));
  return documents.length ? documents : [...COMBINED];
}

/** `"A"`, `"A & B"`, `"A, B & C"`. */
function joinTitles(names: string[]): string {
  if (names.length <= 2) return names.join(' & ');
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/**
 * The top-level sections of the chosen policies, before any caller filtering.
 * Terms and privacy sections keep their order in the combined text, so a
 * section shared by both (the introduction, the contact details) appears once.
 */
function selectSections(variant: Variant, documents: DocumentId[]): Section[] {
  const sections = (VARIANTS[variant] ?? VARIANTS.full).filter((section) =>
    (section.documents ?? COMBINED).some((id) => documents.includes(id)),
  );
  if (documents.includes('security')) {
    sections.push(...(SECURITY_VARIANTS[variant] ?? SECURITY_VARIANTS.full));
  }
  return sections;
}

/**
 * Replace every `{{token}}` in `text` with its value.
 *
 * Unknown tokens are left as-is rather than blanked, so a typo shows up in the
 * rendered page instead of silently deleting a clause.
 */
export function interpolate(text: string, tokens: LegalTokens): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = tokens[key];
    return value === undefined || value === '' ? match : String(value);
  });
}

function interpolateListItem(item: ListItem, tokens: LegalTokens): ListItem {
  if (typeof item === 'string') return interpolate(item, tokens);
  return {
    text: interpolate(item.text, tokens),
    ...(item.items ? { items: item.items.map((sub) => interpolateListItem(sub, tokens)) } : {}),
  };
}

function interpolateCard(card: Card, tokens: LegalTokens): Card {
  return {
    ...card,
    title: interpolate(card.title, tokens),
    ...(card.text ? { text: interpolate(card.text, tokens) } : {}),
    ...(card.items ? { items: card.items.map((i) => interpolate(i, tokens)) } : {}),
  };
}

function interpolateBlock(block: Block, tokens: LegalTokens): Block {
  switch (block.type) {
    case 'p':
      return { ...block, text: interpolate(block.text, tokens) };
    case 'ol':
    case 'ul':
      return {
        ...block,
        ...(block.lead ? { lead: interpolate(block.lead, tokens) } : {}),
        items: block.items.map((i) => interpolateListItem(i, tokens)),
      };
    case 'cards':
      return { ...block, items: block.items.map((c) => interpolateCard(c, tokens)) };
    case 'note':
      return {
        ...block,
        ...(block.title ? { title: interpolate(block.title, tokens) } : {}),
        ...(block.text ? { text: interpolate(block.text, tokens) } : {}),
        ...(block.items ? { items: block.items.map((i) => interpolateListItem(i, tokens)) } : {}),
      };
  }
}

function interpolateSection(section: Section, tokens: LegalTokens): Section {
  return {
    ...section,
    title: interpolate(section.title, tokens),
    ...(section.blocks ? { blocks: section.blocks.map((b) => interpolateBlock(b, tokens)) } : {}),
    ...(section.subsections
      ? { subsections: section.subsections.map((s) => interpolateSection(s, tokens)) }
      : {}),
  };
}

/**
 * Drop sections whose `part` is switched off, that are excluded by id, or that
 * fall outside an `include` whitelist. Runs over subsections too, so a caller
 * can remove `california-selling` without losing the rest of the CCPA notice.
 *
 * A parent kept only because a child survived keeps that child; a parent whose
 * own id is excluded takes its children with it. Naming a parent in `include`
 * keeps its whole subtree, so `include: ['ai-ethics']` is the section and its
 * four sub-policies rather than an empty heading.
 */
function filterSections(
  sections: Section[],
  parts: Partial<Record<PartId, boolean>>,
  include: Set<string> | null,
  exclude: Set<string>,
): Section[] {
  const kept: Section[] = [];
  for (const section of sections) {
    if (exclude.has(section.id)) continue;
    // `core` is structural — turning it off would leave an empty document.
    if (section.part && section.part !== 'core' && parts[section.part] === false) continue;

    // An explicitly included parent takes its children with it: past this
    // point the whitelist has done its job and only `exclude` and `parts` apply.
    const childInclude = include?.has(section.id) ? null : include;
    const subsections = section.subsections
      ? filterSections(section.subsections, parts, childInclude, exclude)
      : undefined;

    // An `include` list keeps a parent if the parent itself or any of its
    // surviving children was named, so `include: ['california-rights']` still
    // renders under its "California Residents" heading.
    if (include && !include.has(section.id) && !subsections?.length) continue;

    kept.push({
      ...section,
      ...(subsections ? { subsections } : {}),
    });
  }
  return kept;
}

/** Apply `replace` patches to a section and its subsections, by id. */
function patchSections(sections: Section[], patches: Record<string, Partial<Section>>): Section[] {
  return sections.map((section) => {
    const patched = patches[section.id] ? { ...section, ...patches[section.id] } : section;
    return patched.subsections
      ? { ...patched, subsections: patchSections(patched.subsections, patches) }
      : patched;
  });
}

/** Insert caller-authored sections at their requested positions. */
function insertSections(sections: Section[], insertions: LegalDocOptions['add']): Section[] {
  if (!insertions?.length) return sections;
  const result = [...sections];
  for (const { section, after, before, at } of insertions) {
    const afterIndex = after ? result.findIndex((s) => s.id === after) : -1;
    const beforeIndex = before ? result.findIndex((s) => s.id === before) : -1;
    let index: number;
    if (afterIndex >= 0) index = afterIndex + 1;
    else if (beforeIndex >= 0) index = beforeIndex;
    else if (typeof at === 'number') index = Math.max(0, Math.min(at, result.length));
    else index = result.length;
    result.splice(index, 0, section);
  }
  return result;
}

/**
 * Reorder by the given ids. Sections named in `order` come first in that
 * order; anything unnamed keeps its relative position after them.
 */
function reorderSections(sections: Section[], order: string[]): Section[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const named = order.map((id) => byId.get(id)).filter((s): s is Section => Boolean(s));
  const namedIds = new Set(named.map((s) => s.id));
  return [...named, ...sections.filter((s) => !namedIds.has(s.id))];
}

/**
 * Build a ready-to-render document from a caller's options.
 *
 * Order of operations: pick the variant's sections for the chosen policies
 * (`document`) → drop parts and ids →
 * patch surviving sections → insert new ones → reorder → interpolate tokens.
 * Inserted sections are interpolated too, so caller-authored text can use the
 * same `{{appName}}` placeholders as the built-ins.
 *
 * @example
 * ```ts
 * const doc = resolveLegalDoc({
 *   appName: 'QwkSearch',
 *   contactEmail: 'legal@qwksearch.com',
 *   lastRevisedDate: 'March 1, 2026',
 *   variant: 'full',
 *   document: 'privacy',            // just the Privacy Policy
 *   parts: { california: false },   // drop the CCPA notice
 *   exclude: ['social-features'],   // drop one section by id
 * });
 * ```
 */
export function resolveLegalDoc(options: LegalDocOptions = {}): LegalDoc {
  const {
    variant = 'full',
    document,
    parts = {},
    include,
    exclude = [],
    add,
    replace,
    order,
    features,
    badges,
    title,
    tokens: extraTokens,
    ...tokenOverrides
  } = options;

  // Drop `undefined` overrides rather than letting them shadow a default — a
  // caller passing `contactEmail={process.env.APP_EMAIL}` on a machine without
  // that variable should get the default, not a `{{contactEmail}}` on the page.
  const defined = Object.fromEntries(
    Object.entries(tokenOverrides).filter(([, value]) => value !== undefined),
  );
  const tokens: LegalTokens = { ...DEFAULT_TOKENS, ...extraTokens, ...defined };
  if (!tokens.companyName) tokens.companyName = tokens.appName;
  if (!tokens.effectiveDate) tokens.effectiveDate = tokens.lastRevisedDate;
  if (!tokens.securityEmail) tokens.securityEmail = tokens.contactEmail;

  const documents = normalizeDocuments(document);
  let sections = filterSections(
    selectSections(variant, documents),
    parts,
    include?.length ? new Set(include) : null,
    new Set(exclude),
  );
  if (replace) sections = patchSections(sections, replace);
  sections = insertSections(sections, add);
  if (order?.length) sections = reorderSections(sections, order);
  sections = sections.map((s) => interpolateSection(s, tokens));

  const defaultTitle = `{{appName}} ${joinTitles(documents.map((id) => DOCUMENT_TITLES[id]))}`;
  const defaultBadges = [
    ...(documents.includes('privacy') ? DEFAULT_BADGES : []),
    ...(documents.includes('security') ? [SECURITY_BADGE] : []),
  ];

  return {
    variant,
    documents,
    title: interpolate(title ?? defaultTitle, tokens),
    tokens,
    features: { ...DEFAULT_FEATURES, ...features },
    badges: badges ?? defaultBadges,
    sections,
  };
}
