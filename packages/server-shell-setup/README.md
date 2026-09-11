<p align="center">
    <img src="https://i.imgur.com/a7ozEX5.jpeg">
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/server-shell-setup"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill server-shell-setup` ([what it covers](../../skills/server-shell-setup/SKILL.md))
<!-- skills:install:end -->

## The Devil Is In The Defaults

> If you hold a unix shell up to your ear, can you hear the C?

One-command setup for a modern dev environment: `fish`, `nvim`, `nushell`, `bun`, `node`, `helix`, `starship`, `docker`, and more. Includes fish aliases for `service_manager`, `killport`, `search`, and others.

**Supported systems**: Arch, Ubuntu/Debian, Android (Termux), macOS, Fedora, Alpine

## Contents

- [Install](#install) — how to run the installer
- [Components](#components) — what each component installs
- [Fish Aliases](#fish-aliases) — the functions this script adds to fish
- [Command Reference](#command-reference) — common commands for every tool installed
- [Files This Script Touches](#files-this-script-touches)
- [Companion Scripts](#companion-scripts)
- [Troubleshooting](#troubleshooting)
- [Reference Docs](#reference-docs)

## Install

On a fresh server, you may first need to set passwords:
```bash
sudo passwd        # set root password
sudo passwd $USER  # set user password
```

**Interactive menu** — pick what to install:
```bash
wget -qO- tinyurl.com/shellsetup | bash
```
```bash
curl -sSL https://tinyurl.com/shellsetup | bash
```

**Install everything unattended:**
```bash
wget -qO- tinyurl.com/shellsetup | bash -s -- all
```

**Install specific components only:**
```bash
wget -qO- tinyurl.com/shellsetup | bash -s -- starship,docker,node
```

The `-s --` is what forwards arguments through the pipe to `bash`. Dropping it silently gives you the interactive menu instead.

### Install Modes

| Invocation | Behavior |
|------------|----------|
| `\| bash` | Interactive numbered menu, re-prompts until a valid selection is given |
| `\| bash -s -- all` | Everything, unattended |
| `\| bash -s -- fish,node,docker` | Only the named components, unattended |
| `\| bash -s -- sudo` | Passwordless sudo only (CLI-only, not in the menu) |

Valid CLI component names: `fish`, `nushell`, `nvim`, `helix`, `node`, `bun`, `pacstall`, `docker`, `starship`, `systeminfo`, `code`, `sudo`. An unrecognized name exits with an error and lists the valid ones.

Two things to know about `all`:
- The interactive menu's "Install Everything" includes `code` (code-server); the CLI `all` argument does not. Pass `code` explicitly if you want it unattended.
- Neither form of `all` includes `sudo` — passwordless sudo is always opt-in.

Base dependencies (`git`, `wget`, `curl`, `fzf`, `ripgrep`, `python3`, `python3-pip`, `unzip`, `util-linux`) are installed on every run regardless of which components you select, because the fish functions depend on `fzf` and `ripgrep`.

When the run finishes, the script `exec`s into fish if fish is on the PATH — so your terminal drops straight into the new shell.

## Components

| Name | Description | Installed via | Verify with |
|------|-------------|---------------|-------------|
| `fish` | Modern shell with auto-suggestions, syntax highlighting, and plugins (oh-my-fish, fzf, z, pisces). Set as your default login shell. | distro package + [oh-my-fish](https://github.com/oh-my-fish/oh-my-fish) | `fish --version` |
| `nushell` | Data-oriented shell that handles structured data natively | `npm i -g nushell` (`pkg` on Termux) | `nu --version` |
| `nvim` | Neovim with [NvChad](https://nvchad.com) config pre-installed | distro package + git clone | `nvim --version` |
| `helix` | Modal terminal editor written in Rust, no config needed | distro package | `hx --version` |
| `node` | Node.js via [Volta](https://volta.sh) version manager (no sudo issues); also installs pnpm, yarn, git0, vite, turbo | [get.volta.sh](https://get.volta.sh) | `node -v`, `volta -v` |
| `bun` | Fast JavaScript runtime, bundler, and package manager | [bun.sh/install](https://bun.sh/install) | `bun --version` |
| `docker` | Docker with rootless mode enabled | get.docker.com + rootless setuptool | `docker version` |
| `starship` | Cross-shell prompt configured for bash, fish, and nushell | [starship.rs/install.sh](https://starship.rs/install.sh) | `starship --version` |
| `systeminfo` | Prints system stats (user, host, disk, RAM, CPU, uptime, IP, location, open ports) on login | `npx about-system@latest` in shell configs | open a new shell |
| `pacstall` | AUR-like package manager for Ubuntu/Debian | [pacstall.dev/q/install](https://pacstall.dev/q/install) | `pacstall -V` |
| `code` | [code-server](https://github.com/coder/code-server) — VSCode in the browser | code-server.dev/install.sh | `code-server --version` |
| `sudo` | Enable passwordless sudo for current user | writes `/etc/sudoers.d/$USER` | `sudo -n true` |

`pacstall` is Ubuntu/Debian only — on any other distro the script prints an error for that component and continues with the rest.

## Fish Aliases

These are written as fish functions into `~/.config/fish/functions/` when the `fish` component is installed. Each is a real file you can edit or delete.

| Alias | Expands to | Notes |
|-------|-----------|-------|
| `in <pkg>` | `sudo apt install <pkg>` | Hardcoded to apt — edit `in.fish` on non-Debian systems |
| `e <file>` | `nvim <file>` | |
| `del <path>` | `sudo rm -rf <path>` | No confirmation prompt |
| `setup` | Re-run this install script | Fetches the latest installer and runs the menu |
| `killport` | Interactive fzf menu to kill a process by port | Lists listening TCP ports via `lsof`, then `kill -9`. Falls back to a numbered menu without fzf |
| `search <query>` | Search file names and file contents (via ripgrep) | Prints filename matches, then content matches with 3 words of context on each side |
| `service_manager` | Interactive fzf menu to start/stop/restart/view systemd services | Lists both system and `--user` units; actions: journal, start, stop, restart, status, edit, enable, disable |

## Command Reference

Everything below ships with a default `all` install. This is the day-to-day cheat sheet — the commands you actually reach for on Linux.

### fish — the shell

Fish is not POSIX-compatible. Scripts written for bash won't run unmodified; use `bash script.sh` for those.

| Command | What it does |
|---------|--------------|
| `fish_config` | Open the web-based config UI (themes, prompt, functions) |
| `fish_config theme choose <name>` | Switch color theme from the terminal |
| `funced <name>` | Edit a function interactively |
| `funcsave <name>` | Persist a function to `~/.config/fish/functions/` |
| `functions` | List all defined functions |
| `functions <name>` | Print a function's source |
| `abbr -a gc git commit` | Add an abbreviation that expands as you type |
| `set -x VAR value` | Export an environment variable for this session |
| `set -U VAR value` | Set a universal variable (persists across sessions) |
| `set -e VAR` | Erase a variable |
| `fish_add_path ~/.local/bin` | Append to `$PATH` permanently and idempotently |
| `history search <term>` | Search shell history |
| `history delete --contains <term>` | Remove matching entries from history |
| `bind` | List current key bindings |
| `type -q cmd` | Test whether a command exists (used by the bundled functions) |
| `exec fish` | Reload the shell in place after editing config |

Key bindings worth knowing:

| Keys | Action |
|------|--------|
| `→` / `Ctrl+F` | Accept the autosuggestion |
| `Alt+→` | Accept one word of the autosuggestion |
| `↑` / `↓` | History search filtered by what you've typed |
| `Alt+↑` / `Alt+↓` | Search history for the token under the cursor |
| `Ctrl+R` | fzf history search (from the `fzf` omf plugin) |
| `Ctrl+T` | fzf file finder (from the `fzf` omf plugin) |
| `Alt+C` | fzf `cd` into a subdirectory (from the `fzf` omf plugin) |
| `Alt+E` | Edit the current command line in `$EDITOR` |
| `Alt+S` | Prepend `sudo` to the current or previous command |
| `Ctrl+C` / `Ctrl+D` | Cancel line / exit shell |

Fish plugins this script installs:

| Plugin | What it adds |
|--------|--------------|
| [oh-my-fish](https://github.com/oh-my-fish/oh-my-fish) (`omf`) | Plugin/theme manager: `omf install <pkg>`, `omf update`, `omf list`, `omf remove <pkg>`, `omf theme <name>` |
| `fzf` | Fuzzy bindings: `Ctrl+T` find file, `Ctrl+R` history, `Alt+C` cd into a subdirectory, `Alt+O` open in `$EDITOR` (legacy bindings stay enabled by default) |
| `z` | Frecency directory jumping: `z proj` cd's to the project dir you use most |
| `pisces` | Auto-closes brackets and quotes as you type |

### nushell — structured data shell

Nushell pipes tables, not text. Every command emits structured data you can filter with the same verbs.

| Command | What it does |
|---------|--------------|
| `nu` | Start nushell |
| `ls \| where size > 1mb` | Filter the directory listing as a table |
| `ls \| sort-by modified \| last 10` | Ten most recently modified files |
| `ps \| where cpu > 10` | Processes above 10% CPU |
| `sys host` | Structured host info (uptime, kernel, hostname) |
| `open file.json` | Parse JSON/YAML/TOML/CSV/XLSX into a table automatically |
| `open data.csv \| get column_name` | Extract one column |
| `open x.json \| to yaml` | Convert between formats |
| `$env.PATH` | Inspect environment as a list |
| `$env.PATH \| split row (char esep)` | PATH as a proper list |
| `help commands` | Browse all builtins |
| `config nu` | Edit the nushell config in `$EDITOR` |
| `^ls` | Escape to the external binary instead of the builtin |

The script writes `~/.config/nushell/config.nu` with the startup banner disabled and `$env.EDITOR` set to `nvim`.

### nvim — Neovim with NvChad

The script clones the [NvChad starter](https://github.com/NvChad/starter) to `~/.config/nvim` and runs a headless `Lazy! sync` to install plugins. An existing config is moved to `~/.config/nvim.bak` first.

| Keys / command | What it does |
|----------------|--------------|
| `Space` | Leader key |
| `Space + th` | Theme picker (NvChad) |
| `Space + ff` | Find files (Telescope) |
| `Space + fw` | Live grep across the project |
| `Space + fb` | Browse open buffers |
| `Space + fo` | Recently opened files |
| `Ctrl+n` | Toggle the file tree (nvim-tree) |
| `Space + e` | Focus the file tree |
| `Tab` / `Shift+Tab` | Next / previous buffer |
| `Space + x` | Close current buffer |
| `Space + ch` | NvChad cheatsheet — all mappings in one screen |
| `Space + /` | Toggle comment on line or selection |
| `Ctrl+h/j/k/l` | Move between splits |
| `:Lazy` | Plugin manager UI (install, update, profile) |
| `:Mason` | Install LSP servers, formatters, linters |
| `:LspInfo` | Which language servers are attached |
| `:checkhealth` | Diagnose a broken install |
| `:w` / `:q` / `:wq` / `:q!` | Write / quit / write+quit / force quit |

### helix — modal editor, batteries included

Helix is selection-first: you select, then act (the reverse of vim). No config or plugins needed for LSP.

| Keys / command | What it does |
|----------------|--------------|
| `hx <file>` | Open a file |
| `hx --health` | Check which language servers are detected |
| `Space + f` | Open file picker |
| `Space + /` | Global search across the workspace |
| `Space + b` | Buffer picker |
| `Space + k` | Show hover documentation |
| `Space + r` | Rename symbol (LSP) |
| `Space + a` | Code actions |
| `gd` / `gr` | Go to definition / find references |
| `gg` / `ge` | Top / end of file |
| `x` | Select the current line (repeat to extend) |
| `d` / `c` / `y` / `p` | Delete / change / yank / paste the selection |
| `mi(` / `ma(` | Select inside / around parentheses |
| `Ctrl+w` then `v`/`s` | Vertical / horizontal split |
| `:w` / `:q` / `:wq` | Write / quit / write+quit |
| `:tutor` | Built-in interactive tutorial |
| `:config-open` | Edit `~/.config/helix/config.toml` |

### node, volta, and the package managers

Volta installs Node per-user under `~/.volta`, so global installs never need sudo and each project can pin its own toolchain version.

| Command | What it does |
|---------|--------------|
| `volta install node` | Install the latest Node and make it default |
| `volta install node@20` | Install and default to a specific major |
| `volta install pnpm yarn` | Manage package managers through Volta too |
| `volta pin node@20` | Pin this project's Node version in `package.json` |
| `volta list` | Show installed and pinned tools |
| `volta which node` | Resolve which binary actually runs here |
| `node -v` / `node script.js` | Version / run a script |
| `node --watch script.js` | Re-run on file change |
| `npx <pkg>` | Run a package without installing it |
| `npm i -g <pkg>` | Install a CLI globally (no sudo, thanks to Volta) |
| `npm ci` | Clean, lockfile-exact install (use in CI) |
| `npm outdated` / `npm audit fix` | Find and patch stale or vulnerable deps |
| `npm run <script>` | Run a `package.json` script |

Also installed globally by the `node` component:

| Tool | Common commands |
|------|-----------------|
| `pnpm` | `pnpm i`, `pnpm add <pkg>`, `pnpm dlx <pkg>`, `pnpm up -i`, `pnpm store prune` |
| `yarn` | `yarn`, `yarn add <pkg>`, `yarn dlx <pkg>`, `yarn why <pkg>` |
| [`git0`](https://git0.js.org/) | `git0 <repo-url>` — clone a repo, install deps, and open it in one step |
| `vite` | `vite` (dev server), `vite build`, `vite preview` |
| `turbo` | `turbo run build`, `turbo run dev --filter=<pkg>`, `turbo prune <pkg>` (`--scope=` in Turbo 1.x) |

### bun — runtime and package manager

| Command | What it does |
|---------|--------------|
| `bun run <file.ts>` | Run TypeScript/JSX directly, no build step |
| `bun install` | Install dependencies (drop-in for `npm i`, much faster) |
| `bun add <pkg>` / `bun add -d <pkg>` | Add a runtime / dev dependency |
| `bun remove <pkg>` | Remove a dependency |
| `bun x <pkg>` | Run a package without installing (like `npx`) |
| `bun run --watch <file>` | Re-run on change |
| `bun test` | Built-in Jest-compatible test runner |
| `bun build <entry> --outdir dist` | Bundle for production |
| `bun build <entry> --compile` | Produce a single-file executable |
| `bun init` | Scaffold a new project |
| `bun upgrade` | Update bun itself |
| `bun pm ls` / `bun pm cache rm` | Inspect / clear the package cache |

### docker — rootless containers

The script installs Docker and then runs `dockerd-rootless-setuptool.sh install`, so the daemon runs as your user. Containers cannot bind ports below 1024 in rootless mode without extra capability configuration.

| Command | What it does |
|---------|--------------|
| `docker ps` / `docker ps -a` | Running / all containers |
| `docker run -it --rm <img> <cmd>` | Run a throwaway interactive container |
| `docker run -d -p 8080:80 <img>` | Run detached with a port mapping |
| `docker exec -it <ctr> bash` | Shell into a running container |
| `docker logs -f <ctr>` | Follow container logs |
| `docker stop <ctr>` / `docker rm <ctr>` | Stop / remove a container |
| `docker images` / `docker rmi <img>` | List / remove images |
| `docker build -t <name> .` | Build from the Dockerfile here |
| `docker stats` | Live CPU/memory per container |
| `docker inspect <ctr>` | Full JSON config of a container |
| `docker cp <ctr>:/path ./here` | Copy files out of a container |
| `docker system df` | How much disk images/containers/volumes use |
| `docker system prune -af --volumes` | Reclaim all unused space (destructive) |
| `docker compose up -d` / `down` | Start / stop a compose stack |
| `docker compose logs -f <svc>` | Follow one service's logs |
| `systemctl --user status docker` | Rootless daemon status (note `--user`) |
| `systemctl --user restart docker` | Restart the rootless daemon |

### starship — the prompt

Configured for bash, fish, and nushell in one pass. The script writes `~/.config/starship.toml` setting the prompt character to `ƒ`.

| Command | What it does |
|---------|--------------|
| `starship config` | Open `~/.config/starship.toml` in `$EDITOR` |
| `starship preset nerd-font-symbols -o ~/.config/starship.toml` | Apply a built-in preset |
| `starship preset --list` | List available presets |
| `starship explain` | Explain what each segment of your prompt is showing |
| `starship timings` | Find which modules are making the prompt slow |
| `starship module <name>` | Render a single module for debugging |
| `starship init fish \| source` | Manually load in the current fish session |

### fzf — fuzzy finder

Installed as a base dependency; `killport` and `service_manager` both build on it.

| Command | What it does |
|---------|--------------|
| `fzf` | Fuzzy-pick from stdin (or the file list) |
| `<cmd> \| fzf` | Filter any command's output interactively |
| `fzf --preview 'cat {}'` | Show a preview pane for the highlighted line |
| `fzf -m` | Multi-select with `Tab` |
| `vim (fzf)` | Open the picked file (fish command substitution) |
| `kill -9 (ps -ef \| fzf \| awk '{print $2}')` | Pick a process and kill it |

Inside fzf: type to filter, `Ctrl+J`/`Ctrl+K` to move, `Tab` to multi-select, `Enter` to accept, `Esc` to cancel.

### ripgrep (`rg`) — search

Also a base dependency, and what the `search` function uses under the hood.

| Command | What it does |
|---------|--------------|
| `rg <pattern>` | Recursive search, respecting `.gitignore` |
| `rg -i <pattern>` | Case-insensitive |
| `rg -w <pattern>` | Whole-word matches only |
| `rg -l <pattern>` | List matching filenames only |
| `rg -c <pattern>` | Count matches per file |
| `rg -C 3 <pattern>` | Show 3 lines of context around each hit |
| `rg -t py <pattern>` | Restrict to one file type |
| `rg -g '*.ts' <pattern>` | Restrict by glob |
| `rg -uu <pattern>` | Search hidden and gitignored files too |
| `rg --files \| rg <name>` | Search filenames instead of contents |
| `rg --files-without-match <pattern>` | Find files that *don't* match |

### systemd — services and logs

What `service_manager` wraps. Drop `sudo` and add `--user` for user-scoped units.

| Command | What it does |
|---------|--------------|
| `systemctl status <unit>` | Current state, recent log lines |
| `sudo systemctl start\|stop\|restart <unit>` | Control a unit now |
| `sudo systemctl enable --now <unit>` | Start it and start it on every boot |
| `sudo systemctl disable --now <unit>` | Stop it and don't start on boot |
| `systemctl list-units --type=service` | Loaded services |
| `systemctl list-unit-files --type=service` | All installed unit files and their enablement |
| `systemctl --failed` | Everything currently broken |
| `sudo systemctl edit --full <unit>` | Edit a unit file safely |
| `sudo systemctl daemon-reload` | Reload after editing unit files by hand |
| `journalctl -u <unit> -f` | Follow one service's logs |
| `journalctl -u <unit> --since "1 hour ago"` | Time-filtered logs |
| `journalctl -p err -b` | Errors from this boot |
| `journalctl --disk-usage` | How much disk the journal is using |
| `sudo journalctl --vacuum-time=3d` | Trim the journal to the last 3 days |

### pacstall — AUR for Ubuntu/Debian

| Command | What it does |
|---------|--------------|
| `pacstall -I <pkg>` | Install a package from the pacstall repos (like `apt install`) |
| `pacstall -S <term>` | Search available packages (like `apt search`) |
| `pacstall -R <pkg>` | Remove a package |
| `pacstall -U` | Update pacstall's recipe scripts |
| `pacstall -Up` | Upgrade installed pacstall packages |
| `pacstall -L` | List installed pacstall packages |
| `pacstall -A <repo>` | Add a package repository |
| `pacstall -h` | Full flag reference |

### code-server — VS Code in the browser

| Command | What it does |
|---------|--------------|
| `code-server` | Start on `127.0.0.1:8080` |
| `code-server --bind-addr 0.0.0.0:8080` | Expose on the network (put it behind TLS/a proxy) |
| `sudo systemctl enable --now code-server@$USER` | Run it as a service on boot |
| `cat ~/.config/code-server/config.yaml` | Read the generated password and bind address |
| `code-server --install-extension <id>` | Install an extension by marketplace ID |
| `code-server --list-extensions` | List installed extensions |

### Package managers by distro

The installer picks the right one automatically; these are for when you're doing it by hand afterward.

| Distro | Install | Update all | Search | Remove |
|--------|---------|-----------|--------|--------|
| Ubuntu/Debian | `sudo apt install <pkg>` | `sudo apt update && sudo apt upgrade` | `apt search <term>` | `sudo apt remove <pkg>` |
| Fedora | `sudo dnf install <pkg>` | `sudo dnf upgrade` | `dnf search <term>` | `sudo dnf remove <pkg>` |
| Arch | `sudo pacman -S <pkg>` | `sudo pacman -Syu` | `pacman -Ss <term>` | `sudo pacman -Rns <pkg>` |
| Arch (AUR) | `yay -S <pkg>` | `yay -Syu` | `yay -Ss <term>` | `yay -Rns <pkg>` |
| Alpine | `sudo apk add <pkg>` | `sudo apk update && sudo apk upgrade` | `apk search <term>` | `sudo apk del <pkg>` |
| macOS | `brew install <pkg>` | `brew update && brew upgrade` | `brew search <term>` | `brew uninstall <pkg>` |
| Termux | `pkg install <pkg>` | `pkg upgrade` | `pkg search <term>` | `pkg uninstall <pkg>` |

On Arch, the script bootstraps `yay` first (initializing pacman keys and building `yay-bin` from the AUR) if it isn't already present.

### Termux extras

On Android the script switches the Termux mirror to a faster one, installs the base tools, and sets up a full Ubuntu userland via proot.

| Command | What it does |
|---------|--------------|
| `proot-distro list` | Show installable and installed distros |
| `proot-distro install ubuntu` | Install the Ubuntu rootfs |
| `proot-distro login ubuntu` | Enter the Ubuntu environment |
| `proot-distro login ubuntu -- <cmd>` | Run one command inside it |
| `proot-distro remove ubuntu` | Delete the rootfs |
| `termux-setup-storage` | Grant access to shared Android storage |

The script creates an `ubuntu` user inside the proot distro with passwordless sudo. A `startxfce4_ubuntu.sh` script is downloaded for optional XFCE desktop use but is left uncalled — run it yourself if you want a GUI.

## Files This Script Touches

Useful for auditing before you run it, or for undoing parts afterward.

| Path | Written by | Contents |
|------|-----------|----------|
| `~/.config/fish/config.fish` | fish, starship, systeminfo, docker | Prompt init, greeting, `about-system` call, PATH additions |
| `~/.config/fish/functions/*.fish` | fish | `in`, `e`, `del`, `setup`, `search`, `killport`, `service_manager` |
| `~/.config/nushell/config.nu` | nushell, starship, systeminfo | Banner off, `EDITOR=nvim`, starship autoload, `about-system` call |
| `~/.config/nvim` | nvim | NvChad starter clone (existing config moved to `~/.config/nvim.bak`) |
| `~/.config/starship.toml` | starship | Overwritten with the `ƒ` prompt character config |
| `~/.bashrc` | node, starship, systeminfo, docker | Volta PATH, starship init, `about-system` call, `/usr/bin` on PATH |
| `~/.volta/` | node | Volta toolchain and shims |
| `~/.hushlogin` | systeminfo | Suppresses the default login banner |
| `/etc/motd`, `/etc/update-motd.d` | systeminfo | **Deleted** so the custom greeting is the only banner |
| `/etc/sudoers.d/$USER` | sudo | `NOPASSWD:ALL` for your user |
| Login shell (`chsh`) | fish | Changed to fish for `$USER` |

Note that `systeminfo` deletes the system MOTD files and `starship` overwrites `~/.config/starship.toml` wholesale — back those up first if they matter to you.

## Companion Scripts

Two extra scripts live alongside the installer and are run directly, not through the component menu.

### `get-node.sh` — reinstall the JS toolchain

A standalone, POSIX-`sh` script that wipes and reinstalls Volta, Node, Yarn, and Bun, then prints one summary line with all four versions. Use it when a toolchain install got into a bad state.

```bash
sh get-node.sh
```

It removes `~/.volta` and `~/.bun` if they already exist, so anything pinned through Volta will need reinstalling afterward. It exits with a clear error if `curl` is missing or any install step fails.

### `clean-server-disk.sh` — aggressive disk cleanup

Frees space on a full server and reports how much it recovered. **Must be run as root, and it is destructive** — read it before running it.

```bash
sudo bash clean-server-disk.sh
```

| Stage | What it removes |
|-------|-----------------|
| Package manager | apt/yum/dnf caches, autoremovable packages, `/var/lib/apt/lists` |
| Docker | `docker system prune -af --volumes`, build cache, `~/.docker/buildx` |
| Logs | Truncates `/var/log/*.log`; deletes rotated logs; vacuums journal to 3 days / 100 MB |
| Caches | `~/.cache` and `cache/` contents under `/home` and `/root`, thumbnails, font and man caches |
| Temp | `/tmp`, `/var/tmp`, `*.tmp` files, crash reports and core dumps (and disables core dumps) |
| Kernels | Purges old kernel packages, keeping the running one |
| App caches | pip, npm, yarn, snap, unused flatpak runtimes |
| User dirs | `~/Downloads` files untouched for 30+ days, bash history |

It finishes by syncing and dropping the kernel page cache. The Docker prune deletes **all** unused volumes — stop and check anything holding data you care about first.

### `misc-setup/`

| File | Purpose |
|------|---------|
| `setup-windows.ps1` | PowerShell equivalent for Windows — installs Neovim, Starship, nushell, Git, VS Code, nvm, bun, and more via winget; defines a `setup` alias. Save it as `$PSHOME\Profile.ps1`. |
| `chrome-extensions.md` | Curated list of developer and general-purpose Chrome extensions |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Installer aborts immediately on a fresh server | Set passwords first (`sudo passwd`, `sudo passwd $USER`); many images ship with none, which makes `sudo` fail confusingly |
| Piped install shows the menu instead of running unattended | You dropped `-s --` — it's `bash -s -- all`, not `bash all` |
| Shell is still bash after login | `chsh` may have failed silently; run `chsh -s $(which fish)` and open a new session |
| `Invalid component: <name>` | Check the name against the valid list above; the script exits rather than guessing |
| `pacstall` reports an error | It's Ubuntu/Debian only — expected on other distros, the rest of the run continues |
| `docker` commands fail after install | Rootless docker runs as a user service: `systemctl --user status docker`, and open a new shell to pick up the PATH change |
| Node installed but `node` not found | Open a new shell, or run `fish_add_path ~/.volta/bin` — Volta's shims live in `~/.volta/bin` |
| Neovim opens with errors on first launch | Plugin sync runs in the background; wait for it, or run `nvim --headless "+Lazy! sync" +qa` again |
| Login greeting is missing | `systeminfo` shells out to `npx about-system@latest`, which needs Node and network access on each login |

## Example: System Info on Login

```
👤 deck 🏠 steamdeck 📁 90% 💾 2/14GB 🔝 6% cursor ⏱️  1d 7h 18m 🌎 174.194.193.230
📍 San Jose 🔗 http://230.sub-174-194-193.myvzw.com 👮 Verizon Business ⚡ SteamOS
📈 AMD Custom APU 0405 💻 Jupiter 🔧 6.11.11-valve12-1-neptune 🐚 fish 🚀 npm pip docker nvim bun
🔌 57343stea 46583stea 27060stea 📦 docker-node
```

## Reference Docs

- [Cursor AI Editor](https://docs.cursor.com/welcome)
- [Cursor MCP Servers](https://cursor.directory)
- [VSCode Docs](https://code.visualstudio.com/docs)
- [VSCode Extensions](https://marketplace.visualstudio.com/search?target=VSCode&category=All%20categories&sortBy=Installs)
- [Fish Features Overview](https://medium.com/the-glitcher/fish-shell-3ec1a6cc6128)
- [Fish Playground](https://rootnroll.com/d/fish-shell/)
- [git0 Installer](https://git0.js.org/)
- [Bun.js Runtime Docs](https://bun.sh/docs)
- [Node.js Best Packages](https://github.com/sindresorhus/awesome-nodejs)
- [Volta Node Installer](https://docs.volta.sh/guide/)
- [pnpm Package Installer](https://pnpm.io/pnpm-cli)
- [Starship Prompt](https://starship.rs/guide/)
- [Helix Editor](https://docs.helix-editor.com)
- [Neovim](https://github.com/neovim/neovim)
- [Neovim LazyVim Config](https://www.lazyvim.org/keymaps)
- [gh GitHub CLI](https://cli.github.com/manual/gh)
- [DevDocs.io](https://devdocs.io/)
- [Terminal Best Tools](https://github.com/k4m4/terminals-are-sexy)

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
