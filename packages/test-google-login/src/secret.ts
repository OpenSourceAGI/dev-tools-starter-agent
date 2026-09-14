/**
 * Shared-secret comparison, in a form that runs in both halves of this package.
 *
 * `node:crypto.timingSafeEqual` would do, and the Worker could reach it through
 * `nodejs_compat` — but this is twenty lines, needs no compatibility flag, and
 * the Worker half is deliberately free of Node builtins so its bundle stays a
 * Worker bundle. Hence the hand-rolled compare.
 */

const encoder = new TextEncoder();

/**
 * Compare two secrets without leaking their contents through timing.
 *
 * A length mismatch is answered in the same shape as a content mismatch — the
 * loop always runs over the expected value's full length — so an attacker
 * learns neither the length nor the position of the first wrong byte.
 *
 * @param supplied what the caller presented (`null`/`undefined` is a miss, not a throw)
 * @param expected the configured secret (empty or unset is always a miss)
 */
export function constantTimeEqual(
  supplied: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  // An unset expected secret must never match anything, including "". Checking
  // it first is safe: its value is configuration, not attacker-controlled.
  if (!expected) return false;
  if (supplied == null) return false;

  const a = encoder.encode(supplied);
  const b = encoder.encode(expected);

  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i += 1) {
    // Index past the end of `a` reads `undefined`; `| 0` turns that into 0 so the
    // comparison stays arithmetic and the loop keeps its constant shape.
    diff |= (a[i] ?? 0xff_ff) ^ (b[i] as number);
  }

  return diff === 0;
}

/** Header every request to the Worker half must carry. */
export const AUTH_HEADER = "x-test-auth-secret";

/**
 * Whether a request presented the configured secret.
 *
 * Returns `false` when the secret is not configured at all, so a Worker deployed
 * without `TEST_AUTH_SECRET` set refuses every request rather than serving an
 * open browser to the internet.
 */
export function isAuthorized(
  headers: { get(name: string): string | null },
  expected: string | null | undefined,
): boolean {
  return constantTimeEqual(headers.get(AUTH_HEADER), expected);
}
