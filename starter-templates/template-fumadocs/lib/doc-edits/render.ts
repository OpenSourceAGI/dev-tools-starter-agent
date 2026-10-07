/**
 * @file render.ts
 * @description Server helpers that read a page's editable body and render overrides.
 */
import { createCompiler } from '@fumadocs/mdx-remote';
import { revalidatePath } from 'next/cache';
import type { Page } from '@/lib/fumadocs/source';
import { getDocEditStore, type DocOverride } from './store';

/**
 * Overrides compile as plain Markdown (`format: 'md'`), not MDX: no imports,
 * JSX or `{expressions}` run, and raw HTML is dropped. They can come from an
 * approved anonymous suggestion, so they must never execute code.
 */
const compiler = createCompiler({ format: 'md' });

const compiled = new Map<string, ReturnType<typeof compiler.compile>>();

export function renderOverride(override: DocOverride) {
  const key = `${override.slug}@${override.updatedAt}`;
  let result = compiled.get(key);
  if (!result) {
    result = compiler.compile({ source: override.markdown });
    compiled.set(key, result);
    // Drop the oldest entry once the cache grows past what a docs site needs.
    if (compiled.size > 200) compiled.delete(compiled.keys().next().value!);
  }
  return result;
}

/** The Markdown body a page currently shows: its override if one exists, else the source file. */
export async function getEditableMarkdown(page: Page) {
  const override = await getDocEditStore().getOverride(page.slugs.join('/'));
  if (override) return { markdown: override.markdown, override };
  const processed = await page.data.getText('processed');
  return { markdown: cleanProcessedMarkdown(processed), override: null };
}

/**
 * Fumadocs' processed Markdown appends `[#id]` to headings; editors would show
 * that as text, and ids are re-derived from the heading anyway.
 */
function cleanProcessedMarkdown(markdown: string) {
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/^(#{1,6} .*?) \[#[^\]\s]+\]$/gm, '$1')
    .trim() + '\n';
}

/** Re-render a page (and its `.mdx` copy for LLMs) after its override changes. */
export function revalidateDocPage(slug: string) {
  const suffix = slug ? `/${slug}` : '';
  revalidatePath(`/docs${suffix}`);
  revalidatePath(`/docs/llms.mdx/docs${suffix}`);
  revalidatePath('/docs/llms-full.txt');
}
