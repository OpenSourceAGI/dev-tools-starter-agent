/**
 * @file route.ts
 * @description DELETE a page override, restoring the page's source file.
 */
import { getAdminEmail } from '@/lib/doc-edits/auth';
import { jsonError } from '@/lib/doc-edits/http';
import { revalidateDocPage } from '@/lib/doc-edits/render';
import { getDocEditStore } from '@/lib/doc-edits/store';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  if (!(await getAdminEmail())) return jsonError(401, 'Sign in as an admin first');

  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (!(await getDocEditStore().deleteOverride(slug))) return jsonError(404, 'No override for that page');
  revalidateDocPage(slug);
  return Response.json({ ok: true });
}
