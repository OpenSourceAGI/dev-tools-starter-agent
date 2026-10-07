/**
 * @file auth.ts
 * @description Admin session for doc editing: an HMAC-signed cookie holding the
 * admin email and an expiry. Uses Web Crypto so it runs on Node and Workers alike.
 */
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  getAdminEmails,
  getAdminPassword,
  getSessionSecret,
} from './config';

const encoder = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Buffer.from(signature).toString('base64url');
}

/** Constant-time string comparison, so a signature can't be guessed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export async function createSessionToken(email: string): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error('DOC_EDITS_SECRET is not set');
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${Buffer.from(email).toString('base64url')}.${expires}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

/** Returns the admin email the token was issued to, or null if it is invalid, expired or no longer an admin. */
export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret || !token) return null;
  const [emailPart, expiresPart, signature] = token.split('.');
  if (!emailPart || !expiresPart || !signature) return null;
  const expected = await hmac(secret, `${emailPart}.${expiresPart}`);
  if (!safeEqual(signature, expected)) return null;
  if (Number(expiresPart) < Date.now() / 1000) return null;
  const email = Buffer.from(emailPart, 'base64url').toString();
  return getAdminEmails().includes(email) ? email : null;
}

/** Checks a sign-in attempt against the configured admin emails and password. */
export function checkAdminCredentials(email: string, password: string): boolean {
  const adminPassword = getAdminPassword();
  if (!adminPassword || !getSessionSecret()) return false;
  const emailOk = getAdminEmails().includes(email.trim().toLowerCase());
  const passwordOk = safeEqual(password, adminPassword);
  return emailOk && passwordOk;
}

/** The signed-in admin's email for the current request, or null. */
export async function getAdminEmail(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
