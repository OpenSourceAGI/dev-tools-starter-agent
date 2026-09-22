<p align="center">
    <img  src="https://i.imgur.com/td0AVb7.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://git0.js.org"><img height="20px" src="https://img.shields.io/badge/App-blueviolet?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Website" /></a>
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/git0-repo-downloader"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/git0"><img src="https://img.shields.io/npm/dm/git0.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/git0"><img src="https://img.shields.io/npm/v/git0.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/git0"><img src="https://img.shields.io/npm/dt/git0.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/git0"><img src="https://img.shields.io/npm/types/git0" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=git0"><img src="https://packagephobia.com/badge?p=git0" alt="Install size" /></a>
    <a href="https://app.codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/flags"><img src="https://img.shields.io/codecov/c/github/OpenSourceAGI/dev-tools-starter-agent?flag=git0-repo-downloader&label=git0-repo-downloader%20coverage&logo=codecov&logoColor=white" alt="Coverage" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/git0-repo-downloader"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill git0` ([what it covers](../../skills/git0/SKILL.md))
<!-- skills:install:end -->

# Step 0: Download Git Repo

CLI tool to search GitHub repositories, download source & releases for your system, and instantly set up, then install dependencies and open code editor.

**🌐 [git0.js.org](https://git0.js.org)**

## 🚀 Installation

```bash
npm install -g git0
```

```bash
bun install -g git0
```

![livepreview](https://i.imgur.com/Io3ukRC.gif)
![preview](https://i.imgur.com/K22NiBq.png)

## ✨ Features

- **Search GitHub repositories** by name with fuzzy matching
- **Download repositories** directly from GitHub URLs or owner/repo shortcuts. Skip the manual git clone, cd, install dance
- **Get Releases** instantly download latest release for your system or all systems
- **Automatic dependency installation** and installation for multiple project types
- **Smart IDE integration** - automatically opens projects in your preferred editor
- **Cross-platform support** - works on Windows, macOS, and Linux
- **Conflict resolution** - handles directory naming conflicts automatically
- **Partial paths** - paste a `/tree/` or `/blob/` link and download just that folder or file
- **Optional `.git` history** - `--history` attaches the full history *after* the source is already on disk
- **Faster than git** - skips `.git` history and uncompresses while downloading

## 🎯 Usage

```bash

# Direct download from GitHub URL
## g and git0 both work
g https://github.com/facebook/react

# Search for repositories by name
g react starter

# Download using owner/repo shorthand
git0 facebook/react

# Use git0 without installing, (only node needed)
# (copy this line into your project's readme to help others setup)
npx git0 facebook/react

# Download only one folder — paste the GitHub link as you copied it
g https://github.com/facebook/react/tree/main/packages/react-dom

# ...or one file
g https://github.com/debate/debate-ai.com/blob/master/.continue/agents/new-config.yaml

# Same thing, without a URL
git0 facebook/react/packages/react-dom
git0 facebook/react --path=packages/react-dom

# A specific branch, tag or commit
git0 facebook/react --branch=v18.2.0

# With the full .git history attached after the download
git0 facebook/react --history

# History only — no working files at all
git0 facebook/react --history-only
```

### Options

| Flag | What it does |
| --- | --- |
| `--path=<path>` | Download only that folder or file of the repository |
| `--branch=<ref>` | Download a branch, tag or commit instead of the default branch |
| `--history` | Also fetch the full `.git` history, in the background |
| `--history-only` | Clone only the history — no working files |
| `--mirror` | Keep every ref (notes, remote-tracking) when cloning history |

## 📁 Partial Paths

Copy a link out of the GitHub UI and git0 downloads exactly what the link points
at, not the repository around it:

```bash
g https://github.com/facebook/react/tree/main/packages/react-dom
# → ./react-dom/ — the contents of that folder, at the root
```

The branch and the path are both read off the URL. Entries outside the path are
discarded as the tarball streams, so they are never written to disk, and what is
kept is lifted to the root of the target folder — you get `react-dom/`, not
`react/packages/react-dom/`.

The folder is named after the path rather than the repository, because that is
what you asked for. A `/blob/` link to a single file downloads that one file into
its enclosing folder's name. Pass a second argument, or `--path` with any repo
reference, if you'd rather name it yourself:

```bash
git0 facebook/react --path=packages/react-dom my-copy
```

## 🕐 Downloading With `.git` History

By default git0 downloads a tarball — the source at one commit, no history. That
is what makes it quick. When you *do* want the history, `--history` gets you both
without giving up the speed:

```bash
git0 facebook/react --history
```

The source tarball lands first. The history is fetched **after** the archive has
finished unzipping, in the background, while the IDE opens and dependencies
install. You end up in exactly the state `git clone` would have left you in — a
working tree with a full `.git` beside it, `git log` and `git blame` working,
`git status` clean — except you started working several seconds earlier.

**Why the lazy order is faster.** `git clone` is one serial operation: the remote
counts and packs every object in the project's history, sends the pack, and only
then writes files you can run. Nothing can start until all of it finishes. A
GitHub tarball is a pre-made, cached, already-compressed snapshot of one commit,
so git0 pipes it straight into a `tar` extractor — files are being written while
the rest is still downloading. And history is the one part of a clone that
nothing on the critical path is waiting for: `bun install` does not need `git
log`. So it is fetched last, overlapping the install rather than blocking it.

There is a benchmark for this in [`benchmark/`](./benchmark) — it measures
*time until the project can run*, separately from *time until history is
available*, for `git clone`, `git clone --depth=1`, git0, and `git0 --history`:

```bash
bun run bench facebook/react
```

### History Only

To take the history and none of the working files — for a backup, a mirror, or
to move a repository between hosts:

```bash
git0 facebook/react --history-only
# → ./react.git/ — HEAD, config, objects/, refs/, packed-refs
```

That directory holds what normally lives inside `.git`, placed at its root: all
the commits, branches and tags, no editable files. Read it without checking
anything out, or restore a normal working copy from it:

```bash
git --git-dir=react.git log --all --oneline
git clone react.git react
```

`--history-only` uses a bare clone (branches and tags). Add `--mirror` for every
ref Git can fetch — notes, remote-tracking refs and the rest — which is what you
want when the point is a complete backup:

```bash
git0 facebook/react --history-only --mirror
```

### Supported Project Types

git0 automatically detects and sets up the following project types:

| Project Type      | Detection                              | Installation                                  |
| ----------------- | -------------------------------------- | --------------------------------------------- |
| **Node.js** | `package.json`                       | `bun install` (fallback to `npm install`) |
| **Docker**  | `Dockerfile`, `docker-compose.yml` | `docker-compose up -d` or `docker build`  |
| **Python**  | `requirements.txt`, `setup.py`     | Virtual environment + pip install             |
| **Rust**    | `Cargo.toml`                         | `cargo build`                               |
| **Go**      | `go.mod`                             | `go mod tidy`                               |

### Supported IDEs

git0 automatically detects and opens projects in your preferred IDE:

- **Antigravity**
- **Cursor**
- **Windsurf**
- **VS Code**
- **VSCode Server WebUI**
- **Neovim**
- **Webstorm**

## 🔧 Configuration

### What Happens After Download

1. **Repository is downloaded** to your current directory — only the requested path, if you named one
2. **Project type is detected** automatically
3. **Dependencies are installed** based on project type
4. **IDE is launched** automatically (if available)
5. **Development server starts** (for Node.js projects)
6. **`.git` history is attached** in the background, if you passed `--history`

If a directory with the same name exists, git0 automatically appends a number (e.g., `react-2`, `react-3`).

### GitHub Token (Optional)

For higher API rate limits, set [your GitHub token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token):

```bash
export GITHUB_TOKEN=your_github_token_here
```

Without a token, you're limited to 60 requests per hour. With a token, you get 5,000 requests per hour.

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
