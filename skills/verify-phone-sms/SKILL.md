---
name: verify-phone-sms
description: Guide to the SMS verification API in packages/verify-phone-sms — the Hono/Cloudflare Workers server, the verifyPhone() function over AWS SNS, /api/send /api/verify /api/sms endpoints, API-key auth, rate limiting, VoIP blocking via external lookup or libphonenumber-js, and wrangler deploys per environment. Use when working with verify-phone-sms or troubleshooting it — 401s from the API key, SMS that never arrives, AWS SNS sandbox and spending limits, sender-id rules, VoIP false positives, or /api/verify accepting any code.
---

# Working With verify-phone-sms

The service in `packages/verify-phone-sms` (npm name `sms-verification-api`). Two layers: a `verifyPhone()` function that sends an SMS through AWS SNS's HTTP API, and a Hono server (`@hono/zod-openapi`) that exposes it on Cloudflare Workers with auth, rate limiting, and Swagger docs. Exact request/response schemas and options live in [API.md](API.md).

## The one thing to know first

**`/api/verify` is a stub.** The handler returns `{ success: true, verified: true }` for any input — the source comments say code storage and expiry are left to the integrator. Before this is usable for real auth you must persist the issued code (KV, D1, Durable Object, Redis) keyed by phone number with a TTL, and compare against it. Don't ship the endpoint as-is.

## Setup

```bash
npm install
npm run dev            # wrangler dev on http://localhost:8787
npm run deploy         # or deploy:staging / deploy:production
```

Secrets go through Wrangler, not `.env`, for deployed environments:

```bash
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put API_KEY
```

| Variable | Default | |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | — | required |
| `AWS_REGION` | `us-east-1` | must be a region where SNS SMS is available |
| `API_KEY` | — | required; callers send it as `X-API-Key` or `Authorization: Bearer` |
| `SMS_SENDER_ID` | `Verify` | max 11 chars, alphanumeric |

## Picking the right entry point

| You want | Use |
| --- | --- |
| Send a code from your own backend | `import verifyPhone from "sms-verification-api"` — default export, `verifyPhone({ phoneNumber, code, … })` |
| Just a VoIP check | `import { isPhoneNumberVoip } from "sms-verification-api"` |
| A hosted endpoint | `POST /api/send` with `X-API-Key` |
| Any non-verification SMS | `POST /api/sms` with `message` |
| Interactive docs | `GET /docs` (Swagger UI); `GET /` and `GET /health` are unauthenticated health checks |

Note `verifyPhone` requires **both** `phoneNumber` and `code` — it sends the code you give it, it does not generate one. The `/api/send` endpoint generates one for you when the body omits it.

## Recipes

**VoIP blocking** — `blockVoip: true` plus a detection method:

- `voipDetectionMethod: "api"` (default) — external carrier lookup; more accurate, needs network.
- `voipDetectionMethod: "libphonenumber"` — local heuristics (toll-free ranges, non-geographic numbers, repeated/sequential digits). Add `metadataType: "full"` (140 KB vs 75 KB) for real number-type detection instead of pattern guessing.

**Formatting** — `useLibPhoneNumber: true` parses and normalizes loosely formatted input (`555-123-4567`, `+44 20 7946 0958`) before sending.

**Message text** — `messageTemplate: "Your code is: {code}"`; `smsType: "Transactional"` (default) gets delivery priority over `"Promotional"`.

**Auth middleware** — applied to `/api/*` only; the rate limiter (15-minute window, 100 requests per IP, keyed off `CF-Connecting-IP`) runs on every route.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `/api/verify` accepts any code | It's a mock (see above). Implement storage + comparison before relying on it. |
| `401 Unauthorized` | `API_KEY` isn't set for the environment you deployed to, or the header is wrong. Secrets are per-environment — `deploy:staging` needs its own `wrangler secret put --env staging`. |
| SMS never arrives, but the call succeeded | An SNS `messageId` means accepted, not delivered. In the SNS **SMS sandbox** only verified destination numbers receive messages — verify the number or request production access. Also check the account's monthly SMS spend limit. |
| Delivery works for US numbers only | Not every region/route is enabled by default; some countries require sender-id registration or a long code. Check SNS delivery logs per destination country. |
| Sender ID ignored | Many countries (including the US) override or forbid alphanumeric sender ids. Max 11 alphanumeric characters where it is supported. |
| Legitimate mobile numbers blocked as VoIP | Heuristic detection flags toll-free and pattern-y numbers. Switch to `voipDetectionMethod: "api"`, or `metadataType: "full"`, or turn `blockVoip` off. |
| `429` from your own API | The built-in limiter: 100 requests per IP per 15 minutes, before any AWS call. |
| Works in `wrangler dev`, fails deployed | `.env` is dev-only; deployed Workers read Wrangler secrets. Set all four values per environment. |
| AWS `SignatureDoesNotMatch` / `InvalidClientTokenId` | Wrong key pair, or a region mismatch between the credentials and `AWS_REGION`. |
| Codes are logged in responses | `/api/send` echoes the generated code in its response — useful in development, a leak in production. Strip it before exposing the endpoint publicly. |
