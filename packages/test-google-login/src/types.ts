/**
 * The shapes this package works in.
 *
 * `StorageState` is Playwright's `storageState()` output, declared here rather
 * than imported from `@playwright/test` on purpose: the Worker half of this
 * package reads the same file inside a Cloudflare isolate, where Playwright is
 * not installed and cannot be. Keeping the type local is what lets one state
 * file be produced by Playwright and consumed by Puppeteer.
 */

/** Playwright's `sameSite` spelling. Puppeteer/CDP uses the same three words. */
export type SameSite = "Strict" | "Lax" | "None";

/** One cookie as Playwright writes it into a storage-state file. */
export interface StorageStateCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  /**
   * Unix seconds, **not** milliseconds — and `-1` for a session cookie, which is
   * the single most common way to get expiry arithmetic wrong here.
   */
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSite;
}

/** `localStorage` for one origin. Playwright groups storage by origin, not by domain. */
export interface StorageStateOrigin {
  origin: string;
  localStorage: { name: string; value: string }[];
}

/**
 * A whole persisted browser session: cookies plus per-origin `localStorage`.
 *
 * **This is a credential.** A populated instance of this type grants whatever the
 * signed-in test account can do, which is why nothing in this package logs one,
 * returns one over HTTP, or writes one anywhere but a 0600 file under
 * `playwright/.auth/`.
 */
export interface StorageState {
  cookies: StorageStateCookie[];
  origins: StorageStateOrigin[];
}

/** What a cookie looks like to Puppeteer's `setCookie`/`cookies` (CDP naming). */
export interface PuppeteerCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  /** Unix seconds. Absent (not `-1`) for a session cookie. */
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: SameSite;
  /** CDP sets this on read; it is the inverse of "has an expiry". */
  session?: boolean;
}

/**
 * What `summarizeStorageState` reports — everything you would want to know about
 * a state file without ever seeing a value from it. Safe to print and to log.
 */
export interface StorageStateSummary {
  cookieCount: number;
  originCount: number;
  /** Cookie domains, deduped and sorted. Names and values are never included. */
  domains: string[];
  /** Cookie names, deduped and sorted — a name is not a secret, a value is. */
  cookieNames: string[];
  /** `localStorage` keys per origin, values omitted. */
  localStorageKeys: Record<string, string[]>;
  /** How many cookies carry no expiry and die with the browser. */
  sessionCookies: number;
  /** Earliest expiry among cookies that have one, as Unix seconds; `null` if none do. */
  earliestExpiry: number | null;
  /** Seconds until `earliestExpiry`; negative once it has passed. `null` if none do. */
  expiresInSeconds: number | null;
  /** True when every cookie that had an expiry has passed it. */
  expired: boolean;
  /** True when the state still has at least one cookie a browser would send. */
  usable: boolean;
  /** True when any cookie belongs to a Google domain. */
  hasGoogleCookies: boolean;
}

/** The minimum of a Puppeteer/Playwright `Page` that this package calls. */
export interface PageLike {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  evaluate<T>(fn: (...args: never[]) => T, ...args: unknown[]): Promise<T>;
  url(): string;
  setCookie?(...cookies: PuppeteerCookie[]): Promise<void>;
  cookies?(...urls: string[]): Promise<PuppeteerCookie[]>;
  deleteCookie?(...cookies: { name: string; domain?: string; path?: string }[]): Promise<void>;
}
