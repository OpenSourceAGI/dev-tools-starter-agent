import type { Block, LegalDoc, LegalDocOptions, ListItem, Section } from '../types';
import { resolveLegalDoc } from '../resolve';

function listLines(items: ListItem[], ordered: boolean, depth: number): string[] {
  const indent = '    '.repeat(depth);
  return items.flatMap((item, index) => {
    const marker = ordered ? `${index + 1}.` : '-';
    if (typeof item === 'string') return [`${indent}${marker} ${item}`];
    return [
      `${indent}${marker} ${item.text}`,
      ...(item.items ? listLines(item.items, ordered, depth + 1) : []),
    ];
  });
}

function blockLines(block: Block): string[] {
  switch (block.type) {
    case 'p':
      return [block.text, ''];
    case 'ol':
    case 'ul':
      return [
        ...(block.lead ? [block.lead, ''] : []),
        ...listLines(block.items, block.type === 'ol', 0),
        '',
      ];
    case 'cards':
      return block.items.flatMap((card) => [
        card.title,
        ...(card.text ? [card.text] : []),
        ...(card.items ?? []).map((i) => `- ${i}`),
        '',
      ]);
    case 'note':
      return [
        ...(block.title ? [block.title] : []),
        ...(block.text ? [block.text] : []),
        ...(block.items ? listLines(block.items, false, 0) : []),
        '',
      ];
  }
}

function sectionLines(section: Section, label: string): string[] {
  return [
    `${label ? `${label} ` : ''}${section.title}`.toUpperCase(),
    '',
    ...(section.blocks?.flatMap(blockLines) ?? []),
    ...(section.subsections?.flatMap((sub, i) =>
      sectionLines(sub, label ? `${label.replace(/\.$/, '')}.${i + 1}` : ''),
    ) ?? []),
  ];
}

/**
 * Render a resolved document as plain text — for an email, a CLI `--print`,
 * or an in-app agreement dialog with no markup engine.
 */
export function toPlainText(doc: LegalDoc): string {
  const lines = [
    doc.title.toUpperCase(),
    `Revised Date: ${doc.tokens.lastRevisedDate}`,
    '',
    ...doc.sections.flatMap((section, index) =>
      sectionLines(section, doc.features.numbered ? `${index + 1}.` : ''),
    ),
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** Resolve options and render plain text in one call. */
export function renderText(options: LegalDocOptions = {}): string {
  return toPlainText(resolveLegalDoc(options));
}
