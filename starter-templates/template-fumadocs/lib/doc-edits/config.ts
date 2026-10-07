/**
 * @file config.ts
 * @description Environment-driven settings for in-page doc editing.
 *
 * | Variable | Purpose |
 * | --- | --- |
 * | `DOC_EDITS_ADMIN_EMAILS` | Comma-separated admin emails. Admins publish edits directly as overrides. |
 * | `DOC_EDITS_ADMIN_PASSWORD` | Shared password for the admin sign-in form. |
 * | `DOC_EDITS_SECRET` | Key that signs the admin session cookie (32+ random chars). |
 * | `DOC_EDITS_DATA_FILE` | Where overrides and suggestions are stored. Default `.data/doc-edits.json`. |
 *
 * Without `DOC_EDITS_ADMIN_EMAILS`, `DOC_EDITS_ADMIN_PASSWORD` and `DOC_EDITS_SECRET`
 * nobody can sign in as admin, but anyone can still suggest changes.
 */
import { resolve } from 'path';

export const SESSION_COOKIE = 'doc_edits_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Upper bounds that keep anonymous suggestions from filling the store. */
export const LIMITS = {
  markdownChars: 200_000,
  noteChars: 2_000,
  nameChars: 120,
  pendingSuggestions: 500,
};

export function getAdminEmails(): string[] {
  return (process.env.DOC_EDITS_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminPassword(): string | undefined {
  return process.env.DOC_EDITS_ADMIN_PASSWORD || undefined;
}

export function getSessionSecret(): string | undefined {
  return process.env.DOC_EDITS_SECRET || undefined;
}

export function isAdminLoginConfigured(): boolean {
  return getAdminEmails().length > 0 && !!getAdminPassword() && !!getSessionSecret();
}

export function getDataFile(): string {
  // turbopackIgnore: a runtime data path, not something the build should trace.
  return resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DOC_EDITS_DATA_FILE || '.data/doc-edits.json');
}
