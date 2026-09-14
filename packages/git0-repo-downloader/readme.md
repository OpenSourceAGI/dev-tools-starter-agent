<p align="center">
    <img  src="https://i.imgur.com/td0AVb7.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
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

1. **Repository is downloaded** to your current directory
2. **Project type is detected** automatically
3. **Dependencies are installed** based on project type
4. **IDE is launched** automatically (if available)
5. **Development server starts** (for Node.js projects)

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
