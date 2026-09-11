/**
 * Content model for a combined Terms of Service + Privacy Policy document.
 *
 * The document is plain data — a tree of sections and blocks — so the same
 * source text can be rendered as React, HTML, Markdown or plain text, and so
 * callers can add, remove, reorder or rewrite any part of it without forking
 * a JSX file.
 */

/**
 * Name of a `lucide-react` icon, used by the card renderer for section and
 * card glyphs. Unknown names fall back to a neutral document icon, so a doc
 * stays renderable even when it names an icon the installed lucide version
 * does not have.
 */
export type IconName = string;

/**
 * Tailwind color family used to tint a section's card. The card renderer maps
 * each accent onto a fixed background/border/text triple so sections stay
 * visually distinct without callers writing class strings.
 */
export type Accent =
  | 'indigo'
  | 'emerald'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'teal'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'red'
  | 'slate';

/** A list entry, optionally with its own nested list (for `a.`/`b.` sub-items). */
export type ListItem = string | { text: string; items?: ListItem[] };

/** A single tile inside a {@link CardsBlock}. */
export interface Card {
  title: string;
  /** Body copy. Omit when the tile is a bullet list. */
  text?: string;
  /** Bullets shown under the title. Combine with `text` or use alone. */
  items?: string[];
  icon?: IconName;
}

/** A paragraph of body copy. */
export interface ParagraphBlock {
  type: 'p';
  text: string;
  /** Render the whole paragraph bold (used for lead-ins like "Your Account:"). */
  strong?: boolean;
}

/** An ordered (`1.`) or unordered (`•`) list. */
export interface ListBlock {
  type: 'ol' | 'ul';
  items: ListItem[];
  /** Optional lead-in line rendered above the list. */
  lead?: string;
}

/** A grid of tiles. Rendered as a bullet list by the text-first renderers. */
export interface CardsBlock {
  type: 'cards';
  /** Columns at desktop width. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4;
  /** Center the title/text inside each tile. */
  center?: boolean;
  items: Card[];
}

/** A callout box — a sub-heading plus body copy and/or bullets. */
export interface NoteBlock {
  type: 'note';
  title?: string;
  text?: string;
  items?: ListItem[];
  icon?: IconName;
}

export type Block = ParagraphBlock | ListBlock | CardsBlock | NoteBlock;

/**
 * One section of the document. Sections may nest one level (7 → 7.1, 7.2),
 * which the full-text renderer numbers automatically.
 */
export interface Section {
  /** Stable slug — the anchor id, and the handle used by `include`/`exclude`. */
  id: string;
  title: string;
  icon?: IconName;
  accent?: Accent;
  blocks?: Block[];
  subsections?: Section[];
  /**
   * Marks the section as belonging to an optional part of the document (for
   * example `'ai'` or `'california'`) so it can be switched off wholesale via
   * {@link LegalDocOptions.parts} without listing every section id.
   */
  part?: PartId;
}

/**
 * Named groups of sections that are commonly kept or dropped as a unit.
 *
 * - `core` — introduction, changes, accounts, use, materials, feedback,
 *   warranties, termination, contact. Always on; listing it in `parts` is a
 *   no-op, because a document without it is not a document.
 * - `ai` — the Artificial Intelligence Ethical Use Policy and the AI-specific
 *   opt-out language. Drop it for a product with no model in the loop.
 * - `privacy` — collection, use, disclosure and retention of personal data.
 * - `cookies` — cookies, tracking technologies and Do Not Track.
 * - `california` — the CCPA/CPRA resident notice.
 * - `children` — the COPPA under-13 notice.
 * - `security` — security measures and data retention.
 * - `thirdParty` — third-party links and social features.
 */
export type PartId =
  | 'core'
  | 'ai'
  | 'privacy'
  | 'cookies'
  | 'california'
  | 'children'
  | 'security'
  | 'thirdParty';

/** The two presentations of the same policy. */
export type Variant = 'summary' | 'full';

/**
 * The substitution values the built-in text refers to.
 *
 * Kept free of an index signature so {@link LegalDocOptions} can extend it —
 * see {@link LegalTokens} for the open-ended form used at render time.
 */
export interface BaseTokens {
  /** Product name, e.g. `"QwkSearch"`. */
  appName: string;
  /** Legal entity behind the product. Defaults to `appName`. */
  companyName: string;
  /** Address for legal and privacy requests. */
  contactEmail: string;
  /** Marketing site URL, used by the "back to home" link. */
  homeUrl: string;
  /** Date the text was last revised, already formatted for display. */
  lastRevisedDate: string;
  /** Date the current version took effect. Defaults to `lastRevisedDate`. */
  effectiveDate: string;
  /** Region the Services are offered in, named in the introduction. */
  jurisdiction: string;
  /** Minimum age to hold an account, named in the acceptance section. */
  minimumAge: number | string;
  /** Age below which no data is knowingly collected (COPPA). */
  childrenAge: number | string;
  /** Days after account deletion within which personal data is purged. */
  dataDeletionDays: number | string;
}

/**
 * Substitution values interpolated into `{{token}}` placeholders, including
 * any extra ones a caller passed for their own sections.
 */
export type LegalTokens = BaseTokens & Record<string, string | number | undefined>;

/** Which chrome the React views render around the document body. */
export interface LegalFeatures {
  /** "Back to Home" link above the title. */
  backLink: boolean;
  /** Sticky icon rail / mobile table of contents (summary variant). */
  sidebar: boolean;
  /** Inline table of contents above the body (full variant). */
  tableOfContents: boolean;
  /** Copy-to-clipboard buttons on the header and contact email. */
  copyButtons: boolean;
  /** Compliance pills under the title ("GDPR Compliant", …). */
  badges: boolean;
  /** The summary ⇄ full-text switch. */
  variantSwitch: boolean;
  /** Copyright line at the foot of the document. */
  footer: boolean;
  /** Number full-variant sections `1.`, `1.1`, … */
  numbered: boolean;
}

/** An insertion of a caller-authored section into the document. */
export interface SectionInsertion {
  section: Section;
  /** Insert immediately after the section with this id. */
  after?: string;
  /** Insert immediately before the section with this id. */
  before?: string;
  /** Insert at this index. Applied when neither `after` nor `before` matches. */
  at?: number;
}

/**
 * Everything a caller can change about the document.
 *
 * Every field is optional; {@link resolveLegalDoc} fills the gaps from
 * {@link DEFAULT_TOKENS} and {@link DEFAULT_FEATURES}.
 */
export interface LegalDocOptions extends Partial<BaseTokens> {
  /**
   * Extra `{{token}}` values, for placeholders used by caller-authored
   * sections. Named tokens above win over entries here.
   */
  tokens?: Record<string, string | number>;
  /** Which presentation to render. Defaults to `'full'`. */
  variant?: Variant;
  /** Turn named parts of the document on or off. */
  parts?: Partial<Record<PartId, boolean>>;
  /** Keep only these section ids (applied before `exclude`). */
  include?: string[];
  /** Drop these section ids. */
  exclude?: string[];
  /** Add caller-authored sections at chosen positions. */
  add?: SectionInsertion[];
  /**
   * Replace or patch sections by id. A partial section is merged over the
   * built-in one, so `{ contact: { blocks: [...] } }` swaps the body while
   * keeping the title and icon.
   */
  replace?: Record<string, Partial<Section>>;
  /** Final section order, by id. Ids not listed keep their relative order. */
  order?: string[];
  /** Chrome toggles. */
  features?: Partial<LegalFeatures>;
  /** Compliance pills to show when `features.badges` is on. */
  badges?: string[];
  /** Document title. Defaults to `"{{appName}} Terms of Service & Privacy Policy"`. */
  title?: string;
}

/** A fully-resolved document, ready to render. */
export interface LegalDoc {
  variant: Variant;
  title: string;
  tokens: LegalTokens;
  features: LegalFeatures;
  badges: string[];
  sections: Section[];
}
