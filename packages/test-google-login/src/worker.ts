/**
 * The Cloudflare half: a Durable Object holding one Browser Rendering session,
 * replaying a persisted Google login against a deployed app.
 *
 * Why a Durable Object at all — a Worker could call `puppeteer.launch()` directly.
 * Two reasons, and both are why Cloudflare's own guidance points here:
 *
 * 1. **A browser launch costs seconds and is billed.** A DO is a single addressable
 *    instance, so the browser survives between requests and a suite of twenty
 *    checks pays for one launch. An alarm closes it once idle, because an
 *    *unclosed* browser is billed too.
 * 2. **Concurrency.** Browser Rendering allows a small number of concurrent
 *    sessions per account. Routing every check for a named session through one DO
 *    serialises them instead of tripping that limit under a parallel test run.
 *
 * Everything about this module is "test infrastructure exposed over HTTP", so the
 * security posture is deliberate and strict:
 *
 * - Every request must present `TEST_AUTH_SECRET`; if the secret is not configured
 *   the Worker refuses *all* requests rather than serving an open browser.
 * - `GET /state` returns a redacted summary. The stored session is never readable
 *   back over HTTP — an endpoint that hands out live cookies is a credential
 *   exfiltration endpoint with a test-shaped name.
 * - `POST /login` (real Google sign-in) is off unless `ALLOW_REAL_GOOGLE_LOGIN` is
 *   exactly "true".
 *
 * This module imports no Node builtin. See `state-core.ts` for why that matters.
 */
import { normalizeStorageState, redactStorageState, summarizeStorageState } from "./state-core.js";
import { applyStorageState, extractStorageState } from "./puppeteer-state.js";
import { AUTH_HEADER, isAuthorized } from "./secret.js";
import type { PageLike, StorageState, StorageStateSummary } from "./types.js";

/** Bindings this Worker expects. See `wrangler.jsonc`. */
export interface Env {
  /** Browser Rendering binding. Requires the Workers Paid plan. */
  BROWSER: unknown;
  /** The `GoogleLoginBrowser` namespace. */
  BROWSER_SESSION: DurableObjectNamespaceLike;
  /** Shared secret every request must present. Unset = the Worker serves nothing. */
  TEST_AUTH_SECRET?: string;
  /** "true" to enable `POST /login`. Anything else leaves it disabled. */
  ALLOW_REAL_GOOGLE_LOGIN?: string;
  GOOGLE_TEST_EMAIL?: string;
  GOOGLE_TEST_PASSWORD?: string;
  /** Minutes of inactivity before the browser is closed. Default 3. */
  BROWSER_IDLE_MINUTES?: string;
}

/** The shape of a DO namespace, declared structurally so tests can fake it. */
export interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}

const KEY_STATE = "storage-state";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Route a request to the DO that owns its session, after checking the secret.
 *
 * The session name comes from `?session=` and defaults to `default`. Distinct
 * names are distinct browsers — useful for one signed-in and one anonymous
 * session in the same suite, and for keeping two concurrent CI jobs apart.
 */
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (!env.TEST_AUTH_SECRET) {
    return json(
      {
        error: "not_configured",
        message:
          "TEST_AUTH_SECRET is not set, so this Worker refuses every request. " +
          "Set it with `wrangler secret put TEST_AUTH_SECRET`.",
      },
      503,
    );
  }

  if (!isAuthorized(request.headers, env.TEST_AUTH_SECRET)) {
    // No detail, and no hint about which part was wrong.
    return new Response("Unauthorized", { status: 401, headers: { "x-required-header": AUTH_HEADER } });
  }

  const url = new URL(request.url);
  if (url.pathname === "/health") return json({ ok: true });

  const session = url.searchParams.get("session") || "default";
  const stub = env.BROWSER_SESSION.get(env.BROWSER_SESSION.idFromName(session));

  return stub.fetch(request);
}

export default {
  fetch: handleRequest,
};

/** The minimum of `@cloudflare/puppeteer` this module calls. */
export interface PuppeteerLike {
  launch(binding: unknown): Promise<BrowserLike>;
  connect?(binding: unknown, sessionId: string): Promise<BrowserLike>;
}

export interface BrowserLike {
  newPage(): Promise<PageLike & { close(): Promise<void>; title(): Promise<string>; screenshot(options?: Record<string, unknown>): Promise<ArrayBuffer | Uint8Array> }>;
  close(): Promise<void>;
  isConnected?(): boolean;
}

/**
 * Resolve `@cloudflare/puppeteer` at call time rather than import time.
 *
 * It is an optional peer dependency: the Playwright half of this package is
 * useful on its own, and a hard import would make every consumer install a
 * Cloudflare-only module. A test can also hand in a fake and exercise the whole
 * Durable Object without a browser.
 */
let puppeteerOverride: PuppeteerLike | undefined;

/** Inject a Puppeteer implementation — for tests, and for bring-your-own builds. */
export function setPuppeteer(implementation: PuppeteerLike | undefined): void {
  puppeteerOverride = implementation;
}

async function getPuppeteer(): Promise<PuppeteerLike> {
  if (puppeteerOverride) return puppeteerOverride;

  const loaded = (await import("@cloudflare/puppeteer")) as unknown as {
    default?: PuppeteerLike;
    launch?: PuppeteerLike["launch"];
  };

  const implementation = loaded.default ?? (loaded as PuppeteerLike);
  if (typeof implementation?.launch !== "function") {
    throw new TypeError(
      "Could not load @cloudflare/puppeteer. Install it in the Worker that deploys this, or call " +
        "setPuppeteer() with your own implementation.",
    );
  }

  return implementation;
}

/** State-checking result, returned by `POST /check`. */
export interface CheckResult {
  authenticated: boolean;
  status: number | null;
  url: string;
  title: string;
  /** Why the check concluded what it did — the useful half when it says `false`. */
  reason: string;
  applied: { cookiesSet: number; originsRestored: string[]; skipped: { origin: string; reason: string }[] };
}

/**
 * Holds one browser and one persisted session.
 *
 * Written against a structural `state`/`env` rather than extending
 * `DurableObject`, so the class is constructible in a plain Vitest process. The
 * runtime passes the real ones.
 */
export class GoogleLoginBrowser {
  private readonly storage: DurableObjectStorageLike;
  private readonly env: Env;
  private browser: BrowserLike | undefined;

  constructor(state: { storage: DurableObjectStorageLike }, env: Env) {
    this.storage = state.storage;
    this.env = env;
  }

  private get idleMs(): number {
    const minutes = Number.parseFloat(this.env.BROWSER_IDLE_MINUTES ?? "3");
    return (Number.isFinite(minutes) && minutes > 0 ? minutes : 3) * 60_000;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      switch (`${request.method} ${url.pathname}`) {
        case "POST /state":
          return await this.putState(request);
        case "GET /state":
          return await this.describeState();
        case "DELETE /state":
          return await this.clearState();
        case "POST /check":
          return await this.check(request);
        case "POST /login":
          return await this.login(request);
        case "POST /close":
          await this.closeBrowser();
          return json({ closed: true });
        default:
          return json({ error: "not_found", message: `No route for ${request.method} ${url.pathname}` }, 404);
      }
    } catch (error) {
      // The message may quote a selector or a URL, never a cookie: every path that
      // handles state here passes it straight into Puppeteer without formatting it.
      return json({ error: "failed", message: (error as Error).message }, 500);
    }
  }

  /**
   * Store a storage state for this session.
   *
   * Validated on the way in, so a malformed upload fails here with a precise
   * reason rather than as an opaque CDP error during the next check.
   */
  private async putState(request: Request): Promise<Response> {
    const state = normalizeStorageState(await request.json());
    await this.storage.put(KEY_STATE, state);

    // The response describes the state; it never echoes it.
    return json({ stored: true, summary: summarizeStorageState(state) });
  }

  /**
   * Describe the stored state — redacted, always.
   *
   * There is no route that returns the live values. That is the point: this Worker
   * can be handed to CI without handing CI a way to read the session back out.
   */
  private async describeState(): Promise<Response> {
    const state = await this.storage.get<StorageState>(KEY_STATE);
    if (!state) return json({ present: false }, 404);

    return json({
      present: true,
      summary: summarizeStorageState(state),
      redacted: redactStorageState(state),
    });
  }

  private async clearState(): Promise<Response> {
    const existed = await this.storage.delete(KEY_STATE);
    await this.closeBrowser();
    return json({ cleared: existed });
  }

  /**
   * Replay the stored session against a URL and report whether it is signed in.
   *
   * "Signed in" is whatever you say it is: `expectSelector` is checked in the page
   * and `rejectUrl` catches the redirect-to-login case, which is the failure that
   * otherwise looks like a passing 200.
   */
  private async check(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      url?: string;
      expectSelector?: string;
      rejectUrl?: string;
      origins?: string[];
      screenshot?: boolean;
    };

    if (!body.url) return json({ error: "bad_request", message: "`url` is required" }, 400);

    const state = await this.storage.get<StorageState>(KEY_STATE);
    if (!state) {
      return json(
        {
          error: "no_state",
          message: "No stored session for this name. POST /state with a Playwright storage state first.",
        },
        409,
      );
    }

    const browser = await this.ensureBrowser();
    const page = await browser.newPage();

    try {
      const applied = await applyStorageState(page, state, { origins: body.origins });

      const response = (await page.goto(body.url, { waitUntil: "domcontentloaded" })) as {
        status?: () => number;
      } | null;

      const landedUrl = page.url();
      const title = await page.title();

      let authenticated = true;
      let reason = "navigated without being redirected away";

      if (body.rejectUrl && landedUrl.includes(body.rejectUrl)) {
        authenticated = false;
        reason = `redirected to ${body.rejectUrl} — the session was not accepted`;
      } else if (body.expectSelector) {
        const found = await page.evaluate(
          ((selector: string) => document.querySelector(selector) !== null) as never,
          body.expectSelector,
        );
        authenticated = found === true;
        reason = found
          ? `found ${body.expectSelector}`
          : `${body.expectSelector} is not on the page — probably signed out`;
      }

      const result: CheckResult & { screenshot?: string } = {
        authenticated,
        status: typeof response?.status === "function" ? response.status() : null,
        url: landedUrl,
        title,
        reason,
        applied,
      };

      if (body.screenshot) {
        const shot = await page.screenshot({ type: "png" });
        result.screenshot = toBase64(shot);
      }

      return json(result);
    } finally {
      // The page closes; the browser does not. That is the whole reason this is a
      // Durable Object.
      await page.close();
      await this.touch();
    }
  }

  /**
   * Sign in to Google for real, in the Worker, and store the resulting session.
   *
   * Gated twice — the flag and the credentials — and still the path you should
   * reach for last. Read {@link signInWithGoogle}'s notes in `google-login.ts`:
   * they apply here in full, with the extra wrinkle that a datacentre IP makes
   * Google's risk checks more likely, not less.
   */
  private async login(request: Request): Promise<Response> {
    if (this.env.ALLOW_REAL_GOOGLE_LOGIN !== "true") {
      return json(
        {
          error: "disabled",
          message:
            'Real Google sign-in is disabled. Set ALLOW_REAL_GOOGLE_LOGIN="true" and the ' +
            "GOOGLE_TEST_EMAIL / GOOGLE_TEST_PASSWORD secrets to enable POST /login — and prefer " +
            "capturing the session locally with `playwright codegen` instead.",
        },
        403,
      );
    }

    const email = this.env.GOOGLE_TEST_EMAIL;
    const password = this.env.GOOGLE_TEST_PASSWORD;
    if (!email || !password) {
      return json(
        { error: "disabled", message: "GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD must both be set." },
        403,
      );
    }

    const body = (await request.json()) as {
      loginUrl?: string;
      signInSelector?: string;
      expectUrl?: string;
      origins?: string[];
      /** How long to wait to land on `expectUrl`. Capped at two minutes. */
      timeoutMs?: number;
    };

    if (!body.loginUrl) return json({ error: "bad_request", message: "`loginUrl` is required" }, 400);

    // Required, not defaulted to the login page's origin: the flow *starts* on
    // that origin, so an origin match is satisfied before Google is involved at
    // all and every login "succeeds". Name the authenticated URL instead.
    if (!body.expectUrl) {
      return json(
        {
          error: "bad_request",
          message:
            "`expectUrl` is required — a substring of the URL you land on once signed in, e.g. \"/dashboard\". " +
            "It is not defaulted to your origin, because the login page is on that origin too and the wait " +
            "would pass before sign-in even started.",
        },
        400,
      );
    }

    const browser = await this.ensureBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(body.loginUrl, { waitUntil: "domcontentloaded" });

      // Typed through the page rather than assembled into a script string: a
      // password interpolated into `page.evaluate` source ends up in CDP logs.
      await clickSelector(page, body.signInSelector ?? 'a[href*="google"], button[data-provider="google"]');
      await typeInto(page, 'input[type="email"]', email);
      await clickSelector(page, "#identifierNext button, #identifierNext");
      await typeInto(page, 'input[type="password"]', password);
      await clickSelector(page, "#passwordNext button, #passwordNext");

      await waitForUrlContaining(
        page,
        body.expectUrl,
        // Capped rather than trusted: an unbounded wait pins a billed browser
        // session open for as long as the caller likes.
        Math.min(Math.max(body.timeoutMs ?? 30_000, 250), 120_000),
      );

      const state = await extractStorageState(page, { origins: body.origins });
      await this.storage.put(KEY_STATE, state);

      return json({ stored: true, summary: summarizeStorageState(state) });
    } finally {
      await page.close();
      await this.touch();
    }
  }

  private async ensureBrowser(): Promise<BrowserLike> {
    if (this.browser?.isConnected?.() === false) this.browser = undefined;

    if (!this.browser) {
      const puppeteer = await getPuppeteer();
      this.browser = await puppeteer.launch(this.env.BROWSER);
    }

    await this.touch();
    return this.browser;
  }

  /** Push the idle alarm out. Called after every request that used the browser. */
  private async touch(): Promise<void> {
    await this.storage.setAlarm(Date.now() + this.idleMs);
  }

  /**
   * Close the browser when the session goes quiet.
   *
   * Not an optimisation — a Browser Rendering session left open is billed and
   * counts against the account's concurrency limit, so the alarm is the difference
   * between a test tool and a surprise invoice.
   */
  async alarm(): Promise<void> {
    await this.closeBrowser();
  }

  private async closeBrowser(): Promise<void> {
    const browser = this.browser;
    this.browser = undefined;
    if (!browser) return;

    try {
      await browser.close();
    } catch {
      // Already gone — Browser Rendering reaps idle sessions on its own too.
    }
  }
}

/** The part of a DO's storage this class uses. */
export interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  setAlarm(time: number): Promise<void>;
}

async function clickSelector(page: PageLike, selector: string): Promise<void> {
  await page.evaluate(
    ((css: string) => {
      const element = document.querySelector(css) as HTMLElement | null;
      if (!element) throw new Error(`No element matched ${css}`);
      element.click();
    }) as never,
    selector,
  );
}

async function typeInto(page: PageLike, selector: string, value: string): Promise<void> {
  await page.evaluate(
    (([css, text]: [string, string]) => {
      const element = document.querySelector(css) as HTMLInputElement | null;
      if (!element) throw new Error(`No element matched ${css}`);
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }) as never,
    [selector, value],
  );
}

/**
 * Poll until the page's URL contains `fragment`.
 *
 * Hand-rolled rather than `page.waitForNavigation`: a Google sign-in is several
 * navigations, and the interesting condition is "we are back on our own origin",
 * not "a navigation happened".
 */
async function waitForUrlContaining(page: PageLike, fragment: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (page.url().includes(fragment)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Timed out waiting for a URL containing "${fragment}" — currently ${page.url()}. ` +
      "A consent screen, a device check or MFA looks like this, and none of them should be " +
      "automated: capture the session by hand instead.",
  );
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Exported for tests and for the summary type. */
export type { StorageStateSummary };
