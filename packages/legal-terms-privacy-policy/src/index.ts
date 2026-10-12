/**
 * legal-terms-privacy-policy — a configurable Terms of Service, Privacy Policy
 * and Security Policy, rendered together or separately, in two presentations.
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
  DocumentId,
  DocumentSelection,
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
  DOCUMENT_TITLES,
  SECURITY_BADGE,
  SECURITY_VARIANTS,
  VARIANTS,
  interpolate,
  normalizeDocuments,
  resolveLegalDoc,
} from './resolve';

export { FULL_SECTIONS } from './content/full';
export { SUMMARY_SECTIONS } from './content/summary';
export { SECURITY_FULL_SECTIONS, SECURITY_SUMMARY_SECTIONS } from './content/security';

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
