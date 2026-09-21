/**
 * legal-terms-privacy-policy — one configurable Terms of Service + Privacy
 * Policy document, in two presentations.
 *
 * This entry point is framework-free: content, config, the Markdown / HTML /
 * plain-text renderers, and the cookie consent record the banner writes.
 * Import `legal-terms-privacy-policy/react` for the React page component and
 * the consent banner.
 */
export type {
  Accent,
  Block,
  Card,
  CardsBlock,
  IconName,
  LegalDoc,
  LegalDocOptions,
  LegalFeatures,
  BaseTokens,
  LegalTokens,
  ListBlock,
  ListItem,
  NoteBlock,
  ParagraphBlock,
  PartId,
  Section,
  SectionInsertion,
  Variant,
} from './types';

export {
  DEFAULT_BADGES,
  DEFAULT_FEATURES,
  DEFAULT_TOKENS,
  VARIANTS,
  interpolate,
  resolveLegalDoc,
} from './resolve';

export { FULL_SECTIONS } from './content/full';
export { SUMMARY_SECTIONS } from './content/summary';

export {
  COOKIE_CONSENT_CHOICES,
  COOKIE_CONSENT_STORAGE_KEY,
  clearCookieConsent,
  readCookieConsent,
  writeCookieConsent,
} from './cookie-consent';
export type { CookieConsentChoice, CookieConsentRecord } from './cookie-consent';

export { renderMarkdown, toMarkdown } from './render/markdown';
export { LEGAL_CSS, escapeHtml, renderHtml, toHtml } from './render/html';
export { renderText, toPlainText } from './render/text';
