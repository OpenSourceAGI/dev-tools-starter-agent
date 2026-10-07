/**
 * @file route.ts
 * @description POST an edited page body. Signed-in admins publish it as an
 * override; everyone else files it as a pending suggestion.
 */
import { getAdminEmail } from '@/lib/doc-edits/auth';
import { LIMITS } from '@/lib/doc-edits/config';
import { findPage, jsonError, readJson, str } from '@/lib/doc-edits/http';
import { getEditableMarkdown, revalidateDocPage } from '@/lib/doc-edits/render';
import { getDocEditStore } from '@/lib/doc-edits/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError(400, 'Expected a JSON body');

  const page = findPage(body.slug);
  if (!page) return jsonError(404, 'Page not found');

  if (typeof body.markdown !== 'string' || !body.markdown.trim()) {
    return jsonError(400, 'The page cannot be empty');
  }
  if (body.markdown.length > LIMITS.markdownChars) {
    return jsonError(413, 'The page is too long');
  }

  const slug = page.slugs.join('/');
  const store = getDocEditStore();
  const { markdown: baseMarkdown } = await getEditableMarkdown(page);
  if (body.markdown === baseMarkdown) return jsonError(400, 'Nothing changed');

  const now = new Date().toISOString();
  const adminEmail = await getAdminEmail();

  if (adminEmail) {
    await store.setOverride({ slug, markdown: body.markdown, updatedAt: now, updatedBy: adminEmail });
    revalidateDocPage(slug);
    return Response.json({ status: 'published' });
  }

  const pending = await store.listSuggestions('pending');
  if (pending.length >= LIMITS.pendingSuggestions) {
    return jsonError(429, 'Too many suggestions are waiting for review. Try again later.');
  }

  await store.addSuggestion({
    id: crypto.randomUUID(),
    slug,
    pageTitle: page.data.title ?? slug,
    baseMarkdown,
    markdown: body.markdown,
    note: str(body.note, LIMITS.noteChars).trim(),
    author: str(body.author, LIMITS.nameChars).trim() || 'Anonymous',
    status: 'pending',
    createdAt: now,
  });
  return Response.json({ status: 'suggested' });
}
