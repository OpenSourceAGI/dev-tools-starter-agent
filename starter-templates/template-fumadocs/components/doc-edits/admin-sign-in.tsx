/**
 * @file admin-sign-in.tsx
 * @description Email + password form that signs in one of `DOC_EDITS_ADMIN_EMAILS`.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { docEditsApi } from './api';

const inputClass =
  'h-8 rounded-md border border-fd-border bg-fd-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

export function AdminSignIn({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      onSignedIn((await docEditsApi.signIn(email, password)).email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        className={inputClass}
        type="email"
        autoComplete="username"
        placeholder="Admin email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className={inputClass}
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" size="sm" disabled={busy}>
        Sign in
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
