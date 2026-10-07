/**
 * @file api.ts
 * @description Browser-side calls to the doc-edits API routes.
 */
const BASE = '/docs/api/doc-edits';

export interface PageSource {
  slug: string;
  title: string;
  markdown: string;
  isOverride: boolean;
  adminEmail: string | null;
  adminLoginConfigured: boolean;
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: json === undefined ? rest.headers : { 'content-type': 'application/json', ...rest.headers },
    body: json === undefined ? rest.body : JSON.stringify(json),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data as T;
}

export const docEditsApi = {
  source: (slug: string) => call<PageSource>(`/source?slug=${encodeURIComponent(slug)}`),
  submit: (body: { slug: string; markdown: string; note?: string; author?: string }) =>
    call<{ status: 'published' | 'suggested' }>('', { method: 'POST', json: body }),
  signIn: (email: string, password: string) =>
    call<{ email: string }>('/session', { method: 'POST', json: { email, password } }),
  signOut: () => call<{ ok: true }>('/session', { method: 'DELETE' }),
  review: (id: string, action: 'approve' | 'reject', markdown?: string) =>
    call<unknown>(`/suggestions/${encodeURIComponent(id)}`, { method: 'POST', json: { action, markdown } }),
  revert: (slug: string) => call<{ ok: true }>(`/overrides?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }),
};
