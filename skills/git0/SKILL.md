---
name: git0
description: Guide to git0 (packages/git0-repo-downloader), the GitHub repo search-download-setup CLI — the g / gg / git0 / fm commands, searching by keyword vs downloading by URL or owner/repo, partial-path downloads from /tree/ and /blob/ links, the --history and --history-only .git options, release binaries for your platform, automatic dependency install per project type, IDE launch, and GITHUB_TOKEN rate limits. Use when working with git0 or troubleshooting it — "API rate limit exceeded", searches returning nothing, downloads landing in a suffixed folder, a sub-path download coming back empty, git history not attaching, dependency install or IDE launch not firing, or release assets missing for a platform.
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
| **Just one folder of it** | paste the link as copied: `g https://github.com/facebook/react/tree/main/packages/react-dom` |
| **Just one file of it** | paste a `/blob/` link, or `git0 owner/repo --path=path/to/file` |
| A specific branch, tag or commit | `git0 facebook/react --branch=v18.2.0` |
| **The source plus `.git` history** | `git0 facebook/react --history` |
| **History and nothing else** | `git0 facebook/react --history-only` |
| A prebuilt binary instead of source | run the search/download; when the repo has releases you're asked to choose binary, source, or both |
| A one-liner other people can paste | `npx git0 <owner/repo>` — only Node required |

## Flags

| Flag | Effect |
| --- | --- |
| `--path=<path>` | Limit the download to that folder or file |
| `--branch=<ref>` (`--ref=`) | Download a branch, tag or commit instead of the default branch |
| `--history` (`--git`) | Attach the full `.git` history after extraction, in the background |
| `--history-only` (`--git-only`) | Clone only the history into `<repo>.git`; no working files |
| `--mirror` | Use `git clone --mirror` rather than `--bare` when cloning history |

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

**Partial paths** — a `/tree/` or `/blob/` URL carries a branch and a path, and git0 uses both. Entries outside the path are dropped as the tarball is parsed, so they never reach the disk, and the requested subtree is hoisted to the root of the target folder: `…/tree/main/packages/react-dom` gives you `react-dom/`, not `react/packages/react-dom/`. The folder is named after the path (a `/blob/` link uses the file's enclosing folder), which a second positional argument or `--path` with an explicit name overrides. `owner/repo/some/path` works as shorthand for the same thing.

**`.git` history, and why it comes last** — `--history` downloads the tarball first and clones the history into `.git` *after* extraction finishes, alongside the IDE launch and the dependency install. The end state matches `git clone` — working tree, full history, clean `git status` — but nothing on the critical path waits for it, because `bun install` does not need `git log`. Mechanically: bare clone into a temp dir, renamed into place, `core.bare` flipped to false, origin's fetch refspec restored, then `git reset --mixed HEAD` to populate the index from HEAD without touching the extracted files. A failed history fetch is reported and swallowed — it never costs you the download. `benchmark/` measures time-to-files against time-to-history for clone, shallow clone, and both git0 modes (`bun run bench`).

**History only** — `--history-only` runs a bare clone into `<repo>.git` and writes no working files; `--mirror` makes it `git clone --mirror` instead, which keeps notes and remote-tracking refs and is the one you want for a backup. Read it with `git --git-dir=<repo>.git log --all --oneline`, or `git clone <repo>.git <repo>` to get a working copy back.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `API rate limit exceeded` | 60 req/h unauthenticated. Set `GITHUB_TOKEN` in your shell profile. |
| Search returns nothing for a repo you know exists | Keyword search hits GitHub's search index, which excludes very new or low-signal repos. Pass `owner/repo` or the full URL to bypass search entirely. |
| Project ended up in `name-2/` | A directory with that name already existed — this is the conflict handling, not a bug. Remove or rename the old one first. |
| Dependencies didn't install | No recognized manifest at the repo root (monorepo with everything under `packages/`, or a non-listed ecosystem). Run the install yourself in the right subdirectory — or download just that subdirectory: `git0 owner/repo --path=packages/thing`. |
| `"<path>" was not found in this repository` | The sub-path is right for a different branch, or misspelled. Deep GitHub URLs carry their own branch; with `--path` you may need `--branch=` too. |
| `Could not download owner/repo` | The tarball request failed — usually the rate limit, or a branch that is neither `master` nor `main` (pass `--branch=`). |
| `Could not attach git history` | `--history` needs `git` on `PATH`, and a repo it can read. The message is a warning, not a failure: the downloaded source is fine, and you can `git init` yourself. |
| Editor didn't open | None of the supported editors are on `PATH`. Launch manually, or add your editor's CLI shim (VS Code: "Shell Command: Install 'code' command"). |
| "No packages available for your platform" | The release has assets, but none matching your OS/arch. Choose the source download instead. |
| Private repo 404s | The token needs repo scope, and fine-grained tokens must grant access to that specific repository. |
| Downloaded tree has no git history | By design — the tarball skips `.git`. Run `git init` (or `git clone`) if you need history. |
| `command not found: g` after global install | The global bin dir isn't on `PATH`, or `g` collides with an existing alias/function in your shell. Use `git0` explicitly. |
