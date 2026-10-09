/**
 * @file admin-panel.tsx
 * @description Client side of `/docs-admin`: the review queue and published overrides.
 */
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocOverride, DocSuggestion } from '@/lib/doc-edits/store';
import { AdminSignIn } from './admin-sign-in';
import { docEditsApi } from './api';
import { diffLines } from './line-diff';

// The editor only loads when an admin chooses to touch up a suggestion.
const ReviewEditor = dynamic(() => import('./review-editor'), {
  ssr: false,
  loading: () => <Loader2 className="m-4 size-5 animate-spin text-fd-muted-foreground" />,
});

export type PendingSuggestion = DocSuggestion & { url: string | null; stale: boolean };
export type PublishedOverride = DocOverride & { url: string | null };

export function AdminSignInGate() {
  const router = useRouter();
  return <AdminSignIn onSignedIn={() => router.refresh()} />;
}

export function AdminPanel({
  adminEmail,
  suggestions,
  reviewed,
  overrides,
}: {
  adminEmail: string;
  suggestions: PendingSuggestion[];
  reviewed: DocSuggestion[];
  overrides: PublishedOverride[];
}) {
  const router = useRouter();

  async function signOut() {
    await docEditsApi.signOut();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold">Docs moderation</h1>
        <span className="text-sm text-fd-muted-foreground">{adminEmail}</span>
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Pending suggestions ({suggestions.length})</h2>
        {suggestions.length === 0 && <p className="text-sm text-fd-muted-foreground">Nothing to review.</p>}
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Published edits ({overrides.length})</h2>
        {overrides.length === 0 && (
          <p className="text-sm text-fd-muted-foreground">Every page shows its source file.</p>
        )}
        {overrides.map((override) => (
          <OverrideRow key={override.slug} override={override} />
        ))}
      </section>

      {reviewed.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Recently reviewed</h2>
          <ul className="text-sm text-fd-muted-foreground">
            {reviewed.map((s) => (
              <li key={s.id}>
                <span className={s.status === 'approved' ? 'text-green-600' : 'text-red-600'}>{s.status}</span>{' '}
                “{s.pageTitle}” by {s.author} — {s.reviewedBy}, {formatDate(s.reviewedAt)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: PendingSuggestion }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const edited = useRef<string | null>(null);
  const diff = useMemo(
    () => diffLines(suggestion.baseMarkdown, suggestion.markdown),
    [suggestion.baseMarkdown, suggestion.markdown],
  );

  async function review(action: 'approve' | 'reject') {
    if (action === 'approve' && suggestion.stale) {
      const ok = window.confirm(
        'This page changed after the suggestion was made. Approving replaces the whole page with the suggested version. Continue?',
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await docEditsApi.review(suggestion.id, action, action === 'approve' ? (edited.current ?? undefined) : undefined);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-fd-border bg-fd-card p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-semibold">
          {suggestion.url ? <Link href={suggestion.url}>{suggestion.pageTitle}</Link> : suggestion.pageTitle}
        </h3>
        <span className="text-xs text-fd-muted-foreground">
          by {suggestion.author} · {formatDate(suggestion.createdAt)}
        </span>
      </div>
      {suggestion.note && <p className="text-sm">{suggestion.note}</p>}
      {suggestion.stale && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="size-3.5" />
          The page has changed since this was suggested.
        </p>
      )}

      {editing ? (
        <div className="h-[60vh] overflow-hidden rounded-lg border border-fd-border">
          <ReviewEditor initialMarkdown={suggestion.markdown} onChange={(md) => (edited.current = md)} />
        </div>
      ) : (
        <pre className="max-h-96 overflow-auto rounded-lg border border-fd-border bg-fd-background p-3 text-xs leading-5">
          {diff.map((line, i) => (
            <div
              key={i}
              className={
                line.type === 'add'
                  ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                  : line.type === 'remove'
                    ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                    : 'text-fd-muted-foreground'
              }
            >
              {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
              {line.text}
            </div>
          ))}
        </pre>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing((v) => !v)}>
          {editing ? 'Show diff' : 'Edit before approving'}
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => review('reject')}>
          Reject
        </Button>
        <Button size="sm" disabled={busy} onClick={() => review('approve')}>
          {editing ? 'Approve with my edits' : 'Approve & publish'}
        </Button>
      </div>
    </article>
  );
}

function OverrideRow({ override }: { override: PublishedOverride }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function revert() {
    if (!window.confirm('Revert this page to its source file? The published edit is deleted.')) return;
    setBusy(true);
    try {
      await docEditsApi.revert(override.slug);
      router.refresh();
    } catch (err) {
      window.alert((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-fd-border px-4 py-2 text-sm">
      <span className="flex-1 font-medium">
        {override.url ? <Link href={override.url}>/{override.slug ? `docs/${override.slug}` : 'docs'}</Link> : override.slug}
      </span>
      <span className="text-xs text-fd-muted-foreground">
        {override.updatedBy} · {formatDate(override.updatedAt)}
      </span>
      <Button variant="outline" size="sm" disabled={busy} onClick={revert}>
        Revert to source
      </Button>
    </div>
  );
}

function formatDate(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleString() : '';
}
