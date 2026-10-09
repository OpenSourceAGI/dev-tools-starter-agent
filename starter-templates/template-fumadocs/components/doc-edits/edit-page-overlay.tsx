/**
 * @file edit-page-overlay.tsx
 * @description Full-screen overlay that edits the current docs page in the
 * reason editor. Signed-in admins publish straight to the page; everyone else
 * submits a suggestion to the moderation queue at `/docs-admin`.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminSignIn } from './admin-sign-in';
import { docEditsApi, type PageSource } from './api';
import MarkdownEditor from './markdown-editor';
import { htmlToMarkdown } from './markdown';

export interface EditPageOverlayProps {
  slug: string;
  title: string;
  onClose: () => void;
}

type Result = { tone: 'ok' | 'error'; message: string };

export default function EditPageOverlay({ slug, title, onClose }: EditPageOverlayProps) {
  const router = useRouter();
  const [source, setSource] = useState<PageSource>();
  const [loadError, setLoadError] = useState<string>();
  const [showSignIn, setShowSignIn] = useState(false);
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>();
  const html = useRef<string | null>(null);

  const load = useCallback(() => {
    docEditsApi.source(slug).then(setSource, (err: Error) => setLoadError(err.message));
  }, [slug]);

  useEffect(load, [load]);

  const requestClose = useCallback(() => {
    if (html.current !== null && !window.confirm('Discard your changes to this page?')) return;
    onClose();
  }, [onClose]);

  // Lock page scroll behind the overlay and close on Escape.
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [requestClose]);

  const isAdmin = !!source?.adminEmail;

  async function submit() {
    if (html.current === null) {
      setResult({ tone: 'error', message: 'Make a change first.' });
      return;
    }
    setBusy(true);
    setResult(undefined);
    try {
      const { status } = await docEditsApi.submit({
        slug,
        markdown: htmlToMarkdown(html.current),
        note,
        author,
      });
      html.current = null;
      if (status === 'published') {
        router.refresh();
        onClose();
      } else {
        setResult({ tone: 'ok', message: 'Thanks! Your suggestion was sent to the moderators for review.' });
      }
    } catch (err) {
      setResult({ tone: 'error', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await docEditsApi.signOut();
    load();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${title}`}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-fd-background/80 p-0 backdrop-blur-sm sm:p-6"
    >
      <div className="flex w-full max-w-5xl flex-col overflow-hidden border border-fd-border bg-fd-card text-fd-card-foreground shadow-2xl sm:rounded-xl">
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-fd-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">Edit “{title}”</h2>
            <p className="text-xs text-fd-muted-foreground">
              {isAdmin ? (
                <>
                  <ShieldCheck className="mr-1 inline size-3.5" />
                  Signed in as {source?.adminEmail} — saving publishes immediately.{' '}
                  <button className="underline" onClick={signOut}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  Suggesting changes — a moderator reviews them before they go live.
                  {source?.adminLoginConfigured && !showSignIn && (
                    <>
                      {' '}
                      <button className="underline" onClick={() => setShowSignIn(true)}>
                        Admin sign-in
                      </button>
                    </>
                  )}
                </>
              )}
              {source?.isOverride && ' This page has published edits.'}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close editor" onClick={requestClose}>
            <X />
          </Button>
          {showSignIn && !isAdmin && (
            <div className="w-full">
              <AdminSignIn
                onSignedIn={() => {
                  setShowSignIn(false);
                  load();
                }}
              />
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1">
          {loadError ? (
            <p className="p-6 text-sm text-red-600">Couldn’t load this page: {loadError}</p>
          ) : !source ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-fd-muted-foreground" />
            </div>
          ) : (
            <MarkdownEditor
              initialMarkdown={source.markdown}
              onChange={(next) => {
                html.current = next;
              }}
            />
          )}
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-fd-border px-4 py-3">
          {!isAdmin && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="h-8 rounded-md border border-fd-border bg-fd-background px-2 text-sm sm:w-48"
                placeholder="Your name (optional)"
                maxLength={120}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
              <input
                className="h-8 flex-1 rounded-md border border-fd-border bg-fd-background px-2 text-sm"
                placeholder="What did you change, and why? (optional)"
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            {result && (
              <p className={`mr-auto text-sm ${result.tone === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {result.message}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={requestClose}>
              {result?.tone === 'ok' ? 'Close' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={submit} disabled={busy || !source}>
              {busy && <Loader2 className="animate-spin" />}
              {isAdmin ? 'Publish changes' : 'Suggest changes'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
