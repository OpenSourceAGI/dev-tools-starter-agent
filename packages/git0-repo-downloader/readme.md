<p align="center">
    <img  src="https://i.imgur.com/td0AVb7.png" />
</p>
<p align="center">
    <a href="https://discord.gg/SJdBqBz3tV"><img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"/></a>
    <a href="https://github.com/vtempest/git0/discussions"><img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/git0" /></a>
    <a href="https://github.com/vtempest/git0/discussions"><img alt="GitHub Discussions" src="https://img.shields.io/github/discussions/vtempest/git0" /></a>
    <a href="https://github.com/vtempest/git0/pulse" alt="Activity"><img src="https://img.shields.io/github/commit-activity/m/vtempest/git0" /></a>
    <br />
    <img src="https://img.shields.io/github/last-commit/vtempest/git0.svg" alt="GitHub last commit" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" />
    <a href="https://codespaces.new/vtempest/git0"><img src="https://github.com/codespaces/badge.svg" width="150" height="20" /></a>
</p>

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
