/**
 * @file markdown-editor.tsx
 * @description The react-reason-editor surface, opened on a Markdown document.
 * Only ever imported from lazily-loaded modules, so the editor and its styles
 * stay out of the docs page bundle.
 */
'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  BubbleMenus,
  NovelEditor,
  RichTextToolbar,
  buildExtensions,
  createDefaultConfig,
} from 'react-reason-editor/editor-kit';
import 'react-reason-editor/style.css';
import { markdownToHtml } from './markdown';

// One shared extension set: toolbar, tables, images, code blocks, KaTeX, etc.
const EXTENSIONS = buildExtensions(createDefaultConfig());

export interface MarkdownEditorProps {
  initialMarkdown: string;
  /** Called with the editor's HTML on every change. */
  onChange: (html: string) => void;
}

export default function MarkdownEditor({ initialMarkdown, onChange }: MarkdownEditorProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const initialHtml = useMemo(() => markdownToHtml(initialMarkdown), [initialMarkdown]);

  return (
    <NovelEditor
      extensions={EXTENSIONS}
      initialContent={initialHtml}
      immediatelyRender={false}
      onUpdate={({ editor }) => onChange(editor.getHTML())}
    >
      {({ editor, EditorSurface }) => (
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 overflow-x-auto border-b border-fd-border">
            {editor && <RichTextToolbar theme={theme} setTheme={setTheme} />}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
            <EditorSurface />
          </div>
          {editor && <BubbleMenus />}
        </div>
      )}
    </NovelEditor>
  );
}
