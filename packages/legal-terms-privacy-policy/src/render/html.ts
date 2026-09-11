import type { Block, LegalDoc, LegalDocOptions, ListItem, Section } from '../types';
import { resolveLegalDoc } from '../resolve';

/** Escape the five characters that can break out of HTML text or an attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Linkify bare URLs and email addresses left in the legal text. */
function autoLink(text: string): string {
  return escapeHtml(text)
    .replace(/\bhttps?:\/\/[^\s<)]+/g, (url) => `<a href="${url}">${url}</a>`)
    .replace(
      /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
      (email) => `<a href="mailto:${email}">${email}</a>`,
    );
}

function renderListItems(items: ListItem[], tag: 'ol' | 'ul'): string {
  const body = items
    .map((item) => {
      if (typeof item === 'string') return `<li>${autoLink(item)}</li>`;
      const nested = item.items ? renderListItems(item.items, tag) : '';
      return `<li>${autoLink(item.text)}${nested}</li>`;
    })
    .join('');
  return `<${tag}>${body}</${tag}>`;
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case 'p':
      return block.strong
        ? `<p><strong>${autoLink(block.text)}</strong></p>`
        : `<p>${autoLink(block.text)}</p>`;
    case 'ol':
    case 'ul':
      return (
        (block.lead ? `<p>${autoLink(block.lead)}</p>` : '') +
        renderListItems(block.items, block.type)
      );
    case 'cards':
      return (
        `<div class="legal-cards legal-cards-${block.columns ?? 3}">` +
        block.items
          .map(
            (card) =>
              `<div class="legal-card">` +
              `<h4>${escapeHtml(card.title)}</h4>` +
              (card.text ? `<p>${autoLink(card.text)}</p>` : '') +
              (card.items
                ? `<ul>${card.items.map((i) => `<li>${autoLink(i)}</li>`).join('')}</ul>`
                : '') +
              `</div>`,
          )
          .join('') +
        `</div>`
      );
    case 'note':
      return (
        `<div class="legal-note">` +
        (block.title ? `<h4>${escapeHtml(block.title)}</h4>` : '') +
        (block.text ? `<p>${autoLink(block.text)}</p>` : '') +
        (block.items ? renderListItems(block.items, 'ul') : '') +
        `</div>`
      );
  }
}

function renderSection(section: Section, label: string, depth: number): string {
  const tag = depth === 0 ? 'h2' : 'h3';
  return (
    `<section id="${escapeHtml(section.id)}">` +
    `<${tag}>${label ? `${escapeHtml(label)} ` : ''}${escapeHtml(section.title)}</${tag}>` +
    (section.blocks?.map(renderBlock).join('') ?? '') +
    (section.subsections
      ?.map((sub, i) =>
        renderSection(sub, label ? `${label.replace(/\.$/, '')}.${i + 1}` : '', depth + 1),
      )
      .join('') ?? '') +
    `</section>`
  );
}

/**
 * Stylesheet for {@link toHtml}'s markup — the `.privacy-page` rules the
 * QwkSearch and Debate AI pages already ship, plus card and note styles.
 * Exported so a host page can inline it rather than take the full document.
 */
export const LEGAL_CSS = `
.legal-page { font-family: Lato, system-ui, -apple-system, Arial, sans-serif; line-height: 1.6; margin: 0 auto; max-width: 800px; padding: 20px 20px 50px; color: #333; }
.legal-page h1 { margin: 1rem 0; font-size: 2rem; color: #2c3e50; font-variant: small-caps; }
.legal-page h2 { margin: 1.5rem 0 1rem; font-size: 1.5rem; color: #34495e; font-variant: small-caps; }
.legal-page h3 { margin: 1rem 0; font-size: 1.2rem; color: #7f8c8d; font-variant: small-caps; }
.legal-page h4 { margin: .75rem 0 .25rem; font-size: 1rem; color: #34495e; }
.legal-page p { margin: 1rem 0; }
.legal-page ol { list-style-type: decimal; padding-left: 20px; margin: 1rem 0; }
.legal-page ul { list-style-type: disc; padding-left: 20px; margin: 1rem 0; }
.legal-page ol ol { list-style-type: lower-alpha; }
.legal-page a { color: #2563eb; }
.legal-note { border: 1px solid #e2e8f0; border-radius: .5rem; padding: .75rem 1rem; margin: 1rem 0; background: #f8fafc; }
.legal-cards { display: grid; gap: 1rem; margin: 1rem 0; grid-template-columns: 1fr; }
.legal-card { border: 1px solid #e2e8f0; border-radius: .5rem; padding: 1rem; background: #fff; }
@media (min-width: 640px) {
  .legal-cards-2, .legal-cards-4 { grid-template-columns: repeat(2, 1fr); }
  .legal-cards-3 { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 1024px) { .legal-cards-4 { grid-template-columns: repeat(4, 1fr); } }
@media (prefers-color-scheme: dark) {
  .legal-page { color: #e2e8f0; }
  .legal-page h1, .legal-page h2, .legal-page h3, .legal-page h4 { color: #cbd5e1; }
  .legal-note { background: #1e293b; border-color: #334155; }
  .legal-card { background: #0f172a; border-color: #334155; }
}
`.trim();

/**
 * Render a resolved document as an HTML fragment (no `<html>` wrapper).
 *
 * Pair it with {@link LEGAL_CSS}, or pass `{ standalone: true }` for a
 * complete page with the stylesheet inlined.
 */
export function toHtml(doc: LegalDoc, opts: { standalone?: boolean } = {}): string {
  const body =
    `<main class="legal-page">` +
    `<h1>${escapeHtml(doc.title)}</h1>` +
    `<p><strong>Revised Date: ${escapeHtml(String(doc.tokens.lastRevisedDate))}</strong></p>` +
    doc.sections
      .map((section, index) =>
        renderSection(section, doc.features.numbered ? `${index + 1}.` : '', 0),
      )
      .join('') +
    `</main>`;

  if (!opts.standalone) return body;
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escapeHtml(doc.title)}</title><style>${LEGAL_CSS}</style></head>` +
    `<body>${body}</body></html>`
  );
}

/** Resolve options and render HTML in one call. */
export function renderHtml(
  options: LegalDocOptions = {},
  opts: { standalone?: boolean } = {},
): string {
  return toHtml(resolveLegalDoc(options), opts);
}
