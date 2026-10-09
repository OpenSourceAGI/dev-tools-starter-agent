/**
 * @file route.ts
 * @description Admin review of one suggestion: approve (publish as the page
 * override, optionally with the admin's own edits) or reject.
 */
import { getAdminEmail } from '@/lib/doc-edits/auth';
import { LIMITS } from '@/lib/doc-edits/config';
import { jsonError, readJson } from '@/lib/doc-edits/http';
import { revalidateDocPage } from '@/lib/doc-edits/render';
import { getDocEditStore } from '@/lib/doc-edits/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) return jsonError(401, 'Sign in as an admin first');

  const { id } = await params;
  const body = await readJson(request);
  const action = body?.action;
  if (action !== 'approve' && action !== 'reject') return jsonError(400, 'Unknown action');

  const store = getDocEditStore();
  const suggestion = await store.getSuggestion(id);
  if (!suggestion) return jsonError(404, 'Suggestion not found');
  if (suggestion.status !== 'pending') return jsonError(409, `Already ${suggestion.status}`);

  const now = new Date().toISOString();
  if (action === 'approve') {
    const markdown =
      typeof body?.markdown === 'string' && body.markdown.trim() ? body.markdown : suggestion.markdown;
    if (markdown.length > LIMITS.markdownChars) return jsonError(413, 'The page is too long');
    await store.setOverride({ slug: suggestion.slug, markdown, updatedAt: now, updatedBy: adminEmail });
    revalidateDocPage(suggestion.slug);
  }

  const updated = await store.updateSuggestion(id, {
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewedAt: now,
    reviewedBy: adminEmail,
  });
  return Response.json({ suggestion: updated });
}
