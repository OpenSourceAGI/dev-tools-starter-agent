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

## Layout

`src/verify-phone.ts` (entry) · `src/verify-phone-server.ts` ·
`src/identity-verification-server.ts` · `src/sns.ts` · `src/index.ts`

```bash
cd packages/verify-phone-sms && bun run test
```
