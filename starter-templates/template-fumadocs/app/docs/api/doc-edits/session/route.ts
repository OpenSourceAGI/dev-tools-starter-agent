/**
 * @file route.ts
 * @description Admin sign-in (POST) and sign-out (DELETE) for doc editing.
 */
import { cookies } from 'next/headers';
import { checkAdminCredentials, createSessionToken } from '@/lib/doc-edits/auth';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, isAdminLoginConfigured } from '@/lib/doc-edits/config';
import { jsonError, readJson, str } from '@/lib/doc-edits/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminLoginConfigured()) {
    return jsonError(503, 'Admin sign-in is not configured on this site');
  }
  const body = await readJson(request);
  const email = str(body?.email, 320).trim().toLowerCase();
  const password = str(body?.password, 1024);
  if (!checkAdminCredentials(email, password)) {
    return jsonError(401, 'Wrong email or password');
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(email), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return Response.json({ email });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
