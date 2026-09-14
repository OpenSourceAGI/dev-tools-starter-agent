/**
 * CCCP authenticates with better-auth's cookie session, so the extension host
 * has to keep the `Set-Cookie` values a sign-in hands back and replay them as a
 * `Cookie` header on every later API call. These helpers do only that -- no
 * expiry or domain handling, because every cookie we store came from the one
 * server URL the user configured.
 */

/** Splits a `Set-Cookie` value down to its `name=value` pair, dropping attributes. */
function pairOf(setCookie: string): [name: string, pair: string] | undefined {
  const pair = setCookie.split(";", 1)[0]?.trim();
  if (!pair) return undefined;

  const separator = pair.indexOf("=");
  if (separator <= 0) return undefined;

  return [pair.slice(0, separator), pair];
}

/** True when the server told us to drop this cookie (`Max-Age=0` or a past expiry). */
function isDeletion(setCookie: string): boolean {
  const attributes = setCookie.split(";").slice(1).map((part) => part.trim().toLowerCase());

  if (attributes.some((attribute) => /^max-age=0*$/.test(attribute) || /^max-age=-/.test(attribute))) {
    return true;
  }

  const expires = attributes.find((attribute) => attribute.startsWith("expires="));
  if (expires) {
    const timestamp = Date.parse(expires.slice("expires=".length));
    if (!Number.isNaN(timestamp) && timestamp <= Date.now()) return true;
  }

  return false;
}

/**
 * Folds `Set-Cookie` response headers into an existing `Cookie` request header,
 * with the newly-set values winning. Returns an empty string once nothing is
 * left to send, which callers treat as "signed out".
 */
export function mergeCookies(existingCookieHeader: string | undefined, setCookies: readonly string[]): string {
  const jar = new Map<string, string>();

  for (const pair of (existingCookieHeader ?? "").split(";")) {
    const parsed = pairOf(pair);
    if (parsed) jar.set(parsed[0], parsed[1]);
  }

  for (const setCookie of setCookies) {
    const parsed = pairOf(setCookie);
    if (!parsed) continue;

    if (isDeletion(setCookie)) {
      jar.delete(parsed[0]);
    } else {
      jar.set(parsed[0], parsed[1]);
    }
  }

  return [...jar.values()].join("; ");
}

/** Reads `Set-Cookie` off a response across the runtimes that expose it differently. */
export function setCookiesOf(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };

  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  return raw ? [raw] : [];
}

/** True when the jar still carries a better-auth session token. */
export function hasSessionToken(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return /(^|;\s*)[\w.-]*session_token=[^;]+/i.test(cookieHeader);
}
