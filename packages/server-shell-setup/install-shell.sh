#!/usr/bin/env bash
# =============================================================================
# Developer Environment Setup Script
# =============================================================================
# A safer, idempotent, single-file developer-environment installer.
#
# Supported platforms:
#   - macOS (Homebrew)
#   - Ubuntu/Debian (APT)
#   - Fedora/RHEL-like systems (DNF)
#   - Arch/Manjaro-like systems (Pacman)
#   - Alpine Linux (APK)
#   - Android Termux (PKG)
#
# Example usage:
#   # Inspect before executing (recommended):
#   curl -fsSLO https://raw.githubusercontent.com/OpenSourceAGI/appdemo-starter-template/<PINNED_TAG_OR_COMMIT>/packages/server-shell-setup/install-shell.sh
#   less install-shell.sh
#   bash install-shell.sh --components fish,node,nvim --yes
#
#   # Interactive menu:
#   bash install-shell.sh
#
#   # Noninteractive:
#   bash install-shell.sh --components fish,node,nvim,starship --yes
#
#   # See exactly what would change without changing anything:
#   bash install-shell.sh --components all --dry-run
#
# Notes:
#   - This script intentionally keeps the useful aliases/functions from the
#     original setup: `in`, `e`, `del`, `search`, `killport`, `setup`, and
#     `service_manager`.
#   - Every configuration file changed by this script is backed up once per
#     execution under ~/.local/state/dev-shell-setup/backups/.
#   - Passwordless sudo, SSH password authentication, Docker rootless mode,
#     and setting Fish as the login shell require explicit component selection.
#   - No separate scripts are required; all functionality lives in this file.
#
# License: MIT
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# User-configurable defaults
# -----------------------------------------------------------------------------
SCRIPT_NAME="${0##*/}"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/dev-shell-setup"
BACKUP_DIR="$STATE_DIR/backups/$(date +%Y%m%d-%H%M%S)"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}"

# Pin Node to a stable major by default. Override with --node-version 22, etc.
NODE_VERSION="22"

# Command-line behavior flags.
DRY_RUN=0
ASSUME_YES=0
INTERACTIVE=0
UPGRADE_PACKAGES=1
INSTALL_CODE_SERVER=0
SET_FISH_DEFAULT_SHELL=0
ENABLE_NOPASSWD_SUDO=0
ENABLE_SSH_PASSWORD=0
DOCKER_MODE="none" # none | rootless

# Array of selected components. Bash arrays require Bash, hence the shebang.
COMPONENTS=()
PLATFORM=""
PACKAGE_MANAGER=""

# ANSI colors are only emitted when stdout is a terminal.
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN=''
  BLUE=''
  YELLOW=''
  RED=''
  BOLD=''
  NC=''
fi

# -----------------------------------------------------------------------------
# Logging and error handling
# -----------------------------------------------------------------------------
log() {
  printf '%b[dev-setup]%b %s\n' "$BLUE" "$NC" "$*"
}

success() {
  printf '%b[dev-setup] ✓%b %s\n' "$GREEN" "$NC" "$*"
}

warn() {
  printf '%b[dev-setup] warning:%b %s\n' "$YELLOW" "$NC" "$*" >&2
}

error() {
  printf '%b[dev-setup] error:%b %s\n' "$RED" "$NC" "$*" >&2
}

die() {
  error "$*"
  exit 1
}

header() {
  printf '\n%b==============================================%b\n' "$BLUE" "$NC"
  printf '%b %s%b\n' "$BLUE" "$*" "$NC"
  printf '%b==============================================%b\n' "$BLUE" "$NC"
}

# The ERR trap makes failures diagnosable instead of continuing after a failed
# package installation or a failed remote command.
on_error() {
  local exit_code=$?
  local line_no=$1
  local command=$2
  error "Command failed with exit code ${exit_code} at line ${line_no}: ${command}"
  error "A backup directory for this run is: ${BACKUP_DIR}"
  exit "$exit_code"
}
trap 'on_error "$LINENO" "$BASH_COMMAND"' ERR

have() {
  command -v "$1" >/dev/null 2>&1
}

# Execute a command, or print it faithfully in dry-run mode.  Do not use this
# function for shell syntax/pipelines; use run_shell for that case.
run() {
  if (( DRY_RUN )); then
    printf '%b+%b' "$YELLOW" "$NC"
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

# Use only for an unavoidable shell pipeline. The command is logged first.
run_shell() {
  local command=$1
  if (( DRY_RUN )); then
    printf '%b+%b %s\n' "$YELLOW" "$NC" "$command"
  else
    bash -c "$command"
  fi
}

confirm() {
  local prompt=$1

  (( ASSUME_YES )) && return 0
  [[ -t 0 ]] || die "${prompt} Re-run with --yes after reviewing the requested change."

  local answer
  read -r -p "${prompt} [y/N] " answer
  [[ "$answer" =~ ^[Yy]([Ee][Ss])?$ ]]
}

# -----------------------------------------------------------------------------
# Platform and package-manager detection
# -----------------------------------------------------------------------------
detect_platform() {
  case "$(uname -s)" in
    Darwin)
      PLATFORM="macos"
      PACKAGE_MANAGER="brew"
      ;;
    Linux)
      # Termux supplies this environment variable and does not normally use
      # sudo. It must be checked before /etc/os-release.
      if [[ -n "${TERMUX_VERSION:-}" || -n "${PREFIX:-}" && "${PREFIX:-}" == *"com.termux"* ]]; then
        PLATFORM="termux"
        PACKAGE_MANAGER="pkg"
        return
      fi

      [[ -r /etc/os-release ]] || die "Cannot identify this Linux distribution: /etc/os-release is unavailable."
      # shellcheck disable=SC1091
      . /etc/os-release
      case "${ID:-}" in
        ubuntu|debian|linuxmint|pop)
          PLATFORM="debian"
          PACKAGE_MANAGER="apt"
          ;;
        fedora|rhel|rocky|almalinux|centos)
          PLATFORM="fedora"
          PACKAGE_MANAGER="dnf"
          ;;
        arch|manjaro|endeavouros|garuda)
          PLATFORM="arch"
          PACKAGE_MANAGER="pacman"
          ;;
        alpine)
          PLATFORM="alpine"
          PACKAGE_MANAGER="apk"
          ;;
        *)
          die "Unsupported Linux distribution ID: ${ID:-unknown}."
          ;;
      esac
      ;;
    *)
      die "Unsupported operating system: $(uname -s)."
      ;;
  esac
}

# Never require sudo in Termux. On operating systems that use it, request the
# credentials once only if a selected operation will need system modification.
require_sudo() {
  [[ "$PLATFORM" == "termux" ]] && return 0
  have sudo || die "sudo is required for package installation on ${PLATFORM}."

  if (( DRY_RUN )); then
    log "Dry run: would validate sudo credentials."
  else
    sudo -v
  fi
}

# -----------------------------------------------------------------------------
# Backups and idempotent configuration editing
# -----------------------------------------------------------------------------
backup_file() {
  local file=$1
  [[ -e "$file" || -L "$file" ]] || return 0

  # Preserve each source file once per execution, even if more than one
  # component updates it.
  local target="$BACKUP_DIR/${file#$HOME/}"
  if [[ "$file" != "$HOME"/* ]]; then
    target="$BACKUP_DIR/external/$(basename "$file")"
  fi
  [[ -e "$target" || -L "$target" ]] && return 0

  run mkdir -p "$(dirname "$target")"
  run cp -a -- "$file" "$target"
  log "Backed up ${file}"
}

# Append a named configuration block exactly once. This prevents each run from
# adding another copy of prompt initialization or PATH exports.
append_managed_block() {
  local file=$1
  local name=$2
  local content=$3
  local begin="# >>> dev-shell-setup:${name} >>>"
  local end="# <<< dev-shell-setup:${name} <<<"

  run mkdir -p "$(dirname "$file")"
  if (( ! DRY_RUN )); then
    touch "$file"
  fi

  if [[ -f "$file" ]] && grep -Fqx "$begin" "$file"; then
    return 0
  fi

  backup_file "$file"
  if (( DRY_RUN )); then
    printf '%b+%b append managed block %q to %q\n' "$YELLOW" "$NC" "$name" "$file"
    return 0
  fi

  {
    printf '\n%s\n' "$begin"
    printf '%s\n' "$content"
    printf '%s\n' "$end"
  } >> "$file"
}

# Replace only a managed block owned by this script. This avoids overwriting
# unrelated user configuration while allowing updated function definitions.
replace_managed_block() {
  local file=$1
  local name=$2
  local content=$3
  local begin="# >>> dev-shell-setup:${name} >>>"
  local end="# <<< dev-shell-setup:${name} <<<"

  run mkdir -p "$(dirname "$file")"
  if (( ! DRY_RUN )); then
    touch "$file"
  fi

  backup_file "$file"
  if (( DRY_RUN )); then
    printf '%b+%b replace managed block %q in %q\n' "$YELLOW" "$NC" "$name" "$file"
    return 0
  fi

  local temporary
  temporary=$(mktemp)
  awk -v begin="$begin" -v end="$end" '
    $0 == begin { skipping=1; next }
    $0 == end { skipping=0; next }
    !skipping { print }
  ' "$file" > "$temporary"

  {
    cat "$temporary"
    printf '\n%s\n' "$begin"
    printf '%s\n' "$content"
    printf '%s\n' "$end"
  } > "$file"
  rm -f "$temporary"
}

# -----------------------------------------------------------------------------
# Package installation helpers
# -----------------------------------------------------------------------------
package_is_installed() {
  local package=$1
  case "$PACKAGE_MANAGER" in
    apt) dpkg -s "$package" >/dev/null 2>&1 ;;
    dnf) rpm -q "$package" >/dev/null 2>&1 ;;
    pacman) pacman -Q "$package" >/dev/null 2>&1 ;;
    apk) apk info -e "$package" >/dev/null 2>&1 ;;
    brew) brew list --versions "$package" >/dev/null 2>&1 ;;
    pkg) dpkg -s "$package" >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

update_package_index() {
  case "$PACKAGE_MANAGER" in
    apt)
      run sudo apt-get update
      ;;
    dnf)
      # DNF refreshes repository metadata during install. No separate full
      # system upgrade is performed by this installer.
      ;;
    pacman)
      # Avoid pacman -Sy partial upgrades. Synchronization is done together
      # with package install using pacman -Syu below.
      ;;
    apk)
      run sudo apk update
      ;;
    brew)
      run brew update
      ;;
    pkg)
      run pkg update -y
      ;;
  esac
}

install_packages() {
  local packages=("$@")
  local missing=()
  local package

  for package in "${packages[@]}"; do
    if package_is_installed "$package"; then
      log "Already installed: ${package}"
    else
      missing+=("$package")
    fi
  done

  ((${#missing[@]})) || return 0

  case "$PACKAGE_MANAGER" in
    apt)
      run sudo apt-get install -y "${missing[@]}"
      ;;
    dnf)
      run sudo dnf install -y "${missing[@]}"
      ;;
    pacman)
      # -Syu avoids partial upgrade behavior caused by pacman -Sy.
      run sudo pacman -Syu --needed --noconfirm "${missing[@]}"
      ;;
    apk)
      run sudo apk add "${missing[@]}"
      ;;
    brew)
      run brew install "${missing[@]}"
      ;;
    pkg)
      run pkg install -y "${missing[@]}"
      ;;
    *)
      die "No install strategy exists for package manager: ${PACKAGE_MANAGER}."
      ;;
  esac
}

install_base_dependencies() {
  header "Installing base dependencies"
  update_package_index

  case "$PLATFORM" in
    debian)
      install_packages git gh wget curl fzf ripgrep jq unzip python3 python3-pip util-linux lsof
      ;;
    fedora)
      install_packages git gh wget curl fzf ripgrep jq unzip python3 python3-pip util-linux lsof
      ;;
    arch)
      install_packages git github-cli wget curl fzf ripgrep jq unzip python python-pip lsof
      ;;
    alpine)
      install_packages git github-cli wget curl fzf ripgrep jq unzip python3 py3-pip util-linux lsof
      ;;
    macos)
      if ! have brew; then
        die "Homebrew is required on macOS. Install it first from https://brew.sh, then re-run this script."
      fi
      install_packages git gh wget curl fzf ripgrep jq unzip python lsof
      ;;
    termux)
      install_packages git wget curl fzf ripgrep jq python openssh lsof unzip
      ;;
  esac

  success "Base dependencies are installed"
}

# -----------------------------------------------------------------------------
# Component installers
# -----------------------------------------------------------------------------
install_fish() {
  header "Installing Fish shell"

  case "$PLATFORM" in
    debian) install_packages fish ;;
    fedora) install_packages fish ;;
    arch) install_packages fish ;;
    alpine) install_packages fish ;;
    macos) install_packages fish ;;
    termux) install_packages fish ;;
  esac

  local fish_config="$CONFIG_DIR/fish/config.fish"
  run mkdir -p "$CONFIG_DIR/fish/functions"

  # Disable Fish's stock greeting without affecting system-level MOTD files.
  append_managed_block "$fish_config" "greeting" 'set -U fish_greeting ""'

  # Preserve the requested original shortcuts. `del` intentionally remains a
  # privileged recursive delete command because the requested setup includes it.
  replace_managed_block "$CONFIG_DIR/fish/functions/in.fish" "function-in" 'function in --wraps="sudo apt install" --description "Install APT packages"
    sudo apt install $argv
end'

  replace_managed_block "$CONFIG_DIR/fish/functions/e.fish" "function-e" 'function e --wraps=nvim --description "Open Neovim"
    nvim $argv
end'

  replace_managed_block "$CONFIG_DIR/fish/functions/del.fish" "function-del" 'function del --wraps="sudo rm -rf" --description "Delete recursively with sudo"
    sudo rm -rf $argv
end'

  replace_managed_block "$CONFIG_DIR/fish/functions/setup.fish" "function-setup" 'function setup --description "Run the Server Shell Setup installer"
    bash -c "$(wget -qO- https://raw.githubusercontent.com/vtempest/server-shell-setup/refs/heads/master/install-shell.sh)"
end'

  replace_managed_block "$CONFIG_DIR/fish/functions/search.fish" "function-search" 'function search --description "Search file names and file contents with ripgrep"
    if test (count $argv) -eq 0
        echo "Usage: search <pattern>"
        return 1
    end

    set -l pattern $argv
    echo "=== File name matches ==="
    rg --files | rg -i -- $pattern
    echo
    echo "=== Content matches ==="
    rg -uu -n -i --context 3 -- $pattern
end'

  replace_managed_block "$CONFIG_DIR/fish/functions/killport.fish" "function-killport" 'function killport --description "Interactively kill a TCP listening process"
    if not type -q lsof
        echo "killport requires lsof. Install it and try again."
        return 1
    end

    set -l ports (sudo lsof -nP -iTCP -sTCP:LISTEN -Fp -Fc -Fn 2>/dev/null | awk '\''
        /^p/ { pid=substr($0, 2) }
        /^c/ { cmd=substr($0, 2) }
        /^n/ {
            name=substr($0, 2)
            sub(/^.*:/, "", name)
            if (name != "" && pid != "" && cmd != "") {
                key=name "|" pid
                if (!seen[key]++) printf "%s\\t%s\\t%s\\n", name, cmd, pid
            }
        }
    '\'')

    if test (count $ports) -eq 0
        echo "No TCP listening ports found."
        return 1
    end

    set -l selected
    if type -q fzf
        set selected (printf "%s\\n" $ports | fzf --delimiter=(printf "\\t") --with-nth=1,2,3 --prompt="Kill port: ")
    else
        echo "Listening ports:"
        for line in $ports
            echo $line | string replace -a "\\t" " | "
        end
        read -P "Enter exact port, command, PID row: " selected
    end

    if test -z "$selected"
        echo "No selection made."
        return 1
    end

    set -l fields (string split "\\t" -- $selected)
    set -l port $fields[1]
    set -l pname $fields[2]
    set -l pid $fields[3]

    if not string match -rq "^[0-9]+$" -- $pid
        echo "Could not determine a valid PID."
        return 1
    end

    read -P "Send SIGKILL to $pname (PID $pid) listening on port $port? [y/N] " answer
    if not string match -ri "^y(es)?$" -- $answer
        echo "Cancelled."
        return 0
    end

    sudo kill -9 $pid
    and echo "Killed $pname (PID $pid) on port $port"
end'

  # systemctl is not universal. The function performs a runtime check and gives
  # a useful message on macOS, Termux, containers, and non-systemd distributions.
  replace_managed_block "$CONFIG_DIR/fish/functions/service_manager.fish" "function-service-manager" 'function service_manager --description "Manage systemd services with fzf"
    if not type -q systemctl
        echo "service_manager requires systemd/systemctl."
        return 1
    end

    function __service_manager_services
        systemctl list-unit-files --no-legend --type=service 2>/dev/null | awk '\''{print "system\\t" $1}'\''
        systemctl --user list-unit-files --no-legend --type=service 2>/dev/null | awk '\''{print "user\\t" $1}'\''
    end

    set -l selection (__service_manager_services | fzf --delimiter=(printf "\\t") --with-nth=1,2 --prompt="Select a service: ")
    if test -z "$selection"
        return 0
    end

    set -l parts (string split "\\t" -- $selection)
    set -l scope $parts[1]
    set -l unit $parts[2]
    set -l action (printf "%s\\n" journal start stop restart status edit enable disable | fzf --prompt="Select action: ")
    if test -z "$action"
        return 0
    end

    switch $action
        case start stop restart enable disable
            if test "$scope" = system
                sudo systemctl $action --now $unit
            else
                systemctl --user $action --now $unit
            end
        case status
            if test "$scope" = system
                systemctl status $unit --no-pager
            else
                systemctl --user status $unit --no-pager
            end
        case edit
            if test "$scope" = system
                sudo systemctl edit --full $unit
            else
                systemctl --user edit --full $unit
            end
        case journal
            if test "$scope" = system
                sudo journalctl -u $unit -f
            else
                journalctl --user -u $unit -f
            end
    end
end'

  if (( SET_FISH_DEFAULT_SHELL )); then
    set_fish_as_default_shell
  else
    log "Fish installed. Start it with: fish"
    log "To make it your login shell, rerun with --set-fish-default-shell."
  fi

  success "Fish shell and requested helper functions are configured"
}

set_fish_as_default_shell() {
  local fish_path
  fish_path=$(command -v fish)
  [[ -n "$fish_path" ]] || die "Fish was not found after installation."

  if [[ "$PLATFORM" == "termux" ]]; then
    warn "Termux does not use chsh in the usual Linux sense; Fish was installed but is not being set as the login shell."
    return 0
  fi

  if [[ -r /etc/shells ]] && ! grep -Fxq "$fish_path" /etc/shells; then
    warn "${fish_path} is not listed in /etc/shells; chsh may reject it."
  fi

  confirm "Change your default login shell to ${fish_path}?" || {
    log "Leaving your current login shell unchanged."
    return 0
  }

  run chsh -s "$fish_path"
  success "Fish is now your default login shell; open a new terminal session to use it"
}

install_nushell() {
  header "Installing Nushell"

  # Prefer the OS package manager rather than npm. The official Nu installation
  # documentation supports packages/releases and the npm route lacks plugins.
  case "$PLATFORM" in
    debian)
      install_packages nushell
      ;;
    fedora)
      install_packages nushell
      ;;
    arch)
      install_packages nushell
      ;;
    alpine)
      install_packages nushell
      ;;
    macos)
      install_packages nushell
      ;;
    termux)
      install_packages nushell
      ;;
  esac

  local nu_config="$CONFIG_DIR/nushell/config.nu"
  append_managed_block "$nu_config" "base-settings" '$env.config.show_banner = false
$env.EDITOR = "nvim"'

  success "Nushell installed"
}

install_nvim() {
  header "Installing Neovim"

  case "$PLATFORM" in
    debian) install_packages neovim ;;
    fedora) install_packages neovim ;;
    arch) install_packages neovim ;;
    alpine) install_packages neovim ;;
    macos) install_packages neovim ;;
    termux) install_packages neovim ;;
  esac

  # NvChad is opt-in because it replaces the active Neovim configuration. Ask
  # before moving any existing configuration directory to a timestamped backup.
  if confirm "Install the NvChad starter configuration (backs up existing ~/.config/nvim)?"; then
    local nvim_config="$CONFIG_DIR/nvim"
    if [[ -d "$nvim_config" && ! -d "$nvim_config/.git" ]]; then
      run mkdir -p "$BACKUP_DIR"
      run mv "$nvim_config" "$BACKUP_DIR/nvim"
      log "Existing Neovim configuration moved to ${BACKUP_DIR}/nvim"
    elif [[ -d "$nvim_config" ]]; then
      # Any existing NvChad/git config is left in place instead of being
      # overwritten. Users can update it using Git intentionally.
      log "Existing Git-based Neovim configuration found; leaving it unchanged."
      success "Neovim installed"
      return 0
    fi

    if [[ ! -d "$nvim_config" ]]; then
      run git clone --depth=1 https://github.com/NvChad/starter "$nvim_config"
      if (( ! DRY_RUN )); then
        # This initialization is nonfatal: plugins may require network access
        # or a newer Neovim build on some distributions.
        nvim --headless "+Lazy! sync" +qa || warn "NvChad plugin sync did not complete; run :Lazy sync inside Neovim."
      fi
    fi
  fi

  success "Neovim installed"
}

install_helix() {
  header "Installing Helix editor"

  case "$PLATFORM" in
    debian) install_packages helix ;;
    fedora) install_packages helix ;;
    arch) install_packages helix ;;
    alpine) install_packages helix ;;
    macos) install_packages helix ;;
    termux) install_packages helix ;;
  esac

  success "Helix installed"
}

# Yazi is packaged on Arch, Alpine, Homebrew, and Termux. Debian/Ubuntu and
# Fedora/RHEL do not ship it in their default repositories, so on those (or if
# the distro package is unavailable) install the official prebuilt release.
install_yazi_release() {
  have curl || die "curl is required to download the Yazi release."
  have unzip || die "unzip is required to extract the Yazi release."

  local arch libc
  case "$(uname -m)" in
    x86_64|amd64) arch="x86_64" ;;
    aarch64|arm64) arch="aarch64" ;;
    *) die "No prebuilt Yazi release exists for architecture: $(uname -m)." ;;
  esac
  libc="gnu"
  [[ "$PLATFORM" == "alpine" ]] && libc="musl"

  local target="yazi-${arch}-unknown-linux-${libc}"
  local url="https://github.com/sxyazi/yazi/releases/latest/download/${target}.zip"

  if (( DRY_RUN )); then
    printf '%b+%b download %q and install yazi, ya to /usr/local/bin\n' "$YELLOW" "$NC" "$url"
    return 0
  fi

  local workdir
  workdir=$(mktemp -d)
  curl -fsSL -o "$workdir/yazi.zip" "$url"
  unzip -q "$workdir/yazi.zip" -d "$workdir"
  sudo install -m 0755 "$workdir/$target/yazi" "$workdir/$target/ya" /usr/local/bin/
  rm -rf -- "${workdir:?}"
}

install_yazi() {
  header "Installing Yazi file manager"

  case "$PLATFORM" in
    debian|fedora)
      install_packages file
      have yazi && log "Already installed: yazi" || install_yazi_release
      ;;
    alpine)
      install_packages file
      if ! have yazi; then
        install_packages yazi || {
          warn "The yazi apk is unavailable; installing the prebuilt release instead."
          install_yazi_release
        }
      fi
      ;;
    arch) install_packages yazi file ;;
    macos) install_packages yazi ;;
    termux) install_packages yazi file ;;
  esac

  # `y` wraps yazi so quitting it changes the shell into the last directory.
  append_managed_block "$HOME/.bashrc" "yazi" 'y() {
  local tmp cwd
  tmp="$(mktemp -t "yazi-cwd.XXXXXX")"
  command yazi "$@" --cwd-file="$tmp"
  IFS= read -r -d "" cwd < "$tmp"
  [ -n "$cwd" ] && [ "$cwd" != "$PWD" ] && builtin cd -- "$cwd"
  command rm -f -- "$tmp"
}'

  replace_managed_block "$CONFIG_DIR/fish/functions/y.fish" "function-y" 'function y --wraps=yazi --description "Open Yazi and cd to its last directory on exit"
    set tmp (mktemp -t "yazi-cwd.XXXXXX")
    command yazi $argv --cwd-file="$tmp"
    if read -z cwd < "$tmp"; and test "$cwd" != "$PWD"; and test -d "$cwd"
        builtin cd -- "$cwd"
    end
    command rm -f -- "$tmp"
end'

  append_managed_block "$CONFIG_DIR/nushell/config.nu" "yazi" 'def --env y [...args] {
    let tmp = (mktemp -t "yazi-cwd.XXXXXX")
    yazi ...$args --cwd-file $tmp
    let cwd = (open $tmp)
    if $cwd != "" and $cwd != $env.PWD {
        cd $cwd
    }
    rm -fp $tmp
}'

  success "Yazi installed; run y to browse and cd on exit"
}

install_node() {
  header "Installing Node.js with Volta"

  if [[ "$PLATFORM" == "termux" ]]; then
    install_packages nodejs
    success "Node.js installed through Termux"
    return 0
  fi

  if ! have curl; then
    die "curl is required to install Volta."
  fi

  if ! have volta; then
    # Volta's official Unix installer. Its output modifies shell startup files
    # where appropriate; we invoke the installed binary by absolute path below
    # so this script does not depend on source ~/.bashrc behavior.
    run_shell 'curl -fsSL https://get.volta.sh | bash'
  fi

  local volta_bin="$HOME/.volta/bin/volta"
  [[ -x "$volta_bin" || "$DRY_RUN" -eq 1 ]] || die "Volta installation completed but ${volta_bin} was not found."

  run "$volta_bin" install "node@${NODE_VERSION}"
  run "$volta_bin" install pnpm yarn

  # Fish does not source ~/.profile, so explicitly add Volta's bin directory.
  append_managed_block "$CONFIG_DIR/fish/config.fish" "volta-path" 'fish_add_path -g $HOME/.volta/bin'

  success "Node.js ${NODE_VERSION}, pnpm, and yarn installed through Volta"
}

install_bun() {
  header "Installing Bun"

  if ! have curl; then
    die "curl is required to install Bun."
  fi

  # Bun installs into ~/.bun. Keep its installer isolated from the package
  # manager, then configure PATH idempotently for supported shells.
  run_shell 'curl -fsSL https://bun.sh/install | bash'

  append_managed_block "$HOME/.bashrc" "bun-path" 'export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"'

  append_managed_block "$CONFIG_DIR/fish/config.fish" "bun-path" 'set -gx BUN_INSTALL "$HOME/.bun"
fish_add_path -g "$BUN_INSTALL/bin"'

  append_managed_block "$CONFIG_DIR/nushell/config.nu" "bun-path" '$env.BUN_INSTALL = ($env.HOME | path join ".bun")
$env.PATH = ($env.PATH | prepend ($env.BUN_INSTALL | path join "bin"))'

  success "Bun installed"
}

install_pacstall() {
  header "Installing Pacstall"

  [[ "$PLATFORM" == "debian" ]] || die "Pacstall is available only on Ubuntu/Debian-like systems."
  confirm "Install Pacstall from its remote installer?" || {
    log "Pacstall installation skipped."
    return 0
  }

  run_shell 'curl -fsSL https://pacstall.dev/q/install | sudo bash -s -- -y'
  success "Pacstall installed"
}

install_docker_rootless() {
  header "Installing Docker with rootless mode"

  [[ "$PLATFORM" != "macos" && "$PLATFORM" != "termux" ]] || die "This rootless Docker path is Linux-only and is not supported for ${PLATFORM}."
  have systemctl || die "Rootless Docker setup requires systemctl/user services."

  # Rootless Docker needs subordinate IDs and newuidmap/newgidmap (uidmap).
  case "$PLATFORM" in
    debian) install_packages uidmap ;;
    fedora) install_packages shadow-utils ;;
    arch) install_packages shadow ;;
    alpine) install_packages shadow-uidmap ;;
  esac

  if [[ -r /etc/subuid ]] && ! grep -q "^${USER}:" /etc/subuid; then
    die "No subordinate UID range exists for ${USER} in /etc/subuid. Configure one before installing rootless Docker."
  fi
  if [[ -r /etc/subgid ]] && ! grep -q "^${USER}:" /etc/subgid; then
    die "No subordinate GID range exists for ${USER} in /etc/subgid. Configure one before installing rootless Docker."
  fi

  confirm "Install Docker in rootless mode using Docker's remote setup script?" || {
    log "Docker installation skipped."
    return 0
  }

  # Docker's documented convenience installer. This should remain opt-in because
  # it installs system packages and a daemon, and distributions may prefer their
  # own documented repository setup.
  run_shell 'curl -fsSL https://get.docker.com/rootless | sh'

  if have dockerd-rootless-setuptool.sh; then
    run dockerd-rootless-setuptool.sh install
  else
    die "dockerd-rootless-setuptool.sh was not found after installation."
  fi

  # Allow the user's rootless service to continue after logout when systemd is
  # available. Do not treat an unavailable loginctl as a hard failure.
  if have loginctl; then
    run loginctl enable-linger "$USER"
  fi

  append_managed_block "$HOME/.profile" "docker-rootless" 'export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"'
  append_managed_block "$HOME/.bashrc" "docker-rootless" 'export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"'
  append_managed_block "$CONFIG_DIR/fish/config.fish" "docker-rootless" 'set -gx DOCKER_HOST "unix:///run/user/(id -u)/docker.sock"'
  append_managed_block "$CONFIG_DIR/nushell/config.nu" "docker-rootless" '$env.DOCKER_HOST = $"unix:///run/user/(id -u)/docker.sock"'

  if (( ! DRY_RUN )); then
    docker info 2>/dev/null | grep -qi rootless || warn "Docker was installed but rootless mode could not be verified in this shell yet. Log out/in, then run: docker info"
  fi

  success "Rootless Docker installation completed"
}

install_starship() {
  header "Installing Starship prompt"

  case "$PLATFORM" in
    debian) install_packages starship ;;
    fedora) install_packages starship ;;
    arch) install_packages starship ;;
    alpine) install_packages starship ;;
    macos) install_packages starship ;;
    termux) install_packages starship ;;
  esac

  run mkdir -p "$CONFIG_DIR"
  local starship_config="$CONFIG_DIR/starship.toml"
  if [[ ! -f "$starship_config" ]]; then
    if (( DRY_RUN )); then
      printf '%b+%b create %q\n' "$YELLOW" "$NC" "$starship_config"
    else
      cat > "$starship_config" <<'EOF'
[character]
success_symbol = "ƒ "
error_symbol = "ƒ "
vimcmd_symbol = "ƒ "
EOF
    fi
  else
    log "Existing Starship config preserved: ${starship_config}"
  fi

  append_managed_block "$HOME/.bashrc" "starship" 'command -v starship >/dev/null 2>&1 && eval "$(starship init bash)"'
  append_managed_block "$CONFIG_DIR/fish/config.fish" "starship" 'if type -q starship
    starship init fish | source
end'
  append_managed_block "$CONFIG_DIR/nushell/config.nu" "starship" 'mkdir ($nu.data-dir | path join "vendor/autoload")
starship init nu | save -f ($nu.data-dir | path join "vendor/autoload/starship.nu")'

  success "Starship installed and configured"
}

install_systeminfo() {
  header "Installing system information greeting"

  # Do not invoke npx automatically at every shell startup: that can be slow,
  # network-dependent, and mutate a package cache. Define a command instead.
  # The user can run `systeminfo` when desired.
  replace_managed_block "$CONFIG_DIR/fish/functions/systeminfo.fish" "function-systeminfo" 'function systeminfo --description "Display system information through about-system"
    npx --yes about-system@latest
end'

  append_managed_block "$HOME/.bashrc" "systeminfo" 'systeminfo() { npx --yes about-system@latest; }'
  append_managed_block "$CONFIG_DIR/nushell/config.nu" "systeminfo" 'def systeminfo [] { npx --yes about-system@latest }'

  # .hushlogin suppresses standard motd output for the current user only. It
  # does not delete /etc/motd or OS-managed update scripts.
  if confirm "Create ~/.hushlogin to suppress the standard login message for this user?"; then
    if (( DRY_RUN )); then
      printf '%b+%b touch %q\n' "$YELLOW" "$NC" "$HOME/.hushlogin"
    else
      touch "$HOME/.hushlogin"
    fi
  fi

  success "Added an on-demand systeminfo command"
}

install_code_server() {
  header "Installing code-server"

  [[ "$PLATFORM" != "termux" ]] || die "code-server installation is not enabled by this script for Termux."
  confirm "Install code-server from its remote installer?" || {
    log "code-server installation skipped."
    return 0
  }

  run_shell 'curl -fsSL https://code-server.dev/install.sh | sh'
  success "code-server installed"
}

enable_sudo_without_password() {
  header "Enable sudo without password"

  [[ "$PLATFORM" != "termux" ]] || die "Passwordless sudo does not apply to Termux."
  local current_user
  current_user=$(id -un)
  local sudoers_file="/etc/sudoers.d/${current_user}"

  confirm "Allow ${current_user} to run every sudo command without a password? This materially reduces local security." || {
    log "Passwordless sudo was not enabled."
    return 0
  }

  if (( DRY_RUN )); then
    printf '%b+%b create passwordless sudo policy at %q\n' "$YELLOW" "$NC" "$sudoers_file"
    return 0
  fi

  printf '%s ALL=(ALL) NOPASSWD:ALL\n' "$current_user" | sudo tee "$sudoers_file" >/dev/null
  sudo chmod 0440 "$sudoers_file"
  sudo visudo -cf "$sudoers_file"
  success "Passwordless sudo enabled for ${current_user}"
}

enable_ssh_with_password() {
  header "Enable SSH password authentication"

  [[ "$PLATFORM" != "termux" && "$PLATFORM" != "macos" ]] || die "This SSH server configuration path is intended for Linux hosts only."
  [[ -f /etc/ssh/sshd_config ]] || die "OpenSSH server configuration was not found at /etc/ssh/sshd_config."

  confirm "Enable SSH password authentication? This can materially increase brute-force attack exposure on an internet-reachable host." || {
    log "SSH password authentication was not enabled."
    return 0
  }

  if (( DRY_RUN )); then
    printf '%b+%b modify OpenSSH PasswordAuthentication policy\n' "$YELLOW" "$NC"
    return 0
  fi

  local backup="$BACKUP_DIR/sshd_config"
  mkdir -p "$BACKUP_DIR"
  sudo cp -a /etc/ssh/sshd_config "$backup"
  sudo sed -Ei.bak 's/^[[:space:]]*#?[[:space:]]*PasswordAuthentication[[:space:]]+.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
  if ! grep -Eq '^[[:space:]]*PasswordAuthentication[[:space:]]+yes' /etc/ssh/sshd_config; then
    printf '\nPasswordAuthentication yes\n' | sudo tee -a /etc/ssh/sshd_config >/dev/null
  fi

  sudo sshd -t
  if have systemctl; then
    sudo systemctl restart sshd 2>/dev/null || sudo systemctl restart ssh
  else
    sudo service ssh restart 2>/dev/null || sudo service sshd restart
  fi
  success "SSH password authentication enabled; SSH configuration backup: ${backup}"
}

# -----------------------------------------------------------------------------
# Component selection, menu, and argument parsing
# -----------------------------------------------------------------------------
print_help() {
  cat <<EOF
Usage: ${SCRIPT_NAME} [options]

Options:
  --components LIST             Comma-separated list: fish,nushell,nvim,helix,yazi,node,bun,pacstall,docker,starship,systeminfo,code,sudo,ssh,all
  --node-version VERSION        Node major/version for Volta (default: ${NODE_VERSION})
  --set-fish-default-shell      Ask to make Fish the login shell after installation
  --yes, -y                     Accept confirmation prompts
  --dry-run                     Print commands and planned configuration changes only
  --no-upgrade                  Reserved compatibility flag; package upgrades are already avoided except Arch's required synchronized update
  --help, -h                    Show this help text

Examples:
  ${SCRIPT_NAME}
  ${SCRIPT_NAME} --components fish,node,nvim,starship --yes
  ${SCRIPT_NAME} --components docker --dry-run
  ${SCRIPT_NAME} --components fish --set-fish-default-shell
EOF
}

show_menu() {
  cat <<'EOF'
Select components to install (comma-separated numbers, component names, or all):
  1)  Install common developer environment
  2)  Fish Shell
  3)  Neovim (optionally NvChad)
  4)  Helix
  5)  Node.js via Volta
  6)  Bun
  7)  Pacstall (Debian/Ubuntu only)
  8)  Docker rootless mode (Linux/systemd only)
  9)  Starship prompt
  10) System info command
  11) Nushell
  12) code-server
  13) Enable passwordless sudo (advanced/security-sensitive)
  14) Enable SSH password authentication (advanced/security-sensitive)
  15) Yazi terminal file manager

EOF
}

add_component() {
  local component=$1
  local existing
  for existing in "${COMPONENTS[@]:-}"; do
    [[ "$existing" == "$component" ]] && return 0
  done
  COMPONENTS+=("$component")
}

select_all_components() {
  # `all` deliberately excludes security-sensitive sudo/SSH settings and
  # excludes Docker/code-server because those are infrastructure choices, not
  # universally desirable workstation defaults.
  COMPONENTS=(fish nushell nvim helix yazi node bun pacstall starship systeminfo)
}

parse_component_token() {
  local token=$1
  case "$token" in
    1|all) select_all_components ;;
    2|fish) add_component fish ;;
    3|nvim|neovim) add_component nvim ;;
    4|helix) add_component helix ;;
    5|node) add_component node ;;
    6|bun) add_component bun ;;
    7|pacstall) add_component pacstall ;;
    8|docker) add_component docker ;;
    9|starship) add_component starship ;;
    10|systeminfo) add_component systeminfo ;;
    11|nushell|nu) add_component nushell ;;
    12|code|code-server) add_component code ;;
    13|sudo) add_component sudo ;;
    14|ssh) add_component ssh ;;
    15|yazi) add_component yazi ;;
    '') ;;
    *) die "Unknown component: ${token}" ;;
  esac
}

parse_component_list() {
  local raw=$1
  raw=$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
  [[ -n "$raw" ]] || raw="all"

  local token
  IFS=',' read -r -a tokens <<< "$raw"
  for token in "${tokens[@]}"; do
    parse_component_token "$token"
  done
}

parse_args() {
  while (($#)); do
    case "$1" in
      --components|-c)
        (($# >= 2)) || die "--components needs a value."
        parse_component_list "$2"
        shift 2
        ;;
      --node-version)
        (($# >= 2)) || die "--node-version needs a value."
        NODE_VERSION=$2
        shift 2
        ;;
      --set-fish-default-shell)
        SET_FISH_DEFAULT_SHELL=1
        shift
        ;;
      --yes|-y)
        ASSUME_YES=1
        shift
        ;;
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      --no-upgrade)
        UPGRADE_PACKAGES=0
        shift
        ;;
      --help|-h)
        print_help
        exit 0
        ;;
      all|fish|nushell|nu|nvim|neovim|helix|yazi|node|bun|pacstall|docker|starship|systeminfo|code|code-server|sudo|ssh)
        # Backward-compatible positional component list support.
        parse_component_list "$1"
        shift
        ;;
      *)
        die "Unknown option or component: $1. Run ${SCRIPT_NAME} --help."
        ;;
    esac
  done
}

choose_interactively() {
  INTERACTIVE=1
  show_menu
  local choice
  read -r -p "Enter your choice(s) [all]: " choice
  parse_component_list "$choice"
}

# -----------------------------------------------------------------------------
# Verification and orchestration
# -----------------------------------------------------------------------------
verify_component() {
  local component=$1
  case "$component" in
    fish) have fish && success "Verified: $(fish --version)" || warn "Fish was not found on PATH."
      ;;
    nushell) have nu && success "Verified: $(nu --version)" || warn "Nushell was not found on PATH."
      ;;
    nvim) have nvim && success "Verified: $(nvim --version | head -n1)" || warn "Neovim was not found on PATH."
      ;;
    helix) have hx && success "Verified: $(hx --version | head -n1)" || warn "Helix was not found on PATH."
      ;;
    yazi) have yazi && success "Verified: $(yazi --version | head -n1)" || warn "Yazi was not found on PATH."
      ;;
    node)
      if have node; then
        success "Verified: $(node --version)"
      elif [[ -x "$HOME/.volta/bin/node" ]]; then
        success "Verified: $($HOME/.volta/bin/node --version)"
      else
        warn "Node.js was not found on PATH in this current shell. Open a new shell session."
      fi
      ;;
    bun) have bun && success "Verified: $(bun --version)" || warn "Bun may require a new shell session before it appears on PATH."
      ;;
    starship) have starship && success "Verified: $(starship --version)" || warn "Starship was not found on PATH."
      ;;
    docker) have docker && success "Verified: $(docker --version)" || warn "Docker was not found on PATH."
      ;;
    code) have code-server && success "Verified: $(code-server --version | head -n1)" || warn "code-server was not found on PATH."
      ;;
  esac
}

install_components() {
  ((${#COMPONENTS[@]})) || die "No components were selected."

  header "Developer Environment Setup"
  log "Platform: ${PLATFORM} (${PACKAGE_MANAGER})"
  log "Selected components: ${COMPONENTS[*]}"
  (( DRY_RUN )) && warn "DRY RUN: no package, configuration, or system changes will be made."

  # Base dependencies are intentionally installed once, before components.
  require_sudo
  install_base_dependencies

  local component
  for component in "${COMPONENTS[@]}"; do
    case "$component" in
      fish) install_fish ;;
      nushell) install_nushell ;;
      nvim) install_nvim ;;
      helix) install_helix ;;
      yazi) install_yazi ;;
      node) install_node ;;
      bun) install_bun ;;
      pacstall) install_pacstall ;;
      docker) install_docker_rootless ;;
      starship) install_starship ;;
      systeminfo) install_systeminfo ;;
      code) install_code_server ;;
      sudo) enable_sudo_without_password ;;
      ssh) enable_ssh_with_password ;;
      *) die "Internal error: unhandled component ${component}." ;;
    esac

    (( DRY_RUN )) || verify_component "$component"
  done

  header "Installation Complete"
  printf 'Installed or configured:\n'
  for component in "${COMPONENTS[@]}"; do
    printf '  - %s\n' "$component"
  done

  if (( ! DRY_RUN )); then
    printf '\nBackups created during this run: %s\n' "$BACKUP_DIR"
  fi

  if [[ " ${COMPONENTS[*]} " == *" fish " ]]; then
    printf '\nFish is installed. Start it with: fish\n'
  fi
  if [[ " ${COMPONENTS[*]} " == *" node " ]]; then
    printf 'Open a new terminal session before relying on Volta PATH changes.\n'
  fi
  if [[ " ${COMPONENTS[*]} " == *" docker " ]]; then
    printf 'For rootless Docker, log out/in if docker info does not yet report rootless mode.\n'
  fi

  # Intentionally do NOT exec fish here. Replacing the invoking shell is
  # surprising, especially when the script is piped through curl/wget.
}

main() {
  detect_platform

  if (($# == 0)); then
    choose_interactively
  else
    parse_args "$@"
  fi

  install_components
}

main "$@"
