/**
 * The parts of storage-state handling that touch nothing but data.
 *
 * Split out from `storage-state.ts` for one concrete reason: the Cloudflare Worker
 * half of this package validates, summarises and redacts storage states inside a
 * Worker isolate, where `node:fs` does not exist. Anything the Worker needs lives
 * here; anything that reads or writes a file lives next door and re-exports this
 * module, so callers on the Node side see one surface.
 *
 * Keep it that way — a single `node:` import in this file makes the Worker bundle
 * fail to start, and it fails at deploy time rather than in a test.
 */
import type {
  SameSite,
  StorageState,
  StorageStateCookie,
  StorageStateOrigin,
  StorageStateSummary,
} from "./types.js";

/** Playwright's sentinel for "dies with the browser". Not a timestamp. */
export const SESSION_COOKIE_EXPIRES = -1;

const SAME_SITE: SameSite[] = ["Strict", "Lax", "None"];

const GOOGLE_DOMAINS = ["google.com", "accounts.google.com", "googleusercontent.com", "gstatic.com"];


/** Thrown when a state file exists but is not a storage state. */
export class InvalidStorageStateError extends Error {
  constructor(reason: string) {
    super(`Not a Playwright storage state: ${reason}`);
    this.name = "InvalidStorageStateError";
  }
}

function asSameSite(value: unknown): SameSite {
  if (typeof value === "string") {
    const match = SAME_SITE.find((candidate) => candidate.toLowerCase() === value.toLowerCase());
    if (match) return match;
  }
  // Chrome's own default for a cookie that arrived without the attribute.
  return "Lax";
}

function parseCookie(raw: unknown, index: number): StorageStateCookie {
  if (typeof raw !== "object" || raw === null) {
    throw new InvalidStorageStateError(`cookies[${index}] is not an object`);
  }

  const cookie = raw as Record<string, unknown>;
  if (typeof cookie.name !== "string" || typeof cookie.value !== "string") {
    throw new InvalidStorageStateError(`cookies[${index}] has no name/value pair`);
  }
  if (typeof cookie.domain !== "string" || cookie.domain === "") {
    throw new InvalidStorageStateError(`cookies[${index}] (${cookie.name}) has no domain`);
  }

  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: typeof cookie.path === "string" ? cookie.path : "/",
    expires: typeof cookie.expires === "number" ? cookie.expires : SESSION_COOKIE_EXPIRES,
    httpOnly: cookie.httpOnly === true,
    secure: cookie.secure === true,
    sameSite: asSameSite(cookie.sameSite),
  };
}

function parseOrigin(raw: unknown, index: number): StorageStateOrigin {
  if (typeof raw !== "object" || raw === null) {
    throw new InvalidStorageStateError(`origins[${index}] is not an object`);
  }

  const origin = raw as Record<string, unknown>;
  if (typeof origin.origin !== "string" || origin.origin === "") {
    throw new InvalidStorageStateError(`origins[${index}] has no origin`);
  }

  const entries = Array.isArray(origin.localStorage) ? origin.localStorage : [];

  return {
    origin: origin.origin,
    localStorage: entries.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const { name, value } = entry as Record<string, unknown>;
      if (typeof name !== "string") return [];
      return [{ name, value: typeof value === "string" ? value : String(value ?? "") }];
    }),
  };
}

/**
 * Validate and normalize a parsed storage state.
 *
 * Normalizing rather than trusting: a state file may have been written by an
 * older Playwright, hand-edited, or produced by the Puppeteer half of this
 * package, and a missing `path` or a lowercase `sameSite` should not fail a
 * suite three calls later with an opaque CDP error.
 */
export function normalizeStorageState(raw: unknown): StorageState {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new InvalidStorageStateError("top level is not an object");
  }

  const state = raw as Record<string, unknown>;
  const cookies = state.cookies;
  const origins = state.origins;

  if (cookies !== undefined && !Array.isArray(cookies)) {
    throw new InvalidStorageStateError("`cookies` is present but not an array");
  }
  if (origins !== undefined && !Array.isArray(origins)) {
    throw new InvalidStorageStateError("`origins` is present but not an array");
  }
  if (cookies === undefined && origins === undefined) {
    throw new InvalidStorageStateError("neither `cookies` nor `origins` is present");
  }

  return {
    cookies: (cookies ?? []).map(parseCookie),
    origins: (origins ?? []).map(parseOrigin),
  };
}

/** Parse JSON text into a validated storage state. */
export function parseStorageState(text: string): StorageState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new InvalidStorageStateError(`not valid JSON (${(error as Error).message})`);
  }
  return normalizeStorageState(parsed);
}


/** Is this domain Google's, rather than the app under test's? */
export function isGoogleDomain(domain: string): boolean {
  const bare = domain.replace(/^\./, "").toLowerCase();
  return GOOGLE_DOMAINS.some((google) => bare === google || bare.endsWith(`.${google}`));
}

/** Cookies that carry an expiry, i.e. everything but session cookies. */
function expiringCookies(state: StorageState): StorageStateCookie[] {
  return state.cookies.filter((cookie) => cookie.expires > 0);
}

/**
 * Everything worth knowing about a state file, with no value from it included.
 *
 * `now` is injectable because every assertion about expiry otherwise depends on
 * the wall clock, which makes for a test suite that passes until it doesn't.
 *
 * @param now milliseconds since epoch. Defaults to `Date.now()`.
 */
export function summarizeStorageState(
  state: StorageState,
  options: { now?: number } = {},
): StorageStateSummary {
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const expiring = expiringCookies(state);

  const earliestExpiry =
    expiring.length > 0 ? Math.min(...expiring.map((cookie) => cookie.expires)) : null;

  const sessionCookies = state.cookies.length - expiring.length;
  // A session cookie has no expiry to have passed, so a state that is *only*
  // session cookies is not "expired" — it is simply not portable to a new
  // browser. Calling it expired would send people re-capturing state that is fine.
  const expired = expiring.length > 0 && expiring.every((cookie) => cookie.expires <= nowSeconds);

  const live = state.cookies.filter(
    (cookie) => cookie.expires === SESSION_COOKIE_EXPIRES || cookie.expires > nowSeconds,
  );

  return {
    cookieCount: state.cookies.length,
    originCount: state.origins.length,
    domains: [...new Set(state.cookies.map((cookie) => cookie.domain))].sort(),
    cookieNames: [...new Set(state.cookies.map((cookie) => cookie.name))].sort(),
    localStorageKeys: Object.fromEntries(
      state.origins.map((origin) => [origin.origin, origin.localStorage.map((entry) => entry.name).sort()]),
    ),
    sessionCookies,
    earliestExpiry,
    expiresInSeconds: earliestExpiry === null ? null : earliestExpiry - nowSeconds,
    expired,
    usable: live.length > 0,
    hasGoogleCookies: state.cookies.some((cookie) => isGoogleDomain(cookie.domain)),
  };
}

/**
 * Cookies that expire within `withinMs` — the warning before the failure.
 *
 * Worth running at the start of a suite: "3 cookies expire in 40 minutes" in the
 * log beats a flaky-looking selector timeout at minute 41.
 */
export function findExpiringCookies(
  state: StorageState,
  options: { now?: number; withinMs?: number } = {},
): StorageStateCookie[] {
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const withinSeconds = Math.floor((options.withinMs ?? 60 * 60 * 1000) / 1000);

  return expiringCookies(state).filter((cookie) => cookie.expires - nowSeconds <= withinSeconds);
}

/**
 * The same state with every secret replaced by a description of its length.
 *
 * Shape, names, domains, flags and expiries survive; cookie values and
 * `localStorage` values do not. This is the only form of a state file that is
 * safe to print, log, attach to an issue or return over HTTP — and having it
 * means the answer to "can I see the state file?" is yes, this one.
 */
export function redactStorageState(state: StorageState): StorageState {
  const redact = (value: string) => `«redacted ${value.length} chars»`;

  return {
    cookies: state.cookies.map((cookie) => ({ ...cookie, value: redact(cookie.value) })),
    origins: state.origins.map((origin) => ({
      origin: origin.origin,
      localStorage: origin.localStorage.map((entry) => ({ name: entry.name, value: redact(entry.value) })),
    })),
  };
}

