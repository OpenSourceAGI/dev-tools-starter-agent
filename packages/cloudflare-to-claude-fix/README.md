<p align="center">
    <img width="400px" src="https://i.imgur.com/RQP3lma.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/cloudflare-to-claude-fix"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://www.npmjs.com/package/cloudflare-to-claude-fix"><img src="https://img.shields.io/npm/dm/cloudflare-to-claude-fix.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/cloudflare-to-claude-fix"><img src="https://img.shields.io/npm/v/cloudflare-to-claude-fix.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/cloudflare-to-claude-fix"><img src="https://img.shields.io/npm/dt/cloudflare-to-claude-fix.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/cloudflare-to-claude-fix"><img src="https://img.shields.io/npm/types/cloudflare-to-claude-fix" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=cloudflare-to-claude-fix"><img src="https://packagephobia.com/badge?p=cloudflare-to-claude-fix" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill cloudflare-to-claude-fix` ([what it covers](../../skills/cloudflare-to-claude-fix/SKILL.md))
<!-- skills:install:end -->

A Cloudflare Workers **Queue consumer** that fires a **Claude Code routine** whenever a Workers build fails. Required Workers Paid and Claude Pro.

---

## Setup

### 1. Clone / copy this project

```bash
git clone <your-repo>
cd cloudflare-to-claude-fix
npm install
```

### 2. Create the Cloudflare Queue

```bash
# Main queue
wrangler queues create workers-build-events

# Dead-letter queue (catches messages that fail all 3 retries)
wrangler queues create workers-build-events-dlq
```

### 3. Enable Event Subscriptions on your target Worker

In the Cloudflare dashboard:

1. Open **Workers & Pages** → select the Worker you want to monitor
2. Go to **Settings** → **Event Subscriptions**
3. Set the queue to `workers-build-events`
4. Enable: **Build started**, **Build succeeded**, **Build failed**, **Build cancelled**

This Worker only acts on `status === "failed"` events; the rest are acknowledged and discarded.

### 4. Create a Claude Code routine

1. Go to [claude.ai/code/routines](https://claude.ai/code/routines)
2. Click **New routine**
3. Configure:
   - **Prompt:** e.g. *"A Cloudflare Workers build has failed. The build ID, branch, commit, author and error log are below. Investigate the error, identify the root cause, and push a fix to the branch. Summarise what you changed."*
   - **Repository:** the repo that this Worker is deployed from
4. Under **Select a trigger** → **Add another trigger** → choose **API**
5. Click **Generate token** — copy the token (shown **once**)
6. Copy the full fire URL shown in the modal (format: `https://api.anthropic.com/v1/claude_code/routines/trig_<id>/fire`)

### 5. Store secrets in Wrangler

```bash
# Required
wrangler secret put ROUTINE_FIRE_URL
# paste: https://api.anthropic.com/v1/claude_code/routines/trig_<id>/fire

wrangler secret put ROUTINE_FIRE_TOKEN
# paste: sk-ant-oat01-...

# Optional — post session link to Slack or Discord
wrangler secret put NOTIFY_WEBHOOK_URL
# paste: https://hooks.slack.com/services/... (Slack)
#    or: https://discord.com/api/webhooks/...  (Discord)
```

> **Never** commit secrets to source control or paste them in plaintext anywhere.

### 6. Deploy

```bash
wrangler deploy
```

---

## How it works

1. Cloudflare Builds publishes a `BuildEvent` message to `workers-build-events` when a build status changes.
2. This consumer Worker receives the batch. Non-failure messages are `ack()`-ed immediately.
3. For `status === "failed"` messages the Worker:
   - Formats the `build_id`, `worker_name`, `branch`, `commit_hash`, `author`, `timestamp`, and `error_messages` into a single plaintext block (≤ 65,536 chars).
   - POSTs that block to the Claude Code routine `/fire` endpoint.
   - If `NOTIFY_WEBHOOK_URL` is set, posts the resulting `claude_code_session_url` to Slack/Discord so your team can watch the live debugging session.
4. If the fire request fails, the message is `retry()`-ed up to 3 times (configured in `wrangler.toml`). After 3 failures the message lands in `workers-build-events-dlq`.

---

## Claude Code routine `/fire` API quick-reference

```
POST https://api.anthropic.com/v1/claude_code/routines/{routine_id}/fire
Authorization: Bearer sk-ant-oat01-...
anthropic-version: 2023-06-01
anthropic-beta: experimental-cc-routine-2026-04-01
Content-Type: application/json

{ "text": "<up to 65,536 chars of context>" }
```

**Response:**

```json
{
  "type": "routine_fire",
  "claude_code_session_id": "session_01...",
  "claude_code_session_url": "https://claude.ai/code/session_01..."
}
```

| Status  | Cause                                                          |
| ------- | -------------------------------------------------------------- |
| `400` | Missing beta header, text > 65 536 chars, or routine is paused |
| `401` | Wrong or missing bearer token                                  |
| `403` | Account doesn't have Claude Code on the web                    |
| `404` | Routine ID not found                                           |
| `429` | Daily run allowance exhausted                                  |

---

## Revoking / rotating the routine token

1. Open [claude.ai/code/routines](https://claude.ai/code/routines) → edit the routine
2. Click the API trigger → **Generate token** (this immediately revokes the old one)
3. Update the secret: `wrangler secret put ROUTINE_FIRE_TOKEN`

---

## Local testing

Send a synthetic failed-build message to the queue:

```bash
wrangler queues publish workers-build-events \
  --message '{
    "build_id": "build_test001",
    "status": "failed",
    "worker_name": "my-api",
    "branch": "feat/new-endpoint",
    "commit_hash": "abc1234",
    "author": "alex@example.com",
    "error_messages": ["Error: Cannot find module '\''./utils'\''", "    at Object.<anonymous> (src/index.ts:3:1)"],
    "timestamp": "2026-05-01T19:00:00Z"
  }'
```

Then tail logs to verify:

```bash
wrangler tail cloudflare-to-claude-fix
```

---

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
