# Skills

One [Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) per package in this repo, in the same shape as [emilkowalski/skills](https://github.com/emilkowalski/skills): a `SKILL.md` with setup, the calls worth knowing, recipes, and a troubleshooting table — plus an `API.md` for the packages with a large enough surface to warrant one.

Each skill is written from the package's source, not just its README, so the troubleshooting rows cover the real gotchas (flags the README gets wrong, exports that live on a subpath, stubs that return success unconditionally).

## Install

All of them:

```bash
npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent
```

Just one:

```bash
npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill manage-storage
```

## Reference

| Skill | Package | Covers |
| --- | --- | --- |
| [about-system](./about-system/SKILL.md) | `about-system-info` | The system-info CLI and library: blocks, settings file, cache, shell greeting |
| [api2ai](./api2ai/SKILL.md) | `api2ai-mcp-generator` | Generating MCP servers from OpenAPI, tool filtering, the three-layer security model |
| [app-store-buttons](./app-store-buttons/SKILL.md) | `react-app-store-buttons` | Download badges, `appId` vs `href`, native deep links, OS highlighting |
| [cloudflare-to-claude-fix](./cloudflare-to-claude-fix/SKILL.md) | `cloudflare-to-claude-fix` | Queue consumer, routine `/fire` API, secrets, retries and the DLQ |
| [code-tree-graph](./code-tree-graph/SKILL.md) | `code-tree-graph` | `DependencyGraph`, `FileTreeView`, `TypeTable`, and the AST engine |
| [create-cloud-db](./create-cloud-db/SKILL.md) | `create-cloud-db` | Turso database creation and the `.env` rewrite |
| [create-starter-app](./create-starter-app/SKILL.md) | `create-starter-app` | The template menu, how templates resolve, which ids actually exist |
| [export-svg-typescript](./export-svg-typescript/SKILL.md) | `export-svg-icons-typescript` | SVG folder → tree-shakable TS barrel, runtime color and size options |
| [git0](./git0/SKILL.md) | `git0-repo-downloader` | Search, download, auto-install, IDE launch, rate limits |
| [manage-storage](./manage-storage/SKILL.md) | `manage-storage` | S3 / R2 / B2 through one call, provider detection, edge credentials |
| [open-ready](./open-ready/SKILL.md) | `open-when-ready` | Dev-server wrapper: ready/error detection, flags, log locations |
| [server-shell-setup](./server-shell-setup/SKILL.md) | `server-shell-setup` | The bootstrap installer, components, fish aliases |
| [shadcn-theme-menu](./shadcn-theme-menu/SKILL.md) | `shadcn-theme-menu` | Theme provider and switchers, color themes vs dark mode |
| [verify-phone-sms](./verify-phone-sms/SKILL.md) | `verify-phone-sms` | SNS-backed SMS verification, endpoints, auth, VoIP blocking |
| [web2mobile](./web2mobile/SKILL.md) | `web2mobile-wrapper` | Website → Expo WebView app, asset generation, EAS build/submit |

## Adding a skill for a new package

Create `skills/<name>/SKILL.md` with YAML frontmatter — `name` matching the directory, and a `description` that names the package, lists what the skill covers, and ends with a `Use when …` clause naming concrete symptoms. That description is the only thing an agent sees when deciding whether to load the skill, so it does the triggering work. Keep the body to setup → which call to reach for → recipes → a symptom/cause/fix table, and split exhaustive prop or option tables into `API.md`.
