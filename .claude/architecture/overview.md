# Catalog

Not one product — a shelf of independent tools. Each package below publishes on
its own, has its own README, and has its own agent skill under
[`skills/`](../../skills/). Cross-package imports are rare and deliberate.

## Apps (`apps/`)

| App | Stack | Owns |
| --- | --- | --- |
| `docs` | Next.js + Fumadocs, **Biome** | The documentation site (starterdocs.vtempest.workers.dev): AI chat, full-text search, auto-generated API reference from TS types and OpenAPI. Pulls package READMEs in via `docs:sync`. |
| `Cloud-Computer-Control-Panel` | Next.js, Drizzle | Cloud infrastructure dashboard — provisions AWS EC2, installs Dokploy, manages containers and encrypted credentials |
| `cccp-vscode-ext` | VS Code extension | The CCCP dashboard in the editor sidebar. **Imports CCCP's own React components unchanged** and routes their `/api` calls through the extension host — so a change to CCCP's components can break the extension. |
| `vscode-cloud` | Cloudflare Workers + Containers + Durable Objects | Per-user code-server instances; Cloudflare Access for SSO, a Durable Object holding the per-user password in SQLite, a Worker routing to the right container |

## Packages (`packages/`)

Published unless marked. **Directory name → npm name** differs often; the npm
name is what turbo filters and `--skill` flags use.

| Directory | npm name | What it owns |
| --- | --- | --- |
| `about-system-info` | `about-system` | Cross-platform CLI printing CPU/memory/disk/uptime/IP/ISP as one emoji line; also a desktop app under `native/` |
| `api2ai-mcp-generator` | `api2ai` | Generates MCP servers from any OpenAPI spec (mcp-use); HTTP/SSE/Streamable transports, inspector UI, Zod validation |
| `cloudflare-to-claude-fix` | `cloudflare-to-claude-fix` | Workers Queue consumer that fires a Claude Code routine when a Workers build fails |
| `code-tree-graph` | `code-tree-graph` | Fumadocs/Next components: `DependencyGraph` (Mermaid from AST), `FileTreeView`, `TypeTable` — all from a local parser, no external service |
| `create-cloud-db` | `create-cloud-db` | CLI that creates a Turso database and writes `TURSO_*` into `.env` |
| `create-starter-app` | `create-starter-app` | Interactive CLI that scaffolds from `starter-templates/` |
| `export-svg-icons-typescript` | `export-svg-typescript` | Turns a directory of SVGs into a typed TS icon module |
| `git0-repo-downloader` | `git0` | GitHub search + source/release downloader. Bins: `git0`, `g`, `gg`, `fm`. **Runs on `bun test`.** |
| `legal-terms-privacy-policy` | `legal-terms-privacy-policy` | Configurable ToS/Privacy Policy with a scannable summary; React renderer + CLI |
| `manage-storage` | `manage-storage` | One storage API over AWS S3, Backblaze B2 and Cloudflare R2 |
| `native-app-wrapper` | *(private)* | Tauri scaffold packaging a website or bundled CLI as a native desktop app |
| `open-when-ready` | `open-ready` | Dev-server launcher: on error → AI search, on success → open the browser |
| `react-app-store-buttons` | `react-app-store-buttons` | App Store / Play / platform download buttons for React |
| `server-shell-setup` | *(not a workspace)* | Plain shell scripts: `install-shell.sh`, `get-node.sh`, `clean-server-disk.sh`. No `package.json`, no build, no tests. |
| `setup-git-repo` | `setup-git-repo` | One command to set up a GitHub repo: Turborepo, CI workflows, README badges |
| `template-git-repo` | `template-git-repo` | The badge/README **catalog** that both `setup-git-repo` and `scripts/sync-package-readmes.mjs` build on — one definition of what a badge is, used twice |
| `verify-phone-sms` | `verify-phone-sms` | SMS phone verification over AWS SNS, Hono server on Workers. No build step. |
| `web2mobile-wrapper` | `create-mobile-wrapper` *(private)* | Expo/EAS scaffold wrapping a website as a mobile app. **Runs on Jest.** |

## The couplings that do exist

There are only a few, and they are worth knowing before you edit:

- **`template-git-repo` → `scripts/sync-package-readmes.mjs` and
  `setup-git-repo`.** The badge catalog and the "skip a badge whose inputs are
  missing" rule live in `template-git-repo`. Changing it changes every package
  README header and the repos `setup-git-repo` scaffolds.
- **`Cloud-Computer-Control-Panel` → `cccp-vscode-ext`.** The extension imports
  the app's React components unchanged. Renaming or changing the props of a
  CCCP component breaks the extension.
- **`create-starter-app` → `starter-templates/`.** The CLI's template list must
  match the directories. See [templates.md](templates.md).
