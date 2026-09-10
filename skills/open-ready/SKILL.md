---
name: open-ready
description: Guide to open-ready (packages/open-when-ready), the dev-server wrapper that opens the browser when the server is ready and an AI assistant when it errors — wrapping any CLI command, the --ai-base / --noAi / --noOpen / --pollDelay flags, how ready and error signals are detected, and where the log file goes. Use when working with open-ready or troubleshooting it — the browser never opening, opening too early or at the wrong port, an AI tab opening on a harmless log line, or flags being swallowed by the wrapped command.
---

# Working With open-ready

The wrapper in `packages/open-when-ready`, published as **`open-ready`** (bin `open-ready`, entry `open-when-ready.mjs`). It spawns your dev command, tees its output to a log file, polls that log, and reacts: browser on ready, AI assistant on error.

## Setup

```bash
npx open-ready npm run dev      # no install
npm install -g open-ready       # then: open-ready <command>
```

Node ≥18. It wraps anything that prints to stdout/stderr — `next dev`, `vite`, `bun run dev`, a plain script.

## Flags

| Flag | Default | Effect |
| --- | --- | --- |
| `--ai-base <url>` | `https://perplexity.ai?q=` | Base URL opened on error, with the prompt appended |
| `--noAi` | `false` | Never open an AI tab on error |
| `--noOpen` | `false` | Never open the browser on ready |
| `--pollDelay <ms>` | `1200` | How often the log is re-read |

## How the signals work

- **Error** — a log line matching `error`, `failed`, `exception`, `SyntaxError`, or `⨯`. Up to ~1000 characters of surrounding context are extracted into a pre-filled prompt.
- **Ready** — a line matching `ready - started server` or `Ready in Xms`. The port is then polled until it actually accepts connections before the browser opens.
- **Log file** — `.next/port.log` for Next.js projects, otherwise `open-when-ready.log` in the current directory.

## Recipes

**Swap the assistant** — `open-ready npm run dev --ai-base "https://chatgpt.com/?q="`. Any URL that accepts a query string works.

**CI or headless** — pass both `--noOpen` and `--noAi` and it degrades to a plain pass-through runner.

**Slow-starting servers** — raise `--pollDelay` to reduce log churn; the ready check waits for the port regardless, so a larger delay costs only detection latency.

**In `package.json`** — `"dev": "open-ready next dev"` keeps the behavior for everyone on the team.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Browser never opens | Your dev server prints a ready line the matcher doesn't recognize (only Next.js/Vite-style phrasings are matched). Confirm the phrasing in the log file, or open manually — there is no custom-pattern flag. |
| Browser opens before the app responds | Rare, since the port is polled after the ready signal; if the framework prints ready before binding, raise `--pollDelay`. |
| An AI tab opens on a benign line | The error matcher is substring-based, so a log line containing "error" (e.g. an "0 errors" summary) trips it. Use `--noAi` for noisy servers. |
| Flags land on the wrapped command instead | Everything after the command is forwarded. Put `open-ready`'s own flags at the end (`open-ready npm run dev --noAi`) and check the wrapped tool isn't consuming them. |
| Nothing at all happens | The wrapped command exited immediately or wrote nothing to stdout/stderr. Run it bare first. |
| Log file keeps growing | It's a plain append-only file — delete `open-when-ready.log` / `.next/port.log` between runs if size matters, and gitignore it. |
| Output looks buffered or colorless | The child's output is piped, so tools that detect a TTY may disable colors or batch writes. Force color with the tool's own flag (`--color`, `FORCE_COLOR=1`). |
