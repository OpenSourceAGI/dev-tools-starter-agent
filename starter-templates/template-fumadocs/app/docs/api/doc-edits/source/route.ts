/**
 * @file route.ts
 * @description GET the Markdown body the editor overlay opens for a page.
 */
import { getAdminEmail } from '@/lib/doc-edits/auth';
import { isAdminLoginConfigured } from '@/lib/doc-edits/config';
import { findPage, jsonError } from '@/lib/doc-edits/http';
import { getEditableMarkdown } from '@/lib/doc-edits/render';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const page = findPage(new URL(request.url).searchParams.get('slug') ?? '');
  if (!page) return jsonError(404, 'Page not found');

  const { markdown, override } = await getEditableMarkdown(page);
  return Response.json({
    slug: page.slugs.join('/'),
    title: page.data.title,
    markdown,
    isOverride: !!override,
    adminEmail: await getAdminEmail(),
    adminLoginConfigured: isAdminLoginConfigured(),
  });
}
