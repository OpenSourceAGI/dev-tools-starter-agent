---
name: git0
description: Guide to git0 (packages/git0-repo-downloader), the GitHub repo search-download-setup CLI — the g / gg / git0 / fm commands, searching by keyword vs downloading by URL or owner/repo, release binaries for your platform, automatic dependency install per project type, IDE launch, and GITHUB_TOKEN rate limits. Use when working with git0 or troubleshooting it — "API rate limit exceeded", searches returning nothing, downloads landing in a suffixed folder, dependency install or IDE launch not firing, or release assets missing for a platform.
---

# Working With git0

The CLI in `packages/git0-repo-downloader`, published as **`git0`**. It replaces the clone → cd → install → open dance with one command: it downloads a repo tarball (no `.git` history, extracted while streaming, so faster than `git clone`), detects the project type, installs dependencies, and opens your editor.

## Setup

```bash
npm install -g git0     # or: bun install -g git0
npx git0 facebook/react # or use it without installing
```

Four bins ship with it: `git0`, `g`, `gg` (all the same CLI) and `fm`.

## Picking the right invocation

| You want | Command |
| --- | --- |
| A repo you know the URL of | `g https://github.com/facebook/react` |
| A repo by `owner/repo` | `git0 facebook/react` |
| To find one by keyword | `g react starter` — fuzzy search, then pick from the list |
| A prebuilt binary instead of source | run the search/download; when the repo has releases you're asked to choose binary, source, or both |
| A one-liner other people can paste | `npx git0 <owner/repo>` — only Node required |

## Recipes

**What happens after download** — the folder lands in the current directory, project type is detected, dependencies install, the IDE opens (deferred ~500 ms so extraction finishes first), and for Node projects the dev server starts.

**Project-type detection**

| Detected by | Install step |
| --- | --- |
| `package.json` | `bun install`, falling back to `npm install` |
| `Dockerfile` / `docker-compose.yml` | `docker-compose up -d` or `docker build` |
| `requirements.txt` / `setup.py` | virtualenv + `pip install` |
| `Cargo.toml` | `cargo build` |
| `go.mod` | `go mod tidy` |

**IDE launch order** — Antigravity, Cursor, Windsurf, VS Code, VS Code Server web UI, Neovim, WebStorm; the first one found on `PATH` wins.

**Raise the rate limit** — unauthenticated GitHub search is 60 requests/hour. Export a token for 5,000:

```bash
export GITHUB_TOKEN=ghp_…
```

**Name collisions** — if the target directory exists, git0 appends a counter (`react-2`, `react-3`) rather than overwriting.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `API rate limit exceeded` | 60 req/h unauthenticated. Set `GITHUB_TOKEN` in your shell profile. |
| Search returns nothing for a repo you know exists | Keyword search hits GitHub's search index, which excludes very new or low-signal repos. Pass `owner/repo` or the full URL to bypass search entirely. |
| Project ended up in `name-2/` | A directory with that name already existed — this is the conflict handling, not a bug. Remove or rename the old one first. |
| Dependencies didn't install | No recognized manifest at the repo root (monorepo with everything under `packages/`, or a non-listed ecosystem). Run the install yourself in the right subdirectory. |
| Editor didn't open | None of the supported editors are on `PATH`. Launch manually, or add your editor's CLI shim (VS Code: "Shell Command: Install 'code' command"). |
| "No packages available for your platform" | The release has assets, but none matching your OS/arch. Choose the source download instead. |
| Private repo 404s | The token needs repo scope, and fine-grained tokens must grant access to that specific repository. |
| Downloaded tree has no git history | By design — the tarball skips `.git`. Run `git init` (or `git clone`) if you need history. |
| `command not found: g` after global install | The global bin dir isn't on `PATH`, or `g` collides with an existing alias/function in your shell. Use `git0` explicitly. |
