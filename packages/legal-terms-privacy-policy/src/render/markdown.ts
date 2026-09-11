import type { Block, LegalDoc, LegalDocOptions, ListItem, Section } from '../types';
import { resolveLegalDoc } from '../resolve';

function listItems(items: ListItem[], ordered: boolean, depth: number): string[] {
  const indent = '  '.repeat(depth);
  return items.flatMap((item, index) => {
    const marker = ordered ? `${index + 1}.` : '-';
    if (typeof item === 'string') return [`${indent}${marker} ${item}`];
    return [
      `${indent}${marker} ${item.text}`,
      ...(item.items ? listItems(item.items, ordered, depth + 1) : []),
    ];
  });
}

function renderBlock(block: Block): string[] {
  switch (block.type) {
    case 'p':
      return [block.strong ? `**${block.text}**` : block.text, ''];
    case 'ol':
    case 'ul':
      return [
        ...(block.lead ? [block.lead, ''] : []),
        ...listItems(block.items, block.type === 'ol', 0),
        '',
      ];
    case 'cards':
      return block.items.flatMap((card) => [
        `**${card.title}**`,
        '',
        ...(card.text ? [card.text, ''] : []),
        ...(card.items ? [...card.items.map((i) => `- ${i}`), ''] : []),
      ]);
    case 'note':
      return [
        ...(block.title ? [`**${block.title}**`, ''] : []),
        ...(block.text ? [block.text, ''] : []),
        ...(block.items ? [...listItems(block.items, false, 0), ''] : []),
      ];
  }
}

function renderSection(section: Section, label: string, depth: number): string[] {
  const hashes = '#'.repeat(Math.min(depth + 2, 6));
  return [
    `${hashes} ${label ? `${label} ` : ''}${section.title}`,
    '',
    ...(section.blocks?.flatMap(renderBlock) ?? []),
    ...(section.subsections?.flatMap((sub, i) =>
      renderSection(sub, label ? `${label.replace(/\.$/, '')}.${i + 1}` : '', depth + 1),
    ) ?? []),
  ];
}

/**
 * Render a resolved document as GitHub-flavored Markdown.
 *
 * Useful for a `TERMS.md` in a repo, an MDX docs page, or a diffable snapshot
 * of the policy text in review.
 */
export function toMarkdown(doc: LegalDoc): string {
  const lines = [
    `# ${doc.title}`,
    '',
    `**Revised Date: ${doc.tokens.lastRevisedDate}**`,
    ...(doc.tokens.effectiveDate !== doc.tokens.lastRevisedDate
      ? [`**Effective Date: ${doc.tokens.effectiveDate}**`]
      : []),
    '',
    ...doc.sections.flatMap((section, index) =>
      renderSection(section, doc.features.numbered ? `${index + 1}.` : '', 0),
    ),
  ];
  // Collapse the blank lines each block appends into at most one.
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** Resolve options and render Markdown in one call. */
export function renderMarkdown(options: LegalDocOptions = {}): string {
  return toMarkdown(resolveLegalDoc(options));
}
