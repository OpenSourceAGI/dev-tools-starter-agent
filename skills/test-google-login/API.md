# test-google-login — API

Exact signatures. Narrative, recipes and troubleshooting are in
[SKILL.md](SKILL.md).

Two entry points:

```ts
import { /* … */ } from "test-google-login";          // Node / Playwright
import { /* … */ } from "test-google-login/worker";   // Cloudflare Workers
```

## Types

```ts
type SameSite = "Strict" | "Lax" | "None";

interface StorageStateCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;   // Unix SECONDS; -1 for a session cookie
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSite;
}

interface StorageStateOrigin {
  origin: string;
  localStorage: { name: string; value: string }[];
}

interface StorageState {
  cookies: StorageStateCookie[];
  origins: StorageStateOrigin[];
}

interface PuppeteerCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;   // ABSENT for a session cookie, never -1
  httpOnly: boolean;
  secure: boolean;
  sameSite?: SameSite;
  session?: boolean;  // CDP sets this on read
}

interface StorageStateSummary {
  cookieCount: number;
  originCount: number;
  domains: string[];                            // deduped, sorted
  cookieNames: string[];                        // deduped, sorted
  localStorageKeys: Record<string, string[]>;   // origin -> keys; values omitted
  sessionCookies: number;
  earliestExpiry: number | null;                // Unix seconds; null if none carry one
  expiresInSeconds: number | null;              // negative once passed
  expired: boolean;                             // every expiring cookie has passed
  usable: boolean;                              // at least one cookie a browser would send
  hasGoogleCookies: boolean;
}
```

`StorageStateSummary` contains **no value** from the state. It is safe to print,
log and return.

## Paths and bootstrap

```ts
const DEFAULT_AUTH_DIR = "playwright/.auth";
const DEFAULT_AUTH_FILE = "playwright/.auth/google-test-user.json";
const STATE_PATH_ENV = "TEST_GOOGLE_LOGIN_STATE";
const GITIGNORE_LINES: readonly ["playwright/.auth/", ".env", ".env.*", "!.env.example"];

interface AuthFileOptions {
  cwd?: string;    // default process.cwd()
  file?: string;   // absolute, or relative to cwd
  env?: Record<string, string | undefined>;   // default process.env
}

resolveAuthFile(options?: AuthFileOptions): string
```

Resolution order: `options.file` → `$TEST_GOOGLE_LOGIN_STATE` → `DEFAULT_AUTH_FILE`.
Always returns an absolute path.

```ts
ensureAuthDir(file: string): string          // mkdir -p, mode 0700, chmods an existing dir too
writeAuthDirGitignore(file: string): string   // writes <dir>/.gitignore containing "*"
isIgnored(gitignore: string, pattern: string): boolean

ensureGitignored(options?: { cwd?: string; patterns?: readonly string[] }): {
  file: string;
  added: string[];
  alreadyIgnored: string[];
}

codegenCommand(options?: { file?: string; baseUrl?: string; cwd?: string }): string
```

`ensureGitignored` is idempotent and only ever appends — it never rewrites or
reorders existing lines. `isIgnored` compares ignore *lines*, not paths: it
recognises `playwright/.auth`, `playwright/.auth/`, `/playwright/.auth/` and a
parent `playwright/`, and treats a `!` negation as not covered. An unrecognised
pattern costs a duplicate line, which is harmless.

`codegenCommand` defaults `baseUrl` to `http://localhost:3000` and emits the path
relative to `cwd`.

## Reading, writing, inspecting

```ts
const SESSION_COOKIE_EXPIRES = -1;

class InvalidStorageStateError extends Error {}              // message: "Not a Playwright storage state: <reason>"
class MissingStorageStateError extends Error { file: string } // message carries the codegen command

normalizeStorageState(raw: unknown): StorageState
parseStorageState(text: string): StorageState
readStorageState(file: string, options?: { baseUrl?: string; cwd?: string }): StorageState
writeStorageState(file: string, state: StorageState): string      // absolute path; mode 0600
hardenStorageStateFile(file: string): StorageStateSummary         // chmod 0600 + validate, in place
```

`normalizeStorageState` fills in what a hand-edited or older file omits (`path`
→ `/`, missing `expires` → `-1`, `httpOnly`/`secure` → `false`), re-capitalises
`sameSite`, falls back to `Lax` for a value CDP would reject, and drops malformed
`localStorage` entries. It throws `InvalidStorageStateError` for a non-object top
level, a non-array `cookies`/`origins`, neither key present, a cookie without a
name/value pair or a domain, or an origin without an `origin`.

`readStorageState` throws `MissingStorageStateError` on `ENOENT` — carrying the
`codegen` command — and rethrows anything else unchanged.

`hardenStorageStateFile` is for files **Playwright** wrote: `storageState({ path,
indexedDB: true })` adds a top-level key this package has no type for, so the
file is validated and chmodded in place rather than re-serialised (which would
drop it).

```ts
summarizeStorageState(state: StorageState, options?: { now?: number }): StorageStateSummary
findExpiringCookies(state: StorageState, options?: { now?: number; withinMs?: number }): StorageStateCookie[]
assertStorageStateUsable(state, options?: { now?: number; file?: string; baseUrl?: string; cwd?: string }): StorageStateSummary
redactStorageState(state: StorageState): StorageState
isGoogleDomain(domain: string): boolean
```

`now` is milliseconds since epoch (default `Date.now()`); it exists so expiry
assertions are deterministic. `findExpiringCookies` defaults to a one-hour window
and never reports a session cookie. `assertStorageStateUsable` returns the summary
when good and otherwise throws with how long ago it lapsed plus the `codegen`
command. `redactStorageState` returns a new state — it does not mutate — with
every cookie and `localStorage` value replaced by `«redacted N chars»`.

## Playwright flows

```ts
const ALLOW_REAL_LOGIN_ENV = "TEST_GOOGLE_LOGIN_ALLOW_REAL";
const BOOTSTRAP_HEADER = "x-e2e-auth-secret";

interface StoredSessionOptions { file?: string; cwd?: string; baseUrl?: string; now?: number }

requireStoredSession(options?: StoredSessionOptions): StorageStateSummary
loadStorageStateFor(options?: StoredSessionOptions): StorageState
realGoogleLoginEnabled(env?: Record<string, string | undefined>): boolean
```

`requireStoredSession` = read + `assertStorageStateUsable`. It never *creates* a
session. `realGoogleLoginEnabled` is true only for `TEST_GOOGLE_LOGIN_ALLOW_REAL`
of `1`/`true` (case-insensitive) **and** both `GOOGLE_TEST_EMAIL` and
`GOOGLE_TEST_PASSWORD` set.

```ts
interface BootstrapAppSessionOptions extends StoredSessionOptions {
  request: RequestLike;          // Playwright's `request` fixture
  page: PlaywrightPageLike;      // Playwright's `page` fixture
  context: ContextLike;          // Playwright's `context` fixture
  endpoint?: string;             // default "/api/test-auth/google-user"
  secret?: string;               // REQUIRED — never defaulted
  landingPath?: string;          // default "/dashboard"
  user?: Record<string, unknown>;// posted as the body
  indexedDB?: boolean;           // default true
}

bootstrapAppSession(options: BootstrapAppSessionOptions): Promise<string>   // the state file path
```

POSTs to `endpoint` with the secret in the `x-e2e-auth-secret` **header** (never
the URL or body), navigates `page` to `landingPath` so the app's origin is in the
context, writes the state via Playwright, then chmods it to 0600. Throws without a
`secret` *before* making any request. A non-OK response throws with the status and
the first 400 bytes of the body.

```ts
interface GoogleSignInOptions extends StoredSessionOptions {
  page: PlaywrightPageLike;
  context: ContextLike;
  env?: Record<string, string | undefined>;
  loginPath?: string;                  // default "/login"
  signInButton?: string | RegExp;      // default /continue with google|sign in with google/i
  expectUrl?: RegExp;                  // default /dashboard|app/
  indexedDB?: boolean;                 // default true
  googleSelectors?: { email?: RegExp; password?: RegExp; next?: RegExp };
}

signInWithGoogle(options: GoogleSignInOptions): Promise<string>
```

Throws — touching nothing — unless `realGoogleLoginEnabled(env)`. Google's own
labels default to `/email or phone/i`, `/enter your password/i` and `/^next$/i`
and are overridable, because Google changes them. It waits for `expectUrl` rather
than clicking through a consent screen or device check; those time out by design.

### Structural fixture types

Declared structurally so nothing imports Playwright:

```ts
interface ContextLike { storageState(options?: { path?: string; indexedDB?: boolean }): Promise<unknown> }
interface RequestLike {
  post(url: string, options?: { headers?: Record<string, string>; data?: unknown }):
    Promise<{ ok(): boolean; status(): number; text(): Promise<string> }>;
}
interface LocatorLike { click(o?: Record<string, unknown>): Promise<void>; fill(v: string, o?: Record<string, unknown>): Promise<void> }
interface PlaywrightPageLike {
  goto(url: string, o?: Record<string, unknown>): Promise<unknown>;
  waitForURL(url: string | RegExp, o?: Record<string, unknown>): Promise<void>;
  url(): string;
  getByRole(role: string, o?: { name?: string | RegExp }): LocatorLike;
  getByLabel(text: string | RegExp, o?: Record<string, unknown>): LocatorLike;
}
```

## Puppeteer bridge

```ts
toPuppeteerCookies(state: StorageState): PuppeteerCookie[]
fromPuppeteerCookies(cookies: PuppeteerCookie[]): StorageStateCookie[]
storageStateOrigins(state: StorageState): string[]
applyLocalStorage(page: PageLike, entries: { name: string; value: string }[]): Promise<void>

interface ApplyStorageStateOptions {
  origins?: string[];                        // default: every origin in the state
  gotoOptions?: Record<string, unknown>;
}

interface ApplyStorageStateResult {
  cookiesSet: number;
  originsRestored: string[];
  skipped: { origin: string; reason: string }[];
}

applyStorageState(page: PageLike, state: StorageState, options?: ApplyStorageStateOptions): Promise<ApplyStorageStateResult>
extractStorageState(page: PageLike, options?: { origins?: string[]; gotoOptions?: Record<string, unknown> }): Promise<StorageState>
```

`toPuppeteerCookies` **omits** `expires` for a session cookie rather than sending
`-1`. `fromPuppeteerCookies` maps `session: true` or a missing expiry back to `-1`,
normalises `sameSite` (including CDP's `"unspecified"` → `Lax`) and defaults an
empty `path` to `/`. Round-tripping a state leaves it unchanged.

`applyStorageState` sets every cookie in **one** `setCookie` call, before any
navigation, then navigates once per origin (`waitUntil: "domcontentloaded"`) to
restore `localStorage`. An origin with no entries is skipped without navigating; an
unreachable one lands in `skipped` rather than losing the cookies already set. A
cookie-only state performs no navigation. Throws a `TypeError` naming
`browserContext.setCookie` when the page has no `setCookie` (Puppeteer 23+).

`extractStorageState` defaults `origins` to the page's current origin (none on
`about:blank`), skips re-navigating when already there, and returns the cookies
even when an origin cannot be reached. Throws a `TypeError` when the page cannot
read cookies.

```ts
interface PageLike {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  evaluate<T>(fn: (...args: never[]) => T, ...args: unknown[]): Promise<T>;
  url(): string;
  setCookie?(...cookies: PuppeteerCookie[]): Promise<void>;
  cookies?(...urls: string[]): Promise<PuppeteerCookie[]>;
  deleteCookie?(...cookies: { name: string; domain?: string; path?: string }[]): Promise<void>;
}
```

## Secrets

```ts
const AUTH_HEADER = "x-test-auth-secret";

constantTimeEqual(supplied: string | null | undefined, expected: string | null | undefined): boolean
isAuthorized(headers: { get(name: string): string | null }, expected: string | null | undefined): boolean
```

Hand-rolled rather than `node:crypto.timingSafeEqual`, so the Worker half needs no
`nodejs_compat`. Both return `false` whenever `expected` is empty or unset — a
Worker without its secret configured matches nothing, including `""`.

## Worker entry (`test-google-login/worker`)

```ts
interface Env {
  BROWSER: unknown;                      // Browser Rendering binding
  BROWSER_SESSION: DurableObjectNamespaceLike;
  TEST_AUTH_SECRET?: string;             // unset => 503 for everything
  ALLOW_REAL_GOOGLE_LOGIN?: string;      // exactly "true" to enable POST /login
  GOOGLE_TEST_EMAIL?: string;
  GOOGLE_TEST_PASSWORD?: string;
  BROWSER_IDLE_MINUTES?: string;         // default "3"
}

handleRequest(request: Request, env: Env): Promise<Response>
export default { fetch: handleRequest }

class GoogleLoginBrowser {
  constructor(state: { storage: DurableObjectStorageLike }, env: Env);
  fetch(request: Request): Promise<Response>;
  alarm(): Promise<void>;
}

setPuppeteer(implementation: PuppeteerLike | undefined): void
```

`handleRequest` returns `503 {error:"not_configured"}` when `TEST_AUTH_SECRET` is
unset, `401 "Unauthorized"` (with `x-required-header`) on a bad secret, answers
`/health` without waking a browser, and otherwise routes to the DO named by
`?session=` (default `"default"`).

`setPuppeteer` overrides the lazily-imported `@cloudflare/puppeteer` — for tests
and bring-your-own builds.

### Routes (on the Durable Object)

| Route | Body | Returns |
| --- | --- | --- |
| `POST /state` | a `StorageState` | `{ stored: true, summary }` — validated in; never echoed |
| `GET /state` | — | `{ present, summary, redacted }`, or `404 { present: false }` |
| `DELETE /state` | — | `{ cleared: boolean }`; also closes the browser |
| `POST /check` | `{ url, expectSelector?, rejectUrl?, origins?, screenshot? }` | `CheckResult` |
| `POST /login` | `{ loginUrl, expectUrl, signInSelector?, origins?, timeoutMs? }` | `{ stored, summary }`, or `403 { error: "disabled" }` |
| `POST /close` | — | `{ closed: true }` |

```ts
interface CheckResult {
  authenticated: boolean;
  status: number | null;
  url: string;
  title: string;
  reason: string;                       // why it concluded that — the useful half on false
  applied: ApplyStorageStateResult;
  screenshot?: string;                  // base64 PNG, only when requested
}
```

`/check` returns `400` without a `url` and `409 { error: "no_state" }` when nothing
is stored. `authenticated` is `false` if `rejectUrl` appears in the landing URL, or
if `expectSelector` is not found; with neither, it only reports that navigation
happened — **always pass `rejectUrl`**, since a login redirect is still a `200`.

`/login` requires **both** `loginUrl` and `expectUrl` (a substring of the URL you
land on once signed in, e.g. `"/dashboard"`). `expectUrl` is deliberately not
defaulted to the login page's origin — the flow *starts* there, so an origin match
would pass before Google was involved and every login would "succeed".
`timeoutMs` defaults to 30 s and is clamped to 250 ms–2 min, so a caller cannot pin
a billed browser session open indefinitely.

The browser is launched once and reused; each request closes only its page. Every
browser-using request pushes an alarm `BROWSER_IDLE_MINUTES` out (non-numeric
values fall back to 3), and the alarm closes the browser — an open Browser
Rendering session is billed.

```ts
interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  setAlarm(time: number): Promise<void>;
}
```

## CLI

```ts
parseArgs(argv: string[]): { command: string; flags: Record<string, string | true> }
runCli(argv: string[], io?: { out?: (line: string) => void; err?: (line: string) => void; cwd?: string }): Promise<number>
```

`runCli` returns an exit code rather than calling `process.exit`, and takes its
writers as arguments, so the whole CLI is testable in-process. `bin/cli.js` is a
three-line wrapper over it.

| Command | Exit codes |
| --- | --- |
| `init [--file <path>] [--url <baseUrl>]` | `0` |
| `check [--file <path>] [--within <mins>] [--json]` | `0` healthy · `1` missing or expired · `2` present but malformed |
| `redact [--file <path>]` | `0` · `1` unreadable |
| `clear [--file <path>]` | `0` (also when there was nothing to delete) |
| `help` | `0` · `1` for an unknown command |

`parseArgs` accepts `--flag value` and `--flag=value`, treats a trailing flag as
`true`, and does not swallow a following `--flag` as a value.
