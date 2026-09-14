# CLAUDE.md — `verify-phone-sms`

**skill:** [`skills/verify-phone-sms`](../../../skills/verify-phone-sms/SKILL.md)
· **runner:** Vitest · **build:** none (`echo 'No build step needed for Workers'`)

SMS phone-verification API over **AWS SNS**, served by a **Hono** app on
Cloudflare Workers. Entry: `src/verify-phone.ts`.

## Rules — this one sends real messages that cost real money

- **Rate limiting and VoIP blocking are the product**, not overhead. An
  unthrottled verification endpoint is an SMS-pumping target that bills the
  operator. Never relax a limit to make a test pass.
- **Never log a code or a full phone number.** Codes are secrets with a short
  life; numbers are personal data.
- Codes must be compared in constant time and expire. Verification attempts are
  themselves rate-limited, separately from send.
- No build step — `src/*.ts` runs on Workers directly. Node-only APIs will pass
  a Node test and fail in production.
- **Register `/api/*` middleware before the routes it guards.** Hono runs
  middleware only for handlers defined after it, so an `app.use("/api/*", ...)`
  at the bottom of the file silently guards nothing. The API-key check sat
  there until the suite was repaired, leaving every endpoint open.
- **The docs are two endpoints, not one.** `/openapi.json` serves the spec and
  `/docs` serves Swagger UI pointed at it. Registering both on `/docs` makes
  whichever came second dead code.
- **`@hono/zod-openapi` must match the Zod major.** The package is on Zod 4, so
  it needs `@hono/zod-openapi` v1+; the v0.19 line pulls a Zod 3-only
  `zod-to-openapi` and every spec request 500s.
- **Tests must not touch the network.** Both the SNS `Publish` call and the
  sent.dm VoIP lookup go through `fetch`; `test/helpers.ts` stubs it and fails
  on any unexpected host. The VoIP suite used to hit the live lookup and flake
  on its rate limit.

## Layout

`src/verify-phone.ts` (entry) · `src/verify-phone-server.ts` ·
`src/identity-verification-server.ts` · `src/sns.ts` · `src/index.ts`

Tests: `test/helpers.ts` (network stub + request builders) and one file per
concern — `api`, `integration`, `server`, `voip`, `utils`.

```bash
cd packages/verify-phone-sms && bun run test
```

Hono's signature is `app.request(input, requestInit, Env)`. Passing the env as
the second argument makes `c.env` undefined, so every authenticated request
comes back 401 — that mistake accounted for much of the old suite's red.
