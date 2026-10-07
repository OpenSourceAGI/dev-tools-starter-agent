/**
 * @file page.tsx
 * @description Moderator panel for in-page doc edits: review pending
 * suggestions and revert published overrides. Admin-only.
 */
import type { Metadata } from 'next';
import { getAdminEmail } from '@/lib/doc-edits/auth';
import { isAdminLoginConfigured } from '@/lib/doc-edits/config';
import { getEditableMarkdown } from '@/lib/doc-edits/render';
import { getDocEditStore } from '@/lib/doc-edits/store';
import { source } from '@/lib/fumadocs/source';
import { AdminPanel, AdminSignInGate } from '@/components/doc-edits/admin-panel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Docs moderation',
  robots: { index: false, follow: false },
};

export default async function DocsAdminPage() {
  const adminEmail = await getAdminEmail();

  if (!adminEmail) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="mb-2 text-2xl font-semibold">Docs moderation</h1>
        {isAdminLoginConfigured() ? (
          <>
            <p className="mb-6 text-sm text-fd-muted-foreground">
              Sign in with an admin email to review suggested edits.
            </p>
            <AdminSignInGate />
          </>
        ) : (
          <p className="text-sm text-fd-muted-foreground">
            Admin sign-in is off. Set <code>DOC_EDITS_ADMIN_EMAILS</code>,{' '}
            <code>DOC_EDITS_ADMIN_PASSWORD</code> and <code>DOC_EDITS_SECRET</code> to enable it.
          </p>
        )}
      </main>
    );
  }

  const store = getDocEditStore();
  const [pending, all, overrides] = await Promise.all([
    store.listSuggestions('pending'),
    store.listSuggestions(),
    store.listOverrides(),
  ]);

  // Flag suggestions written against a version of the page that has since changed.
  const suggestions = await Promise.all(
    pending.map(async (suggestion) => {
      const page = source.getPage(suggestion.slug.split('/').filter(Boolean));
      const current = page ? (await getEditableMarkdown(page)).markdown : null;
      return {
        ...suggestion,
        url: page?.url ?? null,
        stale: current !== null && current !== suggestion.baseMarkdown,
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <AdminPanel
        adminEmail={adminEmail}
        suggestions={suggestions}
        reviewed={all.filter((s) => s.status !== 'pending').slice(0, 20)}
        overrides={overrides.map((o) => ({
          ...o,
          url: source.getPage(o.slug.split('/').filter(Boolean))?.url ?? null,
        }))}
      />
    </main>
  );
}
