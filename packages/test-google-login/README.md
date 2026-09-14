<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/test-google-login"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/test-google-login"><img src="https://img.shields.io/npm/dm/test-google-login.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/test-google-login"><img src="https://img.shields.io/npm/v/test-google-login.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/test-google-login"><img src="https://img.shields.io/npm/dt/test-google-login.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/test-google-login"><img src="https://img.shields.io/npm/types/test-google-login" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=test-google-login"><img src="https://packagephobia.com/badge?p=test-google-login" alt="Install size" /></a>
    <a href="https://app.codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/flags"><img src="https://img.shields.io/codecov/c/github/OpenSourceAGI/dev-tools-starter-agent?flag=test-google-login&label=test-google-login%20coverage&logo=codecov&logoColor=white" alt="Coverage" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/test-google-login"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" /> <img src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white" alt="Playwright" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill test-google-login` ([what it covers](../../skills/test-google-login/SKILL.md))
<!-- skills:install:end -->

# Test Google Login

Sign in with Google **once**, by hand, and let every test after that start
already signed in — locally, in CI, and from a Cloudflare Worker.

Two halves, one session file:

- **Playwright** (`test-google-login`) — captures, validates, inspects and
  redacts a `storageState`, and guards a setup project so the first run tells a
  new contributor exactly what to do instead of timing out on a login form.
- **Cloudflare Workers** (`test-google-login/worker`) — a Browser Rendering
  Durable Object that replays the same session against a deployed app, keeping
  one browser alive across a whole suite.

It has **no runtime dependencies**. Playwright and `@cloudflare/puppeteer` are
optional peers: every function takes the `page`, `context` or `request` it needs
as an argument, which is also why the whole package is unit-tested without ever
launching a browser.

## ⚠ The security boundary — read this first

Putting `GOOGLE_TEST_PASSWORD` in `.env` protects nothing if you then write:

```text
playwright/.auth/google-test-user.json
```

**That file is a live credential.** It can contain your app's session cookie,
Google's cookies for `accounts.google.com`, OAuth tokens in `localStorage` or
IndexedDB, and — depending on your auth library — something refresh-capable.
Anyone holding it is signed in as the test account.

So:

- Use a **dedicated Google account** for testing, with nothing sensitive on it.
- **Never commit it.** `test-google-login init` adds the rules, twice.
- **Never upload it as a public CI artifact**, and never paste it into a log,
  an issue or a chat. Use `test-google-login redact` when you need to show it.
- **Regenerate it** when it stops working, rather than trying to repair it.
- Prefer testing **your app's own session**. Keep real Google sign-in as a
  narrow, occasional smoke test.

This package is built around that last point. Everything that touches Google
is opt-in and off by default; everything that touches the file is 0600.

## Install

```bash
bun add -d test-google-login
npm install --save-dev test-google-login
```

## Quick start

### 1. Set up the directory and the gitignore rules

```bash
npx test-google-login init
```

```text
Created playwright/.auth/ (mode 0700)
Wrote   playwright/.auth/.gitignore — ignores everything in that directory
Added to .gitignore: playwright/.auth/, .env, .env.*, !.env.example

Now capture a session by hand — this avoids automating Google's password form,
which is what MFA, CAPTCHA and device checks all break:

  npx playwright codegen --save-storage=playwright/.auth/google-test-user.json http://localhost:3000
```

Two gitignores on purpose: the root one, and `playwright/.auth/.gitignore`
containing `*`. The root file gets reverted, reformatted and replaced by tooling;
the nested one travels with the directory.

### 2. Capture a session, by hand, once

Run the command `init` printed. In the window that opens: click **Sign in with
Google**, use the dedicated test account, finish the redirect back to *your* app,
confirm you are on an authenticated page, then close the window — Playwright
writes the state file on exit.

This is manual on purpose. Google may ask for MFA, a CAPTCHA or a device check,
and none of those should be automated around.

### 3. Reuse it

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { DEFAULT_AUTH_FILE } from "test-google-login";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  projects: [
    { name: "auth-setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["auth-setup"],
      use: { ...devices["Desktop Chrome"], storageState: DEFAULT_AUTH_FILE },
    },
  ],
});
```

`tests/auth.setup.ts`:

```ts
import { test as setup } from "@playwright/test";
import { requireStoredSession } from "test-google-login";

setup("an authenticated session is available", () => {
  const summary = requireStoredSession({ baseUrl: process.env.E2E_BASE_URL });
  console.log(`session ok — ${summary.cookieCount} cookies, ${summary.domains.join(", ")}`);
});
```

Your tests now start signed in:

```ts
test("an authenticated user can open the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});
```

`requireStoredSession` is the part that earns its keep. A missing file throws the
`codegen` command; an expired one throws *how long ago* it lapsed:

```text
The persisted session is no longer usable — it expired 380 minutes ago.

Re-capture it:
  npx playwright codegen --save-storage=playwright/.auth/google-test-user.json http://localhost:3000
```

Without that, an expired session presents as a selector timeout on an
unauthenticated page, which reads like a broken test rather than a stale cookie.

## For CI: let your app mint the session

Do **not** make a Google password a repository secret every fork's pull request
can reach. Instead, add a test-only endpoint to your own staging environment that
creates the same session a successful Google callback creates, and hold one secret
of yours.

```ts
import { bootstrapAppSession } from "test-google-login";

setup("create authenticated test session", async ({ page, context, request }) => {
  await bootstrapAppSession({
    request,
    page,
    context,
    secret: process.env.E2E_TEST_AUTH_SECRET,   // required; never defaulted
    endpoint: "/api/test-auth/google-user",
    landingPath: "/dashboard",
  });
});
```

State is regenerated each run, no Google traffic is involved, and a PR check can
never fail because Google showed a consent screen. See
[`examples/test-auth-endpoint.ts`](examples/test-auth-endpoint.ts) for the
endpoint — it must 404 in production, require a strong secret compared in
constant time, and create a session identical to the real callback's.

### Which strategy where

| Strategy | Use for | Secrets held |
| --- | --- | --- |
| `bootstrapAppSession` — your app mints it | every PR check | `E2E_TEST_AUTH_SECRET` |
| `requireStoredSession` — captured by hand | local development | none |
| Encrypted stored state | private, controlled CI | the encryption key; delete state after the run |
| `signInWithGoogle` — real Google | occasional manual smoke test | a dedicated account's credentials, environment-scoped |
| Mock the OAuth callback | unit and integration tests | none |

## Inspecting a session without opening it

```bash
npx test-google-login check
```

```text
State file   playwright/.auth/google-test-user.json
Cookies      3 (1 session-only)
Domains      .google.com, app.example.test
Origins      1
Google cookies present: yes
Expiry       earliest in 718 minutes
```

Exit codes are meant for CI: `0` healthy, `1` missing or expired, `2` present but
malformed. `--json` for machine-readable output, `--within 30` to warn about
cookies expiring inside a window.

```bash
npx test-google-login redact   # safe to paste into an issue
npx test-google-login clear    # delete the session
```

`redact` keeps the shape — names, domains, flags, expiries — and replaces every
value with `«redacted 21 chars»`. Nothing in this package ever prints a value:
`summarizeStorageState` returns names and domains only, and the Worker's
`GET /state` returns a redacted copy.

## The Cloudflare Workers half

```ts
import { GoogleLoginBrowser, handleRequest } from "test-google-login/worker";

export { GoogleLoginBrowser };
export default { fetch: handleRequest };
```

```bash
wrangler secret put TEST_AUTH_SECRET
wrangler deploy
```

A Durable Object per named session, holding one Browser Rendering browser. Why a
DO rather than `puppeteer.launch()` in the Worker: a launch costs seconds and is
billed, so one browser serves a whole suite; and Browser Rendering allows only a
few concurrent sessions per account, which a parallel test run would otherwise
trip. An alarm closes the browser once idle — an *unclosed* session is billed too.

| Route | Does |
| --- | --- |
| `POST /state` | Store a Playwright storage state. Validated on the way in; the response summarises it and never echoes it |
| `GET /state` | A redacted summary. **There is no route that returns live cookies** |
| `DELETE /state` | Forget the session and close the browser |
| `POST /check` | Replay the session against a URL; reports `authenticated`, the landing URL, title, and optionally a screenshot |
| `POST /login` | Real Google sign-in, off unless `ALLOW_REAL_GOOGLE_LOGIN="true"`. Needs `loginUrl` **and** `expectUrl` |
| `POST /close` | Close the browser now rather than waiting for the alarm |

Every request must carry `x-test-auth-secret`. If `TEST_AUTH_SECRET` is not set
the Worker returns `503` to everything rather than serving an anonymous browser to
whoever finds the URL.

```bash
curl -X POST "$WORKER/check?session=signed-in" \
  -H "x-test-auth-secret: $TEST_AUTH_SECRET" \
  -H 'content-type: application/json' \
  -d '{"url":"https://app.example.test/dashboard","expectSelector":"[data-testid=user-menu]","rejectUrl":"/login"}'
```

`rejectUrl` matters: a redirect to `/login` returns `200`, so without it a
signed-out check reads as a pass.

See [`examples/worker-check.ts`](examples/worker-check.ts) for the whole loop.

### Carrying a session between Playwright and Puppeteer

`applyStorageState` / `extractStorageState` convert in both directions, and the
three differences between the formats are each a way to lose a session silently:

- **Session cookies.** Playwright writes `expires: -1`; CDP reads `-1` as an
  expiry in 1969 and drops the cookie. The key must be *omitted*.
- **`sameSite`.** CDP wants exactly `Strict`, `Lax` or `None`. One lowercase
  value rejects the whole batch.
- **`localStorage` needs a document.** There is no blind write — the page has to
  be on the origin first, so restoring it costs one navigation per origin.

```ts
import { applyStorageState } from "test-google-login";

await applyStorageState(page, state, { origins: ["https://app.example.test"] });
```

Narrow `origins` to your own app. A state captured through a real Google sign-in
also holds `accounts.google.com` storage, and navigating a datacentre browser to
Google to restore it is slow and is exactly the traffic its risk checks look for.
A cookie-only state costs **no** navigation at all.

## If you automate Google anyway

```ts
import { signInWithGoogle } from "test-google-login";

setup("real Google OAuth smoke bootstrap", async ({ page, context }) => {
  await signInWithGoogle({ page, context, loginPath: "/login" });
});
```

It refuses to run unless `TEST_GOOGLE_LOGIN_ALLOW_REAL=1` **and** both
`GOOGLE_TEST_EMAIL` and `GOOGLE_TEST_PASSWORD` are set. Restrict that workflow to
a protected branch with environment-scoped secrets, trigger it by hand, and expect
failures that are not your app's fault — Google changes its UI, its labels and its
language, and a datacentre IP makes its risk checks *more* likely.

It waits for your own origin rather than clicking through whatever appears. If a
consent screen, a device check or MFA shows up, the wait times out, which is the
correct outcome: those are the controls protecting the account.

## Refreshing an expired session

```bash
npx test-google-login clear
npx playwright codegen --save-storage=playwright/.auth/google-test-user.json http://localhost:3000
```

With the test-only endpoint, just re-run the setup project — it regenerates state
on its own.

Note that `storageState` covers cookies and `localStorage` (and IndexedDB when you
pass `indexedDB: true`), but **not `sessionStorage`**. If your app keeps anything
there, restore it yourself with an init script.

## API

| Export | Does |
| --- | --- |
| `requireStoredSession(options)` | Assert a usable session exists; returns a safe summary, throws with the fix |
| `bootstrapAppSession(options)` | Mint a session through your test-only endpoint and persist it |
| `signInWithGoogle(options)` | Drive Google's real form. Off unless opted in |
| `loadStorageStateFor(options)` | Read the state for `browser.newContext({ storageState })` |
| `summarizeStorageState(state)` | Counts, domains, names, expiry — no values |
| `redactStorageState(state)` | The same state with every value replaced by its length |
| `findExpiringCookies(state, o)` | Cookies expiring inside a window — the warning before the failure |
| `assertStorageStateUsable(state, o)` | Throw unless still usable, with how long ago it lapsed |
| `readStorageState` / `writeStorageState` | Read; write 0600 |
| `hardenStorageStateFile(file)` | Chmod + validate a file Playwright wrote, preserving its extra keys |
| `applyStorageState(page, state, o)` | Restore a whole session into a Puppeteer page |
| `extractStorageState(page, o)` | Capture one back out, in Playwright's format |
| `to/fromPuppeteerCookies` | Cookie-format conversion, both directions |
| `ensureGitignored` / `writeAuthDirGitignore` | The two gitignore rules |
| `resolveAuthFile` / `codegenCommand` | Path resolution and the capture command |
| `constantTimeEqual` / `isAuthorized` | Secret comparison, usable in a Worker |
| `GoogleLoginBrowser` / `handleRequest` | The Durable Object and the Worker entry |

Full details in the agent skill:
[`skills/test-google-login`](../../skills/test-google-login/SKILL.md).

## Development

```bash
cd packages/test-google-login
bun run test        # no browser is launched
bun run build       # two entries: index (Node) and worker (Cloudflare)
bun run typecheck
```

The suite drives fakes for the page, the browser and the DO's storage, so it runs
anywhere in under a second. The assertions that matter most are the negative ones:
that no value ever reaches a log, a response or a summary.

## License

MIT
