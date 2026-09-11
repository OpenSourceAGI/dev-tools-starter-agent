<p align="center">
    <img width="800px" src="https://i.imgur.com/lyvk8iy.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/open-when-ready"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/open-when-ready"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/open-ready"><img src="https://img.shields.io/npm/dm/open-ready.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/open-ready"><img src="https://img.shields.io/npm/v/open-ready.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/open-ready"><img src="https://img.shields.io/npm/dt/open-ready.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/open-ready"><img src="https://img.shields.io/npm/types/open-ready" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=open-ready"><img src="https://packagephobia.com/badge?p=open-ready" alt="Install size" /></a>
</p>
<!-- template-git-repo:badges:end -->

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

Please star this repo for updates! 🌟
