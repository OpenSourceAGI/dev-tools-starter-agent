# open-ready

Smart dev server launcher that watches your server's output and automatically opens the browser when ready — or opens an AI assistant with the error context when something goes wrong.

Works with Next.js, Vite, and any CLI-based dev server.

## Install

```sh
npm install -g open-ready
# or use without installing:
npx open-ready <your-dev-command>
```

## Usage

```sh
open-ready <command> [options]
```

### Examples

```sh
open-ready npm run dev
open-ready bun run dev
open-ready vite
open-ready next dev
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--ai-base <url>` | `https://perplexity.ai?q=` | AI assistant base URL to open on error |
| `--noAi` | `false` | Disable opening AI on error |
| `--noOpen` | `false` | Disable opening browser when ready |
| `--pollDelay <ms>` | `1200` | How often to poll the log for ready/error signals |

### Disable AI on error

```sh
open-ready npm run dev --noAi
```

### Use a different AI assistant

```sh
open-ready npm run dev --ai-base "https://chatgpt.com/?q="
```

## How it works

1. Spawns your dev command and pipes its stdout/stderr to a log file
2. Polls the log every `pollDelay` ms looking for:
   - **Error signal** — lines matching `error`, `failed`, `exception`, `SyntaxError`, or `⨯`
   - **Ready signal** — lines matching `ready - started server` or `Ready in Xms`
3. On **error**: extracts up to ~1000 chars of surrounding context and opens your AI assistant with a pre-filled prompt explaining the error and asking for a fix
4. On **ready**: waits for the port to be reachable, then opens the local URL in your default browser

For Next.js projects, the log is written to `.next/port.log`; otherwise `open-when-ready.log` in the current directory.

## License

MIT

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
