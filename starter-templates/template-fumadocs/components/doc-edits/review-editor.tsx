/**
 * @file review-editor.tsx
 * @description Lazily-loaded editor an admin uses to touch up a suggestion before approving it.
 */
'use client';

import MarkdownEditor from './markdown-editor';
import { htmlToMarkdown } from './markdown';

export default function ReviewEditor({
  initialMarkdown,
  onChange,
}: {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}) {
  return <MarkdownEditor initialMarkdown={initialMarkdown} onChange={(html) => onChange(htmlToMarkdown(html))} />;
}
