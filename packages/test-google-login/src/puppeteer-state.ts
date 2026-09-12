/**
 * Carrying a Playwright storage state into a Puppeteer browser, and back out.
 *
 * This is what lets one captured session serve both halves of the package: you
 * sign in once with Playwright on your machine, and a Cloudflare Browser
 * Rendering Durable Object — which only speaks Puppeteer — replays the same
 * session against your deployed app.
 *
 * The two formats are close but not identical, and every difference is a way to
 * lose a session silently:
 *
 * - **Session cookies.** Playwright writes `expires: -1`; CDP reads `-1` as "this
 *   cookie expired in 1969" and drops it. The expiry must be *omitted* instead.
 * - **`sameSite`.** Playwright writes `Strict | Lax | None`, and CDP wants exactly
 *   those, capitalised. A lowercase value is rejected for the whole batch.
 * - **`localStorage` is per origin and needs a document.** There is no CDP call to
 *   write it blind — the page must be on the origin first, which means a
 *   navigation per origin, in order, before the app's own code runs.
 *
 * Every function takes the page as an argument rather than importing Puppeteer,
 * so all of this is unit-testable without a browser — and so the package keeps
 * its zero runtime dependencies.
 */
import { SESSION_COOKIE_EXPIRES } from "./state-core.js";
import type { PageLike, PuppeteerCookie, StorageState, StorageStateCookie } from "./types.js";

/**
 * Playwright cookies → Puppeteer/CDP cookies.
 *
 * The one transformation that matters: a session cookie loses its `expires` key
 * entirely rather than carrying `-1`.
 */
export function toPuppeteerCookies(state: StorageState): PuppeteerCookie[] {
  return state.cookies.map((cookie) => {
    const converted: PuppeteerCookie = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    };

    if (cookie.expires > 0) converted.expires = cookie.expires;

    return converted;
  });
}

/**
 * Puppeteer/CDP cookies → Playwright cookies.
 *
 * The inverse, plus the normalizations a CDP read needs: `session: true` or a
 * missing expiry becomes `-1`, and `sameSite` is re-capitalised (CDP has been
 * known to return `"unspecified"`, which is not one of the three).
 */
export function fromPuppeteerCookies(cookies: PuppeteerCookie[]): StorageStateCookie[] {
  return cookies.map((cookie) => {
    const hasExpiry = cookie.session !== true && typeof cookie.expires === "number" && cookie.expires > 0;

    const sameSite = ["Strict", "Lax", "None"].find(
      (candidate) => candidate.toLowerCase() === String(cookie.sameSite ?? "").toLowerCase(),
    );

    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || "/",
      expires: hasExpiry ? (cookie.expires as number) : SESSION_COOKIE_EXPIRES,
      httpOnly: cookie.httpOnly === true,
      secure: cookie.secure === true,
      sameSite: (sameSite as StorageStateCookie["sameSite"]) ?? "Lax",
    };
  });
}

/** The origins a state file carries `localStorage` for, in file order. */
export function storageStateOrigins(state: StorageState): string[] {
  return state.origins.map((origin) => origin.origin);
}

/**
 * Write one origin's `localStorage` into a page that is already on that origin.
 *
 * Exported because it is the half that can fail for reasons worth surfacing: a
 * page on `about:blank` or a cross-origin page throws `SecurityError`, and a
 * browser with storage disabled throws `QuotaExceededError`. Both are far easier
 * to read here than three steps later as a login screen.
 */
export async function applyLocalStorage(
  page: PageLike,
  entries: { name: string; value: string }[],
): Promise<void> {
  if (entries.length === 0) return;

  await page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runs in the page, not here
    ((items: { name: string; value: string }[]) => {
      for (const item of items) window.localStorage.setItem(item.name, item.value);
    }) as never,
    entries,
  );
}

export interface ApplyStorageStateOptions {
  /**
   * Only restore `localStorage` for these origins. Defaults to every origin in
   * the state.
   *
   * Worth narrowing: the state captured during a real Google sign-in also holds
   * `accounts.google.com` storage, and navigating a test browser to Google to
   * restore it is both slow and a way to trip Google's own bot checks. Pass your
   * app's origin and nothing else for the common case.
   */
  origins?: string[];
  /** Passed through to `page.goto` for each origin navigation. */
  gotoOptions?: Record<string, unknown>;
}

export interface ApplyStorageStateResult {
  cookiesSet: number;
  /** Origins whose `localStorage` was restored. */
  originsRestored: string[];
  /** Origins skipped, and why — a navigation that failed is not fatal on its own. */
  skipped: { origin: string; reason: string }[];
}

/**
 * Restore a whole captured session into a Puppeteer page.
 *
 * Cookies go in first and in one call — `setCookie` is variadic and a
 * cookie-at-a-time loop is a round trip each. Then one navigation per origin to
 * get a document that `localStorage` can be written through.
 *
 * A state file with no `origins` therefore costs no navigation at all, which is
 * the case for most apps: if your session lives in a cookie, this is a single
 * CDP call and you can `goto` wherever you actually wanted to go.
 */
export async function applyStorageState(
  page: PageLike,
  state: StorageState,
  options: ApplyStorageStateOptions = {},
): Promise<ApplyStorageStateResult> {
  const result: ApplyStorageStateResult = { cookiesSet: 0, originsRestored: [], skipped: [] };

  const cookies = toPuppeteerCookies(state);
  if (cookies.length > 0) {
    if (typeof page.setCookie !== "function") {
      throw new TypeError(
        "This page cannot set cookies — `page.setCookie` is missing. Puppeteer 23+ moved it to " +
          "`browserContext.setCookie`; pass a page from an older API, or set them on the context yourself.",
      );
    }
    await page.setCookie(...cookies);
    result.cookiesSet = cookies.length;
  }

  const wanted = options.origins;
  const origins = wanted
    ? state.origins.filter((origin) => wanted.includes(origin.origin))
    : state.origins;

  for (const origin of origins) {
    if (origin.localStorage.length === 0) {
      result.skipped.push({ origin: origin.origin, reason: "no localStorage entries" });
      continue;
    }

    try {
      // `domcontentloaded` rather than `load`: a document is all `localStorage`
      // needs, and waiting for every subresource of an unauthenticated page is
      // time spent on a page that is about to be navigated away from.
      await page.goto(origin.origin, { waitUntil: "domcontentloaded", ...options.gotoOptions });
      await applyLocalStorage(page, origin.localStorage);
      result.originsRestored.push(origin.origin);
    } catch (error) {
      // One unreachable origin must not lose the cookies that are already set —
      // those alone are usually enough to be signed in.
      result.skipped.push({ origin: origin.origin, reason: (error as Error).message });
    }
  }

  return result;
}

/**
 * Capture the current session out of a Puppeteer page, in Playwright's format.
 *
 * The mirror of {@link applyStorageState}: what a Worker produces here can be
 * dropped into `playwright/.auth/` and used by the local suite, and vice versa.
 *
 * `origins` must be given explicitly — `localStorage` can only be read from the
 * origin that owns it, so there is nothing to enumerate from. Defaults to the
 * page's current origin, which is the common case.
 */
export async function extractStorageState(
  page: PageLike,
  options: { origins?: string[]; gotoOptions?: Record<string, unknown> } = {},
): Promise<StorageState> {
  if (typeof page.cookies !== "function") {
    throw new TypeError("This page cannot read cookies — `page.cookies` is missing.");
  }

  const cookies = fromPuppeteerCookies(await page.cookies());

  const current = page.url();
  const origins = options.origins ?? (current && current !== "about:blank" ? [originOf(current)] : []);

  const captured: StorageState["origins"] = [];

  for (const origin of origins) {
    try {
      if (originOf(page.url()) !== origin) {
        await page.goto(origin, { waitUntil: "domcontentloaded", ...options.gotoOptions });
      }

      const localStorage = await page.evaluate(
        (() =>
          Object.keys(window.localStorage).map((name) => ({
            name,
            value: window.localStorage.getItem(name) ?? "",
          }))) as never,
      );

      captured.push({ origin, localStorage: localStorage as { name: string; value: string }[] });
    } catch {
      // An origin we cannot reach contributes nothing. Returning the cookies is
      // strictly better than throwing away a capture over one navigation.
    }
  }

  return { cookies, origins: captured };
}

/** `https://app.example.com/dashboard?x=1` → `https://app.example.com`. */
function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}
