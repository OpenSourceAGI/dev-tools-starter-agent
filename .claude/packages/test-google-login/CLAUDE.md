# CLAUDE.md — `test-google-login`

**skill:** [`skills/test-google-login`](../../../skills/test-google-login/SKILL.md)
· **runner:** Vitest · **build:** Vite, two entries (`dist/index.js`, `dist/worker.js`)

Captures a Google sign-in once as a Playwright `storageState`, then reuses it —
in the local suite, in CI, and from a Cloudflare Browser Rendering Durable Object.

## Rules

- **The state file is the credential, not the password.** `playwright/.auth/*.json`
  holds live cookies and tokens. Nothing here may log a value, return one over
  HTTP, write one world-readable, or commit one. Writes are `0600` and the
  directory is `0700` — do not relax either to make something convenient.
- **There is no route and no function that returns a live state over the wire.**
  The Worker's `GET /state` returns `redactStorageState()` output on purpose.
  Adding a "just for debugging" raw route turns this into a credential
  exfiltration endpoint with a test-shaped name.
- **Real Google sign-in stays opt-in and off by default.** Two gates:
  `TEST_GOOGLE_LOGIN_ALLOW_REAL` plus credentials on the Playwright side,
  `ALLOW_REAL_GOOGLE_LOGIN === "true"` plus credentials in the Worker. Never
  default either on, and never add a path around MFA, CAPTCHA or a device check.
- **`src/state-core.ts` must not import a Node builtin.** It is the half the
  Worker bundle pulls in; one `node:fs` there and the deploy fails rather than a
  test. `storage-state.ts` is the filesystem layer and re-exports it, so Node
  callers still see one surface. `grep -n "node:" dist/worker.js` must print
  nothing after a build.
- **No runtime dependencies.** Playwright and `@cloudflare/puppeteer` are optional
  peers; every function takes the `page` / `context` / `request` it needs as an
  argument. That is also what lets the suite run with no browser — keep it that
  way rather than importing either at module scope.
- **The three format differences between Playwright and CDP are load-bearing**
  (session-cookie `expires`, `sameSite` casing, `localStorage` needing a
  document). Each has a test naming the failure it prevents; if you touch
  `puppeteer-state.ts`, those tests are the specification.
- The negative assertions in the suite — "this string does not appear in the
  output" — are the point of several tests. Do not weaken one to accommodate a
  new field.

```bash
cd packages/test-google-login && bun run test && bun run typecheck && bun run build
```
