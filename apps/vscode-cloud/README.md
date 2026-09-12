<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/apps/vscode-cloud"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" />
</p>
<!-- template-git-repo:badges:end -->

# vscode-cloud

Per-user [code-server](https://github.com/coder/code-server) instances on Cloudflare Containers — one isolated VS Code environment per authenticated user, with workspace files persisted to R2, GitHub repos auto-cloned on first boot, a team management dashboard, and WakaTime time tracking pre-installed.

## Architecture

```
Browser
  │
  ▼
Worker  (auth + routing)
  ├─ CF Access JWT  ─────────┐
  ├─ Google OAuth session ───┤──▶ AuthUser { email, userId }
  └─ Dev mode header ────────┘
          │
          ├─ /admin/*  ──▶  Teams handler  ──▶  D1  (teams / members / invites)
          │
          └─ /*  ──▶  Durable Object  (per user, named by userId)
                          ├─ SQLite: userId → R2 prefix
                          └─ Container  (code-server on :8080)
                               ├─ geesefs FUSE → R2: users/{userId}/
                               ├─ git clone → GITHUB_REPOS
                               └─ ~/.wakatime.cfg  (if WAKATIME_API_KEY set)
```

- **One Durable Object + Container per user** — fully isolated VS Code environments keyed by sanitised email.
- **Passwordless** — auth is enforced at the Worker layer (CF Access JWT or Google OAuth). `code-server` runs with `--auth none`; the container is never directly reachable.
- **R2 workspace persistence** — [geesefs](https://github.com/yandex-cloud/geesefs) mounts the R2 bucket at `/home/coder/workspace` via FUSE; reads/writes sync automatically.
- **GitHub repo auto-cloning** — set `GITHUB_REPOS` to clone repos into the workspace on container start.
- **Teams dashboard** — create teams, invite members by email, manage roles, and see live container status per member.
- **WakaTime time tracking** — extension pre-installed in every container; optionally auto-configured via `WAKATIME_API_KEY`.
- **AI coding tools** — Claude Code and Codex CLIs installed globally; available in every terminal session.
- **Idle cost control** — containers sleep after configurable inactivity (`SLEEP_AFTER`) and wake automatically on next request.

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- [Docker](https://docs.docker.com/get-docker/) (required to build the container image locally)
- A Cloudflare account on the **Workers Paid** plan ($5/mo minimum)

### 1. Install dependencies

```bash
cd apps/vscode-cloud
npm install
```

### 2. Log in to Cloudflare

```bash
wrangler login
```

### 3. Create cloud resources

```bash
# R2 bucket for workspace files (one shared bucket, per-user prefixes)
wrangler r2 bucket create vscode-cloud-workspaces

# D1 database for teams, members, and invites
wrangler d1 create vscode-cloud-teams
# → Copy the returned database_id into wrangler.jsonc → d1_databases[0].database_id

# KV namespace for Google OAuth sessions (skip if using CF Access instead)
wrangler kv namespace create SESSION_STORE
# → Copy the returned id into wrangler.jsonc → kv_namespaces[0].id
```

### 4. Set secrets

```bash
# R2 API token — generate at dash.cloudflare.com → R2 → Manage R2 API tokens
# Grant "Object Read & Write" on the vscode-cloud-workspaces bucket
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_ACCOUNT_ID        # your Cloudflare account ID

# Google OAuth client secret (only needed for Google OAuth auth)
wrangler secret put GOOGLE_CLIENT_SECRET

# GitHub PAT with repo scope (only needed for private repos in GITHUB_REPOS)
wrangler secret put GITHUB_TOKEN
```

### 5. Configure `wrangler.jsonc`

Open `wrangler.jsonc` and fill in the blanks:

```jsonc
"d1_databases": [{ "database_id": "<paste from step 3>" }],
"kv_namespaces":  [{ "id":          "<paste from step 3>" }],

"vars": {
  "GOOGLE_CLIENT_ID": "<your-client-id>.apps.googleusercontent.com",
  "ADMIN_EMAILS":     "you@example.com",          // platform-wide admin access
  "WAKATIME_API_KEY": "",                          // optional — see WakaTime section
  "GITHUB_REPOS":     "myorg/frontend,myorg/api", // optional
  "SLEEP_AFTER":      "30m"
}
```

### 6. Deploy

```bash
wrangler deploy
```

The Worker URL is printed at the end:
```
https://vscode-cloud.<your-subdomain>.workers.dev
```

---

## Auth setup

### Option A — Cloudflare Access (recommended for teams)

Best if your organisation already uses Cloudflare One. CF Access validates the `Cf-Access-Jwt-Assertion` JWT before the request reaches the Worker.

1. Go to [Cloudflare One](https://one.dash.cloudflare.com/) → **Access** → **Applications** → **Add** → **Self-hosted**
2. Set the application domain to your Worker URL (e.g. `code.example.com`)
3. Add an **Allow** policy scoped to your team's emails or identity provider
4. Copy the **AUD tag** from the application's Basic information tab

```jsonc
// wrangler.jsonc
"vars": {
  "TEAM_DOMAIN": "https://yourteam.cloudflareaccess.com",
  "POLICY_AUD":  "<aud-tag>"
}
```

```bash
wrangler deploy
```

### Option B — Google OAuth

Simpler for public-facing deployments. Sessions are stored as 7-day KV entries.

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → **Create OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Authorised redirect URI: `https://vscode-cloud.<subdomain>.workers.dev/auth/callback`
4. Copy the **Client ID** and **Client Secret**

```bash
# Create the KV namespace (if not done in step 3 above)
wrangler kv namespace create SESSION_STORE
# Paste the returned id into wrangler.jsonc → kv_namespaces[0].id

wrangler secret put GOOGLE_CLIENT_SECRET
```

```jsonc
// wrangler.jsonc
"vars": {
  "GOOGLE_CLIENT_ID": "<client-id>.apps.googleusercontent.com"
}
```

```bash
wrangler deploy
```

Users visit the landing page, click **Sign in with Google**, and land directly in their IDE.

### Dev mode (no auth)

Leave `TEAM_DOMAIN`, `POLICY_AUD`, and `GOOGLE_CLIENT_ID` all empty. The Worker accepts an `x-user-id` header or `?user=` query param. **Never use this in production.**

```
https://vscode-cloud.<subdomain>.workers.dev/?user=alice
```

---

## R2 workspace persistence

Each user's workspace lives at `users/{userId}/` inside the shared R2 bucket, FUSE-mounted at `/home/coder/workspace` inside the container via geesefs.

Without R2 credentials the container falls back to an ephemeral local workspace — files are lost when the container sleeps.

### Generate an R2 API token

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Manage R2 API tokens** → **Create API token**
2. Permissions: **Object Read & Write**
3. Scope: **Specific bucket** → `vscode-cloud-workspaces`

```bash
wrangler secret put R2_ACCESS_KEY_ID      # Token Access Key ID
wrangler secret put R2_SECRET_ACCESS_KEY  # Token Secret Access Key
wrangler secret put R2_ACCOUNT_ID         # Your Cloudflare account ID
```

### FUSE performance settings

The entrypoint uses `--attr-cache-ttl 60s --type-cache-ttl 60s` to batch metadata calls. On first boot a `.vscode/settings.json` is written to the workspace:

```json
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true
  },
  "search.followSymlinks": false,
  "editor.formatOnSave": true
}
```

This prevents the VS Code file watcher from hammering the FUSE mount on large repos.

---

## GitHub repo auto-cloning

```jsonc
// wrangler.jsonc
"vars": {
  "GITHUB_REPOS": "myorg/frontend,myorg/api"
}
```

On each container start the entrypoint:
- Clones any repo not already present (`--depth=50`)
- Pulls the latest if the repo directory already exists

Because the workspace is R2-backed, the clone only runs once per user.

For private repos:

```bash
wrangler secret put GITHUB_TOKEN   # PAT with repo scope
```

---

## Teams dashboard

### First-time setup

The D1 schema is created automatically on the first request to `/admin` — no migrations to run manually.

Designate platform admins (who can see all teams) via `wrangler.jsonc`:

```jsonc
"vars": {
  "ADMIN_EMAILS": "alice@example.com,bob@example.com"
}
```

Any authenticated user can also access `/admin` for teams they belong to.

### Workflow

1. **Sign in** → go to `/admin`
2. Click **New Team** → enter a team name → you become the team admin
3. On the team detail page, enter a developer's email and click **Send invite**
4. Copy the generated invite URL and share it (Slack, email, etc.)
5. The developer signs in, visits the invite URL, and is added to the team
6. The members table shows each developer's **email**, **role**, **container status** (live), and **join date**
7. Team admins can remove members at any time

Invite links expire after **7 days** and are single-use.

### Routes

| Route | Auth | Description |
|---|---|---|
| `GET /admin` | User | Dashboard — teams you belong to (or all teams if admin) |
| `GET /admin/team/new` | User | Create team form |
| `POST /admin/team/create` | User | Create team, become admin |
| `GET /admin/team/:id` | Member | Team detail: members, invites, WakaTime info |
| `POST /admin/team/:id` | Admin | Invite member or remove member |
| `GET /admin/accept-invite?token=` | User | Accept invite, join team |

---

## WakaTime time tracking

The [WakaTime](https://wakatime.com) extension is pre-installed in every container. It tracks coding time automatically and syncs to wakatime.com.

### Manual setup (per developer)

Each developer configures their own API key after opening the IDE:

1. Open the Command Palette (`Ctrl+Shift+P`) → **WakaTime: API Key**
2. Paste the key from [wakatime.com/settings/account](https://wakatime.com/settings/account)

Or via terminal:

```bash
cat > ~/.wakatime.cfg <<EOF
[settings]
api_key = <your-api-key>
EOF
```

### Auto-configure for all containers

Set a shared API key (e.g. a WakaTime Teams project key) in `wrangler.jsonc`:

```jsonc
"vars": {
  "WAKATIME_API_KEY": "<your-api-key>"
}
```

The entrypoint writes `~/.wakatime.cfg` automatically on container start — no manual setup required.

View team stats at [wakatime.com/dashboard](https://wakatime.com/dashboard).

---

## Pre-installed tools

### AI CLIs (available in every terminal)

| Tool | Command | Install |
|---|---|---|
| Claude Code | `claude` | `@anthropic-ai/claude-code` |
| OpenAI Codex | `codex` | `@openai/codex` |

### VS Code extensions

Installed at image build time from [Open VSX Registry](https://open-vsx.org):

| Extension | Purpose |
|---|---|
| GitLens | Git blame, history, and branch visualisation |
| Prettier | Code formatting |
| ESLint | JavaScript/TypeScript linting |
| Python | Python language support |
| Tailwind CSS IntelliSense | Tailwind class autocomplete |
| Path Intellisense | Filename autocomplete |
| Code Runner | Run code snippets from the editor |
| Material Icon Theme | File icons |
| Error Lens | Inline error and warning display |
| Code Spell Checker | Spell checking in source files |
| WakaTime | Automatic time tracking |

Extension failures during image build are non-fatal — the IDE still launches.

---

## Configuration reference

### Environment variables (`wrangler.jsonc` vars)

Non-secret values, edited in [`wrangler.jsonc`](./wrangler.jsonc) → `vars` and
shipped with the next `wrangler deploy`. `keep_vars: true` stops Wrangler from
deleting variables you added in the dashboard.

| Variable | Default | Enables | Where to get it |
|---|---|---|---|
| `SLEEP_AFTER` | `"2m"` | Container idle timeout before hibernation. `"30s"`, `"5m"`, `"1h"`; max ~24h. | Your own choice — it trades cold starts against cost. |
| `TEAM_DOMAIN` | `""` | Auth A — validates Cloudflare Access JWTs. | [Cloudflare One](https://one.dash.cloudflare.com) → Settings → Custom Pages; it is `https://<your-team-name>.cloudflareaccess.com`. |
| `POLICY_AUD` | `""` | Auth A — the audience the JWT must carry. | Cloudflare One → Access → Applications → your app → **AUD tag**. |
| `GOOGLE_CLIENT_ID` | `""` | Auth B — Google OAuth sign-in. | [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → OAuth client ID (Web application). Redirect URI: `https://<your-worker>.workers.dev/auth/callback`. |
| `ADMIN_EMAILS` | `""` | Comma-separated addresses with platform-wide `/admin` access. | Your own addresses. |
| `WAKATIME_API_KEY` | `""` | Writes `~/.wakatime.cfg` in every container so users skip setup. | [wakatime.com/settings/account](https://wakatime.com/settings/account), or a team API key. |
| `R2_BUCKET_NAME` | `"vscode-cloud-workspaces"` | Which bucket workspaces persist to. | The name you passed to `wrangler r2 bucket create`. |
| `GITHUB_REPOS` | `""` | Comma-separated `owner/repo` list auto-cloned into `/workspace` on start. | Your own repositories. |

### Secrets (`wrangler secret put`)

Never put these in `wrangler.jsonc` — it is committed.

| Secret | Enables | Where to get it |
|---|---|---|
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | The FUSE mount inside the container, over R2's S3-compatible endpoint. | [Cloudflare dashboard](https://dash.cloudflare.com) → R2 → **Manage R2 API Tokens** → Create token with *Object Read & Write* on the bucket. |
| `R2_ACCOUNT_ID` | The S3 endpoint host for that account. | Cloudflare dashboard → any zone → Account ID in the right-hand sidebar, or `wrangler whoami`. |
| `GOOGLE_CLIENT_SECRET` | Auth option B, alongside `GOOGLE_CLIENT_ID`. | The same [Google Cloud Console credential](https://console.cloud.google.com/apis/credentials) that issued the client ID. |
| `GITHUB_TOKEN` | Cloning private repos listed in `GITHUB_REPOS`. | [github.com/settings/tokens](https://github.com/settings/tokens) — a PAT with the `repo` scope. |

### Cloudflare resources

| Resource | Binding | Purpose |
|---|---|---|
| R2 bucket | `WORKSPACE_BUCKET` | Workspace file storage |
| D1 database | `TEAMS_DB` | Teams, members, invites |
| KV namespace | `SESSION_STORE` | Google OAuth sessions (auth B only) |

### Container sizing

Set in `wrangler.jsonc` → `containers[0].instance_type`:

| Type | vCPU | RAM | Cost/hr | Recommended for |
|---|---|---|---|---|
| `basic` | 0.5 | 512 MB | ~$0.15 | Light use / testing only |
| `standard-1` | 1 | 2 GB | ~$0.30 | **Default — most projects** |
| `standard-2` | 2 | 4 GB | ~$0.60 | Monorepos / heavy workloads |

---

## Cost estimates

Containers are **on-demand** — billed only while running, ~$0 while sleeping.

| Scenario | Est. monthly cost |
|---|---|
| 1 developer, always-on (`standard-1`) | ~$75 |
| 10 developers, 2 hr/day avg | ~$18 |
| 100 developers, 1 hr/day avg | ~$80 |

Add $5/mo for Workers Paid plan + ~$10 for KV/R2/D1 usage at scale.

Check live container status:

```bash
npx wrangler containers list --status
```

---

## Endpoints

| Path | Auth | Description |
|---|---|---|
| `GET /` | — | Landing page (unauthenticated) or proxied to code-server (authenticated) |
| `GET /health` | None | `{ status: "ok", ts: <ms> }` |
| `GET /auth/login` | None | Redirect to Google OAuth consent screen |
| `GET /auth/callback` | None | OAuth token exchange, set session cookie |
| `GET /auth/logout` | None | Clear session, redirect to landing |
| `GET /status` | Auth | JSON: `{ userId, email, container: { status, ... } }` |
| `GET /admin` | Auth | Teams dashboard |
| `GET /admin/team/new` | Auth | Create team form |
| `POST /admin/team/create` | Auth | Submit new team |
| `GET /admin/team/:id` | Member | Team detail: members, invites |
| `POST /admin/team/:id` | Admin | Invite or remove a member |
| `GET /admin/accept-invite?token=` | Auth | Accept invite, join team |

---

## Local development

### Worker (simulated Cloudflare runtime)

```bash
npm run dev      # wrangler dev — simulates Workers runtime (no real containers)
npm run build    # TypeScript type-check only
```

In dev mode leave all auth vars empty and append `?user=yourname` to switch between simulated users:

```
http://localhost:8787/?user=alice
http://localhost:8787/admin?user=alice
```

### Running locally without Cloudflare

Run a full VS Code environment on your machine with a single Docker Compose command — no Cloudflare account, no wrangler, no R2 needed. Workspace files are persisted to a local Docker volume (or a host directory you choose).

**Prerequisites:** [Docker Desktop](https://docs.docker.com/get-docker/) (or Docker Engine + Compose plugin)

#### 1. First run (builds the image, ~5–10 min)

```bash
npm run local:build
```

Open [http://localhost:8080](http://localhost:8080) and log in with password **`changeme`**.

> The first build downloads all language runtimes and VS Code extensions. Subsequent starts reuse the cached image and take a few seconds.

#### 2. Day-to-day use

```bash
npm run local          # start (no rebuild)
npm run local:down     # stop (workspace preserved in Docker volume)
npm run local:build    # rebuild after Dockerfile or entrypoint.sh changes
npm run local:clean    # stop and delete all volumes (full reset)
```

#### 3. Custom options

Set any of these variables in your shell (or in a `.env` file next to `compose.yml`) before running:

| Variable | Default | Description |
|---|---|---|
| `PASSWORD` | `changeme` | Login password shown on the code-server screen |
| `WORKSPACE_DIR` | Docker named volume | Host path mounted as `/home/coder/workspace` (e.g. `~/code`) |
| `PORT` | `8080` | Host port — change if 8080 is already taken |
| `GITHUB_REPOS` | `""` | Comma-separated `owner/repo` pairs to auto-clone on first boot |
| `GITHUB_TOKEN` | `""` | GitHub PAT with `repo` scope (private repos only) |

Example — custom password, bind-mount `~/code` as the workspace, expose on port 9000:

```bash
PASSWORD=mysecret WORKSPACE_DIR=~/code PORT=9000 \
  docker compose -f compose.yml -f compose.local.yml up --build
```

#### 4. Persist VS Code settings across rebuilds

The `vscode-user-data` Docker volume stores your VS Code user settings (themes, keybindings, extension configs). It survives `down` and even `up --build` — only `down -v` removes it.

#### 5. Full teardown

```bash
npm run local:clean    # removes containers + named volumes (workspace and VS Code settings)
```

> This permanently deletes the workspace volume. If `WORKSPACE_DIR` points to a host directory, that directory is **not** deleted.

#### What's different from the Cloudflare deployment

| | Local (compose.local.yml) | Cloudflare (wrangler deploy) |
|---|---|---|
| Auth | code-server password (`PASSWORD`) | CF Access JWT or Google OAuth |
| Workspace storage | Docker volume or host directory | R2 bucket (FUSE-mounted) |
| FUSE / SYS_ADMIN | Not required | Required for geesefs R2 mount |
| Multiple users | One container, one user | One Durable Object + container per user |
| Cost | Your hardware | ~$0.30/hr per active container |

---

## Troubleshooting

**Container won't start**
Run `npx wrangler containers list --status`. Cold starts can take up to ~13 seconds on first request after a sleep period.

**R2 mount failing / workspace empty after restart**
Check that all three R2 secrets are set (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`). The container logs will show `[entrypoint] R2 mount ready` or the fallback message.

**WakaTime not tracking**
Open the Command Palette → **WakaTime: API Key** and verify the key. Alternatively check `cat ~/.wakatime.cfg` in the integrated terminal.

**Google OAuth "redirect_uri_mismatch"**
The redirect URI in Google Cloud Console must exactly match `https://<your-worker>.workers.dev/auth/callback` — no trailing slash.

**Invite link not working**
Invite links expire after 7 days and are single-use. Generate a new one from the team detail page.

**Teams dashboard empty**
Verify `TEAMS_DB` has a valid `database_id` in `wrangler.jsonc` and that `wrangler d1 create vscode-cloud-teams` was run. The D1 schema is created automatically on first `/admin` request.
