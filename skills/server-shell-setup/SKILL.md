---
name: server-shell-setup
description: Guide to server-shell-setup (packages/server-shell-setup), the one-command dev-environment bootstrap for fish, nushell, nvim, helix, node via Volta, bun, docker, starship, code-server and more — interactive vs unattended installs, selecting individual components, the fish aliases it adds, and the supported distros. Use when working with server-shell-setup or troubleshooting it — the installer aborting on a fresh server, sudo or password prompts, a shell that doesn't become the default, docker rootless issues, or components that silently skip on an unsupported distro.
---

# Working With server-shell-setup

The shell scripts in `packages/server-shell-setup` (`install-shell.sh`, plus `get-node.sh` and `clean-server-disk.sh`). It's not an npm package — it's a bash installer you pipe from the network, aimed at a fresh VPS, container, or Termux session.

**Supported systems**: Arch, Ubuntu/Debian, Android (Termux), macOS, Fedora, Alpine. The script detects the OS and picks the right package manager; unsupported combinations skip the component rather than aborting the run.

## Setup

On a brand-new server, set passwords first (many providers ship with none, which makes `sudo` fail in confusing ways):

```bash
sudo passwd        # root
sudo passwd $USER  # your user
```

Then pick an install mode:

```bash
wget -qO- tinyurl.com/shellsetup | bash                                   # interactive menu
wget -qO- tinyurl.com/shellsetup | bash -s -- all                         # everything, unattended
wget -qO- tinyurl.com/shellsetup | bash -s -- starship,docker,node        # specific components
```

The `-s --` is what forwards arguments through the pipe to bash — dropping it silently gives you the interactive menu instead.

## Components

| Name | What you get |
| --- | --- |
| `fish` | Fish with oh-my-fish, fzf, z, pisces |
| `nushell` | Structured-data shell |
| `nvim` | Neovim preconfigured with NvChad |
| `helix` | Modal editor, no config needed |
| `node` | Node via Volta (no sudo/permission problems), plus pnpm, yarn, git0, vite, turbo |
| `bun` | Bun runtime + package manager |
| `docker` | Docker with rootless mode |
| `starship` | Prompt wired into bash, fish, and nushell |
| `systeminfo` | The `about-system` greeting on login |
| `pacstall` | AUR-style package manager for Ubuntu/Debian |
| `code` | code-server (VS Code in the browser) |
| `sudo` | Passwordless sudo for the current user |

## Fish aliases it installs

| Alias | Runs |
| --- | --- |
| `in <pkg>` | `sudo apt install <pkg>` |
| `e <file>` | `nvim <file>` |
| `del <path>` | `sudo rm -rf <path>` |
| `setup` | Re-runs this installer |
| `killport` | fzf picker to kill the process holding a port |
| `search <query>` | Search filenames and contents via ripgrep |
| `service_manager` | fzf picker to start/stop/restart/inspect systemd services |

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Arguments ignored, menu appears anyway | You piped without `-s --`. Use `bash -s -- all`. |
| Menu appears but you're in CI | The interactive path needs a TTY. Always pass an explicit component list or `all` in automation. |
| `sudo: no password` / repeated prompts | Set the passwords first (above). The `sudo` component enables passwordless sudo, but it can't run before you can `sudo` at all. |
| Fish installed but the shell didn't change | The default shell change needs `chsh -s $(which fish)` and a new login session; in containers there's often no login shell at all — invoke `fish` from your entrypoint. |
| Docker installed but `docker ps` fails | Rootless Docker needs its user daemon running and the socket env var set — log out and back in, then check `systemctl --user status docker`. In containers without systemd, rootless mode won't come up. |
| A component silently didn't install | It isn't available for the detected OS. Re-run just that component to see the output rather than scrolling the full log. |
| Node installed but `node` isn't found | Volta puts shims in `~/.volta/bin`, added to the shell config it edited. Open a new shell, or source the config for the shell you're actually using. |
| `killport`/`service_manager` do nothing | They depend on `fzf` (fish component) and on systemd (`service_manager`), neither of which exists in a minimal container. |
| Running it twice broke something | It's re-runnable (`setup` alias exists for that), but shell config edits can stack. Check `~/.config/fish/config.fish` for duplicate lines. |
| Disk fills up mid-install | `clean-server-disk.sh` in the same folder clears package caches and old images. |
