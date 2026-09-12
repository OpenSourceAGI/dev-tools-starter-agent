/**
 * The three ways to get a signed-in browser, in the order you should prefer them.
 *
 * 1. {@link requireStoredSession} — a session captured once by hand with
 *    `playwright codegen`, reused by every test. No credentials anywhere, no
 *    Google traffic in the suite. This is the default.
 * 2. {@link bootstrapAppSession} — your app mints its own session through a
 *    test-only endpoint, so CI regenerates state on every run and holds one
 *    secret instead of a Google password. This is what pull requests should use.
 * 3. {@link signInWithGoogle} — actually drive Google's sign-in form. A narrow,
 *    manually triggered smoke test and nothing more: it can fail for MFA,
 *    CAPTCHA, a consent prompt, a device check or a UI change, none of which are
 *    your app's fault. It refuses to run unless explicitly opted in.
 *
 * Nothing here imports Playwright. Every function takes the `page`, `context` or
 * `request` fixture it needs, which keeps the package dependency-free and lets
 * the whole module be tested without a browser.
 */
import { codegenCommand, resolveAuthFile } from "./auth-file.js";
import { assertStorageStateUsable, hardenStorageStateFile, readStorageState } from "./storage-state.js";
import type { StorageState, StorageStateSummary } from "./types.js";

/** Env var that must be set before {@link signInWithGoogle} will run. */
export const ALLOW_REAL_LOGIN_ENV = "TEST_GOOGLE_LOGIN_ALLOW_REAL";

/** Header the test-only session endpoint authenticates with. */
export const BOOTSTRAP_HEADER = "x-e2e-auth-secret";

/** The subset of Playwright's `BrowserContext` used here. */
export interface ContextLike {
  storageState(options?: { path?: string; indexedDB?: boolean }): Promise<unknown>;
}

/** The subset of Playwright's `APIRequestContext` used here. */
export interface RequestLike {
  post(
    url: string,
    options?: { headers?: Record<string, string>; data?: unknown },
  ): Promise<{ ok(): boolean; status(): number; text(): Promise<string> }>;
}

/** The subset of Playwright's `Locator` used here. */
export interface LocatorLike {
  click(options?: Record<string, unknown>): Promise<void>;
  fill(value: string, options?: Record<string, unknown>): Promise<void>;
}

/** The subset of Playwright's `Page` used here. */
export interface PlaywrightPageLike {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  waitForURL(url: string | RegExp, options?: Record<string, unknown>): Promise<void>;
  url(): string;
  getByRole(role: string, options?: { name?: string | RegExp }): LocatorLike;
  getByLabel(text: string | RegExp, options?: Record<string, unknown>): LocatorLike;
}

export interface StoredSessionOptions {
  /** State file path. Defaults to `playwright/.auth/google-test-user.json`. */
  file?: string;
  /** Project root for relative paths and for the hint in error messages. */
  cwd?: string;
  /** App URL used in the `playwright codegen` hint. */
  baseUrl?: string;
  /** Injectable clock, so expiry assertions are deterministic in tests. */
  now?: number;
}

/**
 * Assert that a usable persisted session exists, and describe it.
 *
 * This is the whole body of a Playwright setup project. It deliberately does not
 * *create* the session: scripting Google's password form is the brittle part, so
 * the first run tells you how to do it by hand and every run after that is a
 * sub-millisecond file check.
 *
 * @returns a summary safe to print — no cookie value is in it
 * @throws when the file is missing, malformed, or expired, in each case with the
 *   command that fixes it
 *
 * @example
 * // tests/auth.setup.ts
 * setup("Google test-user session exists", () => {
 *   const summary = requireStoredSession({ baseUrl: process.env.E2E_BASE_URL });
 *   console.log(`session ok — ${summary.cookieCount} cookies, expires in ${summary.expiresInSeconds}s`);
 * });
 */
export function requireStoredSession(options: StoredSessionOptions = {}): StorageStateSummary {
  const file = resolveAuthFile(options);
  const state = readStorageState(file, options);
  return assertStorageStateUsable(state, { ...options, file });
}

export interface BootstrapAppSessionOptions extends StoredSessionOptions {
  /** Playwright's `request` fixture. */
  request: RequestLike;
  /** Playwright's `page` fixture — needed to put the app's origin in the context. */
  page: PlaywrightPageLike;
  /** Playwright's `context` fixture, which the state is read off. */
  context: ContextLike;
  /**
   * The test-only endpoint that creates a session. Must 404 in production, and be
   * covered by a test that proves it does.
   */
  endpoint?: string;
  /** The shared secret the endpoint checks. Required; never defaulted. */
  secret?: string;
  /** Where to land afterwards, so the app's cookies are in the context. */
  landingPath?: string;
  /** Body posted to the endpoint — which user to create, what roles to give it. */
  user?: Record<string, unknown>;
  /** Capture IndexedDB too. Needed when your auth library keeps tokens there. */
  indexedDB?: boolean;
}

/**
 * Ask your own app for a session that looks exactly like a successful Google
 * callback, then persist the browser state.
 *
 * The recommended path for CI. The only secret involved is yours, it is scoped to
 * your own staging environment, and nothing in the run touches Google — so a PR
 * check cannot fail because Google showed a consent screen.
 *
 * The endpoint on your side must create the *same* session format, claims, roles
 * and cookies as the real callback. An endpoint that mints a subtly different
 * session turns the whole suite into a test of a code path that does not ship.
 *
 * @throws when `secret` is absent — an unauthenticated session-minting endpoint
 *   is a far worse outcome than a failed test, so this never falls back
 */
export async function bootstrapAppSession(options: BootstrapAppSessionOptions): Promise<string> {
  const {
    request,
    page,
    context,
    endpoint = "/api/test-auth/google-user",
    secret,
    landingPath = "/dashboard",
    user,
    indexedDB = true,
  } = options;

  if (!secret) {
    throw new Error(
      "bootstrapAppSession() needs the shared secret for the test-only auth endpoint. " +
        "Set E2E_TEST_AUTH_SECRET and pass it as `secret` — it is never defaulted, because an " +
        "endpoint that mints sessions without one is a production incident waiting to happen.",
    );
  }

  const response = await request.post(endpoint, {
    headers: { [BOOTSTRAP_HEADER]: secret },
    data: user ?? {},
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(
      [
        `Test-auth endpoint ${endpoint} returned ${response.status()}.`,
        body ? `Body: ${body.slice(0, 400)}` : "",
        "",
        "A 401 means the secret does not match; a 404 means the endpoint is disabled for this",
        "environment — which is correct in production and a misconfiguration anywhere else.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  // The cookie the endpoint set is attached to the API request context; navigating
  // the page is what puts the app's origin — and its localStorage — into the
  // browser context that `storageState()` reads.
  await page.goto(landingPath);

  const file = resolveAuthFile(options);

  // Playwright writes the file itself rather than us re-serialising what it
  // returns: `indexedDB: true` puts a key in there that this package has no type
  // for, and round-tripping through our own writer would silently drop it — along
  // with whichever auth library keeps its tokens in IndexedDB. So Playwright
  // writes, and we tighten the mode afterwards.
  await context.storageState({ path: file, indexedDB });
  hardenStorageStateFile(file);

  return file;
}

/** Is real Google sign-in opted into, and are the credentials present? */
export function realGoogleLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const flag = env[ALLOW_REAL_LOGIN_ENV];
  const optedIn = flag === "1" || flag?.toLowerCase() === "true";
  return Boolean(optedIn && env.GOOGLE_TEST_EMAIL && env.GOOGLE_TEST_PASSWORD);
}

export interface GoogleSignInOptions extends StoredSessionOptions {
  page: PlaywrightPageLike;
  context: ContextLike;
  /** Environment the opt-in flag and credentials are read from. */
  env?: Record<string, string | undefined>;
  /** Your app's login page. */
  loginPath?: string;
  /** Accessible name of your app's "sign in with Google" button. */
  signInButton?: string | RegExp;
  /** URL the flow must land on before the state is captured. */
  expectUrl?: RegExp;
  indexedDB?: boolean;
  /** Google's own field and button labels, overridable because Google changes them. */
  googleSelectors?: {
    email?: RegExp;
    password?: RegExp;
    next?: RegExp;
  };
}

/**
 * Drive Google's real sign-in form and persist the result.
 *
 * Use this once, in a workflow a human triggers, to confirm your OAuth client is
 * configured — not in a PR check. The selectors below are illustrative: Google
 * changes its UI, its labels and its language, and none of that is something this
 * package can keep up with.
 *
 * It will not attempt to get past MFA, CAPTCHA, a suspicious-sign-in prompt or
 * device verification, and you should not add that: those are the controls
 * protecting the account, and automating around them is how a test account
 * becomes a compromised one. If you hit them, capture the session by hand with
 * `playwright codegen` instead.
 *
 * @throws when {@link ALLOW_REAL_LOGIN_ENV} is not set or credentials are missing
 */
export async function signInWithGoogle(options: GoogleSignInOptions): Promise<string> {
  const {
    page,
    context,
    env = process.env,
    loginPath = "/login",
    signInButton = /continue with google|sign in with google/i,
    expectUrl = /dashboard|app/,
    indexedDB = true,
    googleSelectors = {},
  } = options;

  if (!realGoogleLoginEnabled(env)) {
    throw new Error(
      [
        "Real Google sign-in is not enabled.",
        "",
        `Set ${ALLOW_REAL_LOGIN_ENV}=1 together with GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD,`,
        "and only in a manually triggered workflow on a protected branch — never where a fork's",
        "pull request can reach the secrets.",
        "",
        "For everything else, prefer a session captured once by hand:",
        `  ${codegenCommand(options)}`,
      ].join("\n"),
    );
  }

  const email = env.GOOGLE_TEST_EMAIL as string;
  const password = env.GOOGLE_TEST_PASSWORD as string;

  const emailField = googleSelectors.email ?? /email or phone/i;
  const passwordField = googleSelectors.password ?? /enter your password/i;
  const next = googleSelectors.next ?? /^next$/i;

  await page.goto(loginPath);
  await page.getByRole("button", { name: signInButton }).click();

  await page.getByLabel(emailField).fill(email);
  await page.getByRole("button", { name: next }).click();

  await page.getByLabel(passwordField).fill(password);
  await page.getByRole("button", { name: next }).click();

  // Back on your own origin. Anything else — a consent screen, a device check —
  // times out here, and that is the correct outcome: it is not something to
  // click through automatically.
  await page.waitForURL(expectUrl);

  const file = resolveAuthFile(options);
  await context.storageState({ path: file, indexedDB });
  hardenStorageStateFile(file);

  return file;
}

/** Load a state file for passing to `browser.newContext({ storageState })`. */
export function loadStorageStateFor(options: StoredSessionOptions = {}): StorageState {
  return readStorageState(resolveAuthFile(options), options);
}
