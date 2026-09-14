---
name: cloudflare-to-claude-fix
description: Guide to cloudflare-to-claude-fix (packages/cloudflare-to-claude-fix), the Cloudflare Queue consumer that fires a Claude Code routine when a Workers build fails — creating the queue and DLQ, enabling build Event Subscriptions, the routine /fire API and its beta header, the ROUTINE_FIRE_URL / ROUTINE_FIRE_TOKEN / NOTIFY_WEBHOOK_URL secrets, retries, and local testing. Use when working with this Worker or troubleshooting it — routines that never fire, 400/401/403/404/429 from the fire endpoint, messages piling up in the dead-letter queue, or build events that never reach the consumer.
---

# Working With cloudflare-to-claude-fix

The Worker in `packages/cloudflare-to-claude-fix`. It consumes Cloudflare Workers **build events** from a queue, and for `status === "failed"` it POSTs the failure context to a Claude Code routine's `/fire` endpoint so an agent starts debugging. Requires Workers Paid (queues) and a Claude plan with Claude Code on the web.

## Setup

Five steps, in order — skipping any one produces a silent no-op rather than an error:

1. **Queues** — `wrangler queues create workers-build-events` and `wrangler queues create workers-build-events-dlq`.
2. **Event Subscriptions** on the Worker you want watched: Workers & Pages → Settings → Event Subscriptions → queue `workers-build-events`, with build started/succeeded/failed/cancelled enabled. This consumer acks and discards everything that isn't a failure.
3. **A routine** at [claude.ai/code/routines](https://claude.ai/code/routines), pointed at the repo that Worker deploys from, with an **API trigger**. Generate the token (shown once) and copy the fire URL.
4. **Secrets** — `wrangler secret put ROUTINE_FIRE_URL`, `ROUTINE_FIRE_TOKEN`, and optionally `NOTIFY_WEBHOOK_URL` (Slack or Discord incoming webhook). Never commit these.
5. **Deploy** — `wrangler deploy`.

## What the consumer does

For each failed build it formats `build_id`, `worker_name`, `branch`, `commit_hash`, `author`, `timestamp`, and `error_messages` into one plaintext block (capped at 65,536 characters), POSTs it, and — if `NOTIFY_WEBHOOK_URL` is set — posts the returned `claude_code_session_url` to your chat channel. A failed POST calls `retry()`; after 3 attempts the message lands in the DLQ.

## The `/fire` API

```
POST https://api.anthropic.com/v1/claude_code/routines/{routine_id}/fire
Authorization: Bearer sk-ant-oat01-…
anthropic-version: 2023-06-01
anthropic-beta: experimental-cc-routine-2026-04-01
Content-Type: application/json

{ "text": "<up to 65,536 chars>" }
```

Response: `{ "type": "routine_fire", "claude_code_session_id": …, "claude_code_session_url": … }`.

| Status | Meaning |
| --- | --- |
| `400` | Missing beta header, text over 65,536 chars, or the routine is paused |
| `401` | Wrong or missing bearer token |
| `403` | Account lacks Claude Code on the web |
| `404` | Routine id not found |
| `429` | Daily run allowance exhausted |

## Recipes

**Local test** — publish a synthetic failure and watch it flow:

```bash
wrangler queues publish workers-build-events --message '{"build_id":"build_test001","status":"failed","worker_name":"my-api","branch":"feat/x","commit_hash":"abc1234","author":"you@example.com","error_messages":["Error: Cannot find module ./utils"],"timestamp":"2026-05-01T19:00:00Z"}'
wrangler tail cloudflare-to-claude-fix
```

**Rotate the token** — regenerate it on the routine's API trigger (which immediately revokes the old one), then `wrangler secret put ROUTINE_FIRE_TOKEN` again.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Builds fail but nothing fires | Event Subscriptions aren't enabled on the *target* Worker, or point at a different queue. Verify with `wrangler tail` that messages arrive at all. |
| `400` from `/fire` | Usually the missing `anthropic-beta` header, or a payload over 65,536 characters (very long build logs) — truncate before sending. Also check the routine isn't paused. |
| `401` | The token was rotated (generating a new one revokes the old immediately) or the secret wasn't re-put after rotation. |
| `403` | The account behind the token doesn't have Claude Code on the web. |
| `404` | `ROUTINE_FIRE_URL` has the wrong `trig_…` id, or the routine was deleted. |
| `429` | Daily routine-run allowance exhausted; fires resume the next day. Consider filtering which Workers publish build events. |
| Messages pile up in the DLQ | Three consecutive fire failures. Read one message to see which status code you're getting, fix the cause, then re-publish it to the main queue. |
| Successful builds trigger runs | They shouldn't — only `status === "failed"` is acted on; everything else is acked. If you see otherwise, check for a second consumer bound to the same queue. |
| No Slack/Discord message | `NOTIFY_WEBHOOK_URL` unset or wrong; it's optional and failures there don't block the fire. |
| Secrets visible in the repo | They must only exist as Wrangler secrets. If one leaked, rotate the routine token immediately. |
