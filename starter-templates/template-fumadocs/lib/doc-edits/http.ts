/**
 * @file http.ts
 * @description Small helpers shared by the doc-edits API routes.
 */
import { source } from '@/lib/fumadocs/source';

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Resolves a `a/b` slug string to its docs page, or null. */
export function findPage(slug: unknown) {
  if (typeof slug !== 'string') return null;
  const slugs = slug.split('/').filter(Boolean);
  return source.getPage(slugs) ?? null;
}

/** Reads a JSON body, rejecting other content types so forms on other sites can't post here. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.includes('application/json')) return null;
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
