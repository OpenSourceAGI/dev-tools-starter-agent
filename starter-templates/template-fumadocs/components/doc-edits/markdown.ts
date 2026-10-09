/**
 * @file markdown.ts
 * @description Converts between a page's Markdown and the HTML the editor mounts.
 * Client-only: loaded with the editor overlay, never in the initial page bundle.
 */
import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.use(gfm);

/** Renders page Markdown to the HTML the editor opens with. */
export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return '';
  return marked.parse(markdown, { gfm: true, breaks: false, async: false });
}

/** Serializes the editor's HTML back to Markdown for saving. */
export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return '';
  return turndown.turndown(html).trim() + '\n';
}
