---
name: test-google-login
description: Guide to test-google-login (packages/test-google-login), the Google sign-in test harness — persisting a Playwright storageState under playwright/.auth/, the requireStoredSession setup-project guard, bootstrapAppSession against a test-only endpoint, the opt-in signInWithGoogle real-Google path, the storageState↔Puppeteer cookie conversion, and the Cloudflare Browser Rendering Durable Object that replays a session. Use when working with test-google-login or troubleshooting Google-login E2E tests — a suite that suddenly redirects to /login, "Missing persisted auth state", an expired or stale state file, cookies that restore but localStorage that does not, session cookies vanishing in Puppeteer, a CDP "invalid cookie fields" error, a Worker returning 503 or 401, real Google sign-in hitting a consent screen or CAPTCHA, or deciding where a storage-state file may safely go.
---

# Working With test-google-login

The package in `packages/test-google-login`, published as **`test-google-login`**.
Two entry points from one session file: `test-google-login` (Node/Playwright) and
`test-google-login/worker` (Cloudflare Browser Rendering Durable Object). Zero
runtime dependencies — Playwright and `@cloudflare/puppeteer` are optional peers,
and every function takes the `page` / `context` / `request` it needs as an
argument. Exact signatures in [API.md](API.md).

## The thing to get right before anything else

`playwright/.auth/google-test-user.json` **is a live credential**, not a config
file. It can hold the app's session cookie, Google's `accounts.google.com`
cookies, OAuth tokens in `localStorage`/IndexedDB, and sometimes something
refresh-capable. A password in `.env` protects none of that.

The package enforces what it can — `0700` directory, `0600` file, two gitignore
rules, a redacted-only read path — and the rest is process:

- dedicated Google test account, nothing sensitive on it
- never committed, never a public CI artifact, never pasted into a log or issue
- `test-google-login redact` is the shareable form
- regenerate rather than repair when it stops working

If a change would log a value, return one over HTTP, or loosen a file mode, that
is the thing to push back on.

## Setup

```bash
bun add -d test-google-login
npx test-google-login init          # 0700 dir + both gitignore rules + the codegen command
```

Then capture once, by hand:

```bash
npx playwright codegen --save-storage=playwright/.auth/google-test-user.json http://localhost:3000
```

Sign in with the dedicated account, finish the redirect back to **your** app,
confirm an authenticated page, close the window. Playwright writes on exit.

Manual on purpose: Google may require MFA, a CAPTCHA or a device check, and
scripting its password form is the brittle part of every other approach.

## Picking the right call

| You want | Call |
| --- | --- |
| A setup project that fails usefully on the first run | `requireStoredSession({ baseUrl })` |
| CI to create the session itself, no Google involved | `bootstrapAppSession({ request, page, context, secret })` |
| To actually drive Google's form (smoke test only) | `signInWithGoogle({ page, context })` — refuses unless opted in |
| The state for `browser.newContext()` | `loadStorageStateFor()` |
| To know if a state is still good, in code | `summarizeStorageState(state)` → `.usable`, `.expired`, `.expiresInSeconds` |
| To fail a run early on a stale state | `assertStorageStateUsable(state)` |
| To warn before a long run | `findExpiringCookies(state, { withinMs })` |
| Something printable | `redactStorageState(state)`, or `summarizeStorageState` (values never in it) |
| To write a state yourself | `writeStorageState(file, state)` — 0600 |
| To tighten a file Playwright wrote | `hardenStorageStateFile(file)` — keeps its `indexedDB` key |
| To restore a session into a Puppeteer page | `applyStorageState(page, state, { origins })` |
| To capture one out of a Puppeteer page | `extractStorageState(page, { origins })` |
| Just the cookie conversion | `toPuppeteerCookies` / `fromPuppeteerCookies` |
| To compare a secret in a Worker | `constantTimeEqual(supplied, expected)` |
| The Worker half | `GoogleLoginBrowser`, `handleRequest` from `test-google-login/worker` |

## Recipes

**The setup-project layout.** Two projects, so the check runs once per run rather
than once per file:

```ts
// playwright.config.ts
import { DEFAULT_AUTH_FILE } from "test-google-login";

projects: [
  { name: "auth-setup", testMatch: /.*\.setup\.ts/ },
  { name: "chromium", dependencies: ["auth-setup"], use: { storageState: DEFAULT_AUTH_FILE } },
]
```

```ts
// tests/auth.setup.ts
import { requireStoredSession } from "test-google-login";

setup("an authenticated session is available", () => {
  requireStoredSession({ baseUrl: process.env.E2E_BASE_URL });
});
```

Import `DEFAULT_AUTH_FILE` rather than retyping the path — a config and a CLI on
different paths present identically to an expired session.

**CI: let the app mint it.** Never make a Google password a repo secret a fork's
PR can reach. Add a test-only endpoint on staging that creates *the same session*
the real Google callback creates, and hold one secret of your own:

```ts
await bootstrapAppSession({
  request, page, context,
  secret: process.env.E2E_TEST_AUTH_SECRET,   // required; never defaulted
  endpoint: "/api/test-auth/google-user",
  landingPath: "/dashboard",
});
```

The endpoint must 404 in production (ideally not be in the bundle at all),
compare its secret in constant time, and produce the identical session format,
claims, roles and cookie attributes. An endpoint that mints a subtly different
session turns the suite into a test of a code path that never ships. Worked
example: `packages/test-google-login/examples/test-auth-endpoint.ts`.

**Narrow the origins when restoring.** A state captured through a real Google
sign-in also carries `accounts.google.com` storage. Restoring it means navigating
the test browser to Google — slow, and exactly the traffic its risk checks look
for:

```ts
await applyStorageState(page, state, { origins: ["https://app.example.test"] });
```

A cookie-only state costs no navigation at all.

**The Worker.** One Durable Object per named session, holding one browser:

```ts
import { GoogleLoginBrowser, handleRequest } from "test-google-login/worker";
export { GoogleLoginBrowser };
export default { fetch: handleRequest };
```

```bash
wrangler secret put TEST_AUTH_SECRET && wrangler deploy
```

`POST /state` stores, `GET /state` returns a **redacted** summary, `POST /check`
replays and reports, `POST /close` closes now. Every request carries
`x-test-auth-secret`; `?session=<name>` picks the DO.

Always pass `rejectUrl` to `/check`. A redirect to `/login` returns `200`, so
without it a signed-out check reads as a pass:

```json
{ "url": "https://app.example.test/dashboard", "expectSelector": "[data-testid=user-menu]", "rejectUrl": "/login" }
```

**Real Google, if you must.** `signInWithGoogle` needs
`TEST_GOOGLE_LOGIN_ALLOW_REAL=1` plus `GOOGLE_TEST_EMAIL` and
`GOOGLE_TEST_PASSWORD`; the Worker's `POST /login` needs
`ALLOW_REAL_GOOGLE_LOGIN="true"` plus the same two secrets, and `POST /login`
requires an explicit `expectUrl` — it is not defaulted to the login page's origin,
because the flow starts there and the wait would pass before sign-in ever
happened. Manually triggered,
protected branch, environment-scoped secrets, and expect failures that are not
the app's fault. It waits for your own origin rather than clicking through
whatever appears — a consent screen or device check times out, which is correct.

## The three format differences that lose a session silently

Each has a test in `test/puppeteer-state.test.ts` naming the failure it prevents.
If you are hand-rolling any of this, these are the bugs you will hit:

| Difference | What happens if you miss it |
| --- | --- |
| Playwright writes `expires: -1` for a session cookie | CDP reads `-1` as an expiry in 1969 and drops the cookie. The key must be **omitted**, not negative |
| CDP wants `sameSite` as exactly `Strict` / `Lax` / `None` | One lowercase value rejects the whole `setCookie` batch |
| `localStorage` can only be written through a document on its origin | There is no blind write; restoring costs one `goto` per origin, before the app's own code runs |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Missing persisted auth state: …` | No session captured yet | Run the `playwright codegen` command in the error verbatim |
| Suite redirects to `/login`, selectors time out | The stored session expired | `npx test-google-login check` — exits 1 and tells you how long ago. Re-capture |
| `Not a Playwright storage state: not valid JSON` | Something else wrote to that path (often an HTML error page) | `test-google-login clear`, re-capture. `check` exits **2** here, not 1 |
| Cookies restore but the app is still signed out | The session lives in `localStorage`/IndexedDB, not a cookie | Pass `indexedDB: true` when capturing; confirm `summarizeStorageState().originCount > 0` |
| Works on the first navigation, fails after a reload | `localStorage` was not restored — usually `origins` narrowed too far | Include your app's origin in `applyStorageState`'s `origins` |
| CDP error about invalid cookie fields | A lowercase `sameSite`, or `expires: -1` passed straight through | Use `toPuppeteerCookies`, or `normalizeStorageState` on a hand-edited file |
| Session cookies missing after `applyStorageState` | `expires: -1` was sent instead of omitted | `toPuppeteerCookies` already handles it — don't build the cookie list by hand |
| `page.setCookie is not a function` | Puppeteer 23+ moved it to `browserContext.setCookie` | The thrown error says so; set them on the context, or use an older page API |
| Worker returns `503 not_configured` | `TEST_AUTH_SECRET` is unset — it refuses everything by design | `wrangler secret put TEST_AUTH_SECRET` |
| Worker returns `401 Unauthorized` | Missing or wrong `x-test-auth-secret` | Check the header name; the response names it in `x-required-header` |
| Worker `/check` returns `409 no_state` | Nothing stored for that session name | `POST /state` first — and check `?session=` matches |
| `/check` says `authenticated: true` on the login page | No `rejectUrl` passed; a login redirect is still a `200` | Pass `rejectUrl: "/login"` and/or `expectSelector` |
| `POST /login` returns `403 disabled` | `ALLOW_REAL_GOOGLE_LOGIN` is not exactly `"true"`, or credentials are missing | Intentional. Prefer capturing locally instead |
| Real Google sign-in times out mid-flow | Consent screen, device check, CAPTCHA or MFA | Do not automate around it. Capture by hand with `codegen` |
| Browser Rendering concurrency errors | More than a few concurrent sessions per account | Route through one DO per session name; the DO serialises and reuses its browser |
| A surprise Browser Rendering bill | A session left open | The idle alarm closes it (`BROWSER_IDLE_MINUTES`, default 3); `POST /close` closes now |
| `bun run build` then the Worker fails to start | A `node:` import reached `src/state-core.ts` | `grep -n "node:" dist/worker.js` must print nothing. Keep fs in `storage-state.ts` |
| Something that worked in a test fails in the app | `sessionStorage` is **not** in `storageState` | Restore it yourself with an init script |

## Repo conventions

- Runner **Vitest**, build **Vite** with two entries. `bun run test` launches no
  browser: the suite drives fakes for the page, browser and DO storage.
- Several tests are negative assertions — "this value does not appear in the
  output". Do not weaken one to accommodate a new field; that is the feature.
- `src/state-core.ts` is the Worker-safe half and must stay free of Node builtins;
  `src/storage-state.ts` is the filesystem layer and re-exports it.
- Update `README.md`, this skill and `packages/test-google-login/CLAUDE.md` when
  public behaviour changes.
