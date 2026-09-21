#!/bin/bash

# =========================================================
# Developer Environment Setup Script
# =========================================================
# Use interactive menu to install top dev tools and shell.
# Systems Supported: Android (Termux), macOS, Ubuntu/Debian, Fedora, Arch, Alpine
#
# Usage: bash -c "$( wget -q https://raw.githubusercontent.com/OpenSourceAGI/appdemo-starter-template/refs/heads/master/packages/server-shell-setup/install-shell.sh -O -)"
#  Headless: 
#  wget -qO- https://raw.githubusercontent.com/OpenSourceAGI/appdemo-starter-template/refs/heads/master/packages/server-shell-setup/install-shell.sh | bash -s -- "all"
# SSH With Password:
#  wget -qO- https://raw.githubusercontent.com/OpenSourceAGI/appdemo-starter-template/refs/heads/master/packages/server-shell-setup/install-shell.sh | bash -s -- ssh
# Available components:
#   - fish: Modern shell with auto-suggestions and improved syntax highlighting
#   - nushell: Data-oriented shell with structured data handling
#   - nvim: Neovim text editor with NvChad configuration
#   - helix: Modern terminal-based text editor with Rust
#   - node: Node.js via Volta version manager
#   - bun: Fast JavaScript runtime, bundler, transpiler and package manager
#   - pacstall: Package manager for Debian/Ubuntu (like AUR for Arch)
#   - docker: Docker container platform with rootless mode
#   - starship: Cross-shell customizable prompt
#   - all: Install all components
#
#   Author: vtempest (2022-25) https://github.com/vtempest/Server-Shell-Setup
#   Published: 2025-05-04, License: MIT

# Set text colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Suppress interactive prompts during apt/dpkg operations
export DEBIAN_FRONTEND=noninteractive

# Exit script immediately if any command returns a non-zero status
# set -e

# Detect operating system
detect_os() {
    if grep -qi darwin /etc/os-release 2>/dev/null || [ "$(uname)" = "Darwin" ]; then
        echo "darwin"
        return
    fi
    if [ "$(uname -a | awk '{print $NF}')" = "Android" ]; then
        echo "android"
        return
    fi
    if [ -f /etc/pacman.conf ]; then
        echo "arch"
        return
    fi
    if command_exists apt; then
        echo "ubuntu"
    elif command_exists dnf; then
        echo "fedora"
    elif command_exists apk; then
        echo "alpine"
    elif command_exists pacman; then
        echo "arch"
    else
        echo "unknown"
    fi

}

# Print colored message
print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}${msg}${NC}"
}

# Print section header
print_header() {
    echo ""
    print_msg "$BLUE" "=============================================="
    print_msg "$BLUE" " $1"
    print_msg "$BLUE" "=============================================="
}

# Print success message
print_success() {
    print_msg "$GREEN" "✓ $1"
}

# Print error message
print_error() {
    print_msg "$RED" "✗ $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install base dependencies based on OS
install_base_deps() {
    print_header "Installing base dependencies"

    OS=$(detect_os)
    case "$OS" in
    ubuntu | debian)
        sudo apt update
        sudo apt install -y git gh wget curl fzf ripgrep hostname python3 python3-pip util-linux unzip software-properties-common 
        print_success "Base dependencies installed"
        ;;
    fedora)
        sudo dnf install -y git gh wget curl fzf ripgrep python3 python3-pip util-linux unzip
        print_success "Base dependencies installed"
        ;;
    arch)

        # Install yay package manager
        if ! command_exists yay; then
            print_msg "$YELLOW" "Installing yay package manager..."
            
            # Initialize and populate pacman keys
            sudo pacman-key --init
            sudo pacman-key --populate archlinux
            sudo pacman -Syu
            sudo pacman -S archlinux-keyring

            # Update system and install required tools
            sudo pacman -Syu --noconfirm
            sudo pacman -S --needed --noconfirm base-devel git gcc glibc github-cli

            # Install yay from AUR
            cd /tmp
            git clone https://aur.archlinux.org/yay-bin.git
            cd yay-bin
            makepkg -si --noconfirm

            # Clean up installation files
            cd ..
            rm -rf yay-bin
            
            print_success "yay package manager installed"
        fi

        sudo pacman -Sy --noconfirm git wget curl fzf ripgrep inetutils python python-pip unzip

        print_success "Base dependencies installed"
        ;;
    alpine)
        sudo apk add git wget curl fzf ripgrep python3 py3-pip util-linux unzip github-cli
        print_success "Base dependencies installed"
        ;;
    android)
        # make repo sources faster
        for f in $PREFIX/etc/apt/sources.list $PREFIX/etc/apt/sources.list.d/*.sources; do [ -f "$f" ] && sed -i 's|https://packages.termux.dev|https://gnlug.org/pub/termux|g' "$f"; done && pkg update
        pkg update
        pkg upgrade -y
        pkg i -y git ripgrep wget curl fzf python libcurl openssl openssh proot-distro pulseaudio unzip gh
        
        #ubuntu
        proot-distro install ubuntu

        wget https://raw.githubusercontent.com/LinuxDroidMaster/Termux-Desktops/main/scripts/proot_ubuntu/startxfce4_ubuntu.sh
        chmod +x startxfce4_ubuntu.sh

        proot-distro login ubuntu -- bash -c "apt update && apt upgrade -y && apt install sudo nano adduser -y && adduser ubuntu && adduser ubuntu sudo && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/ubuntu && sudo chmod 0440 /etc/sudoers.d/ubuntu"

        # ./startxfce4_ubuntu.sh


        print_success "Base dependencies installed via Termux"
        ;;
    darwin)
        # Check if Homebrew is installed
        if ! command_exists brew; then
            print_msg "$YELLOW" "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install git wget curl python unzip gh
        print_success "Base dependencies installed via Homebrew"
        ;;
    *)
        print_error "Unsupported OS: $OS"
        exit 1
        ;;
    esac
}

# Install Fish shell
install_fish() {
    print_header "Installing Fish Shell"
    print_msg "$YELLOW" "Fish is a smart and user-friendly shell with syntax highlighting and auto-suggestions"

    OS=$(detect_os)
    case "$OS" in
    ubuntu | debian)
        if command_exists add-apt-repository; then
            sudo add-apt-repository -y ppa:fish-shell/release-3
        fi
        sudo apt install -y fish
        ;;
    fedora)
        sudo dnf install -y fish
        ;;
    arch)
        sudo pacman -Sy --noconfirm fish
        ;;
    alpine)
        sudo apk add fish
        ;;
    darwin)
        brew install fish
        ;;
    android)
        pkg install -y fish
        ;;
    esac
    # change default shell to fish
    sudo chsh -s $(which fish) $USER
    # might ask for password
    chsh -s $(which fish) $USER

    # Setup fish plugins
    print_msg "$YELLOW" "Setting up Fish plugins (oh-my-fish, fzf, z, pisces)"
    curl https://raw.githubusercontent.com/oh-my-fish/oh-my-fish/master/bin/install >omf-install.sh
    chmod +x omf-install.sh
    fish -c "./omf-install.sh --path=~/.local/share/omf --config=~/.config/omf --noninteractive -y"
    fish -c "omf install fzf z pisces"
    rm -f omf-install.sh


    # Create Fish config if it doesn't exist
    mkdir -p ~/.config/fish
    mkdir -p ~/.config/fish/functions
    touch ~/.config/fish/config.fish


    # add service manager to fish
   echo 'function service_manager
    function get_services
        # System services
        systemctl list-unit-files --no-legend --type=service | awk '\''{print "[system] " $1}'\''
        # User services
        systemctl --user list-unit-files --no-legend --type=service 2>/dev/null | awk '\''{print "[user] " $1}'\''
    end

    function choose_action
        printf '\''%s\n'\'' \
            journal \
            start \
            stop \
            restart \
            status \
            edit \
            enable \
            disable \
            | fzf --reverse --prompt="Select action: "
    end

    function do_action
        set scope $argv[1]
        set unit $argv[2]
        set action $argv[3]
        switch $action
            case start
                if test $scope = system
                    sudo systemctl start $unit
                else
                    systemctl --user start $unit
                end
            case stop
                if test $scope = system
                    sudo systemctl stop $unit
                else
                    systemctl --user stop $unit
                end
            case restart
                if test $scope = system
                    sudo systemctl restart $unit
                else
                    systemctl --user restart $unit
                end
            case status
                if test $scope = system
                    systemctl status $unit --no-pager
                else
                    systemctl --user status $unit --no-pager
                end
            case edit
                if test $scope = system
                    sudo systemctl edit --full $unit
                else
                    systemctl --user edit --full $unit
                end
            case enable
                if test $scope = system
                    sudo systemctl enable --now $unit
                else
                    systemctl --user enable --now $unit
                end
            case disable
                if test $scope = system
                    sudo systemctl disable --now $unit
                else
                    systemctl --user disable --now $unit
                end
            case journal
                if test $scope = system
                    sudo journalctl -u $unit -f
                else
                    journalctl --user -u $unit -f
                end
        end
    end

    set selection (get_services | fzf --ansi --prompt="Select a service: " --preview="set line {}; set scope (echo {} | awk '\''{print \$1}'\''); set unit (echo {} | awk '\''{print \$2}'\''); if test \$scope = '\''[system]'\''; systemctl status \$unit --no-pager; else; systemctl --user status \$unit --no-pager; end")

    if test -z "$selection"
        return
    end

    set scope (echo $selection | awk '\''{print $1}'\'' | tr -d '\''[]'\'')
    set unit (echo $selection | awk '\''{print $2}'\'')

    set action (choose_action)
    if test -z "$action"
        return
    end

    do_action $scope $unit $action
end
' > ~/.config/fish/functions/service_manager.fish



    # Add apt install as in
    echo 'function setup
        bash -c "$( wget -q https://raw.githubusercontent.com/vtempest/server-shell-setup/refs/heads/master/install-shell.sh -O -)"
    end' >~/.config/fish/functions/setup.fish




    # Add apt install as in
    echo 'function in --wraps="sudo apt install" --description "alias in=sudo apt install"
        sudo apt install $argv
    end' >~/.config/fish/functions/in.fish

    # Add editor as e
    echo 'function e --wraps=nvim --description "alias e=nvim"
        nvim $argv
    end' >~/.config/fish/functions/e.fish

    # Add del function
    echo 'function del --wraps="sudo rm -rf" --description "alias del=sudo rm -rf"
        sudo rm -rf $argv
    end' >~/.config/fish/functions/del.fish


    # Add search function to Fish
    echo 'function search
        if test (count $argv) -eq 0
            echo "Usage: search <pattern>"
            return 1
        end
        set pattern $argv
        echo "=== File name matches ==="
        rg --files | rg -i $pattern
        echo
        echo "=== Content matches (3 words before and after) ==="
        rg -uu -o "((?:\w+\W+){0,3})$pattern((?:\W+\w+){0,3})"
    end' >~/.config/fish/functions/search.fish


    # Add killport function to Fish
    echo 'function killport
    # Declare variables local to the whole function
    set -l ports
    set -l selected
    set -l pid
    set -l port
    set -l pname

    # Use lsof in parseable mode for robust output
    set ports (
        sudo lsof -nP -iTCP -sTCP:LISTEN -Fp -Fc -Fn \
        | awk '\''
            /^p/ { pid = substr($0,2) }
            /^c/ { cmd = substr($0,2) }
            /^n/ {
                name = substr($0,2)
                split(name, a, ":")
                port = a[length(a)]
                if (port != "" && pid != "" && cmd != "") {
                    key = port "|" pid
                    if (!seen[key]++) {
                        printf "%s\t%s\t%s\n", port, cmd, pid
                    }
                }
            }
        '\''
    )

    if test (count $ports) -eq 0
        echo "No listening ports found"
        return 1
    end

    if type -q fzf
        # Display columns nicely in fzf, keep tab for parsing
        set selected (printf "%s\n" $ports | column -t -s (printf '\''\t'\'') | fzf --prompt="Kill port: ")
        if test -z "$selected"
            echo "No selection made."
            return 1
        end
    else
        # Fallback: numbered menu
        echo -e "(install fzf for interactive menu) \nSelect a port to kill:"
        for i in (seq (count $ports))
            set -l line (string replace -a "\t" " | " $ports[$i])
            echo "$i) $line"
        end
        echo -n "Enter number: "
        read choice
        if string match -qr '\''^[0-9]+$'\'' -- $choice
            and test $choice -ge 1 -a $choice -le (count $ports)
            set selected $ports[$choice]
        else
            echo "Invalid selection"
            return 1
        end
    end

    # Extract fields from selected line
    set port (echo $selected | awk '\''{print $1}'\'')
    set pname (echo $selected | awk '\''{print $2}'\'')
    set pid (echo $selected | awk '\''{
        count = 0
        for (i = 1; i <= NF; i++) {
            if ($i ~ /^[0-9]+$/) {
                count++
                if (count == 2) {
                    print $i
                    exit
                }
            }
        }
    }'\'')

    if test -z "$pid"
        echo "Could not determine PID. Aborting."
        return 1
    end
    sudo kill -9 $pid
    if test $status -eq 0
        echo "💀 Killed $pname (PID $pid) on port $port"
    else
        echo "Failed to kill $pname (PID $pid) on port $port."
    end
end
' > ~/.config/fish/functions/killport.fish

   


    print_success "Fish shell installed with plugins"
}

# Install Nushell
install_nushell() {
    print_header "Installing Nushell"
    print_msg "$YELLOW" "Nushell is a data-oriented shell that works with structured data"


    # Install Starship prompt
    OS=$(detect_os)
    if [[ "$OS" == "android" ]]; then
        pkg i -y nushell
    else 
        if ! command_exists npm; then
            print_msg "$YELLOW" "Node.js required for Nushell installation. Installing Node.js first..."
            install_node
        fi
        npm i -g nushell
    fi

    mkdir -p ~/.config/nushell
    touch ~/.config/nushell/config.nu
    echo '$env.config.show_banner = false' >>~/.config/nushell/config.nu
    echo '$env.EDITOR = "nvim"' >>~/.config/nushell/config.nu
    
    print_success "Nushell installed"
}

# Install Neovim
install_nvim() {
    print_header "Installing Neovim"
    print_msg "$YELLOW" "Neovim is a highly extensible text editor with NvChad configuration"

    OS=$(detect_os)
    case "$OS" in
    ubuntu | debian)
        if command_exists add-apt-repository; then
            sudo add-apt-repository -y ppa:neovim-ppa/stable
        fi
        sudo apt update
        sudo apt install -y neovim
        ;;
    fedora)
        sudo dnf install -y neovim
        ;;
    arch)
        sudo pacman -Sy --noconfirm neovim
        ;;
    alpine)
        sudo apk add neovim
        ;;
    darwin)
        brew install neovim
        ;;
    android)
        pkg install -y neovim
        ;;
    esac

    # Install NvChad configuration
    print_msg "$YELLOW" "Setting up NvChad configuration for Neovim"
    mkdir -p ~/.config
    [ -d ~/.config/nvim ] && mv ~/.config/nvim{,.bak}
    rm -rf ~/.config/nvim
    git clone https://github.com/NvChad/starter ~/.config/nvim 
    # Launch Neovim in background to initialize NvChad
    nvim --headless "+Lazy! sync" +qa >/dev/null 2>&1 &

    print_success "Neovim installed with NvChad configuration"
}

# Install Helix editor
install_helix() {
    print_header "Installing Helix Editor"
    print_msg "$YELLOW" "Helix is a modern terminal-based text editor written in Rust"

    OS=$(detect_os)
    case "$OS" in
    ubuntu | debian)
        if command_exists add-apt-repository; then
            sudo add-apt-repository -y ppa:maveonair/helix-editor
        fi
        sudo apt update
        sudo apt install -y helix
        ;;
    fedora)
        sudo dnf install -y helix
        ;;
    arch)
        sudo pacman -Sy --noconfirm helix
        ;;
    alpine)
        sudo apk add helix
        ;;
    darwin)
        brew install helix
        ;;
    android)
        pkg install -y helix
        ;;
    esac


    print_success "Helix editor installed"
}

# Install Node.js with Volta
install_node() {
    print_header "Installing Node.js with Volta"
    print_msg "$YELLOW" "Volta is a JavaScript tool manager that makes it easy to manage Node.js versions"

    OS=$(detect_os)
    if [[ "$OS" == "android" ]]; then
        pkg install -y nodejs
    else 

        bash -c "$(curl -fsSL https://get.volta.sh)"

        # Source bashrc to make volta available
        source ~/.bashrc

        ~/.volta/bin/volta install node
        # print_success "Node.js installed with Volta"

        fish -c "fish_add_path ~/.volta/bin"

    fi

    # Remove node_modules from termux if
    if [ -d $PREFIX"/files/usr/lib/node_modules/" ]; then
        rm -rf $PREFIX"/files/usr/lib/node_modules/"
    fi

    npm i -g pnpm yarn git0 vite turbo --force || true
}

# Install Bun
install_bun() {
    print_header "Installing Bun"
    print_msg "$YELLOW" "Bun is a fast JavaScript runtime, bundler, transpiler and package manager"

    bash -c "$(curl -fsSL https://bun.sh/install)"

    print_success "Bun installed"
}


# Install VSCode in Web UI
install_code() {
    print_header "VSCode in Web UI"
    print_msg "$YELLOW" "VSCode is a modern IDE with terminal & extensions"
    bash -c "$(curl -fsSL https://code-server.dev/install.sh | sh)"
    print_success "VSCode installed"
}

# Install Pacstall
install_pacstall() {
    print_header "Installing Pacstall"
    print_msg "$YELLOW" "Pacstall is a package manager for Ubuntu/Debian - like AUR for Arch"

    OS=$(detect_os)
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        echo "yes" | sudo bash -c "$(curl -fsSL https://pacstall.dev/q/install || wget -q https://pacstall.dev/q/install -O -)"
        print_success "Pacstall installed"
    else
        print_error "Pacstall is only available for Ubuntu/Debian"
    fi
}

# Install Docker
install_docker() {
    print_header "Installing Docker with rootless mode"
    print_msg "$YELLOW" "Docker is a platform for developing, shipping, and running applications in containers"

    curl -fsSL https://test.docker.com -o test-docker.sh
    sh test-docker.sh

    # Install uidmap for rootless mode
    OS=$(detect_os)
    case "$OS" in
    ubuntu | debian)
        sudo apt-get install -y uidmap
        ;;
    fedora)
        sudo dnf install -y uidmap
        ;;
    arch)
        sudo pacman -S --noconfirm uidmap
        ;;
    alpine)
        sudo apk add uidmap
        ;;
    esac
    curl -fsSL https://get.docker.com/rootless | sh

    # Setup rootless Docker
    dockerd-rootless-setuptool.sh install

    # Add Docker to PATH in shell configs
    echo 'export PATH=/usr/bin:$PATH' >>~/.bashrc
    if [ -f "$HOME/.config/fish/config.fish" ]; then
        echo 'set -x PATH /usr/bin $PATH' >>~/.config/fish/config.fish
    fi

    rm -f test-docker.sh

    print_success "Docker installed with rootless mode"
}

# Install Starship prompt
install_starship() {
    print_header "Installing Starship Prompt"
    print_msg "$YELLOW" "Starship is a minimal, blazing-fast, and infinitely customizable prompt for any shell"

    # Install Starship prompt
    OS=$(detect_os)
    if [[ "$OS" == "android" ]]; then
        pkg i -y starship
    else 
        sudo sh -c "$(curl -fsSL https://starship.rs/install.sh)" -- -y
    fi

        
    # Set starship symbol
    echo '
[character]
success_symbol = "ƒ "
error_symbol  = "ƒ "
vimcmd_symbol = "ƒ "
' >  "$HOME/.config/starship.toml"

    # Configure for bash
    if ! grep -q "starship init bash" ~/.bashrc; then
        echo 'eval "$(starship init bash)"' >>~/.bashrc
    fi

    # Configure for fish
    if [ -f "$HOME/.config/fish/config.fish" ]; then
        if ! grep -q "starship init fish" ~/.config/fish/config.fish; then
            echo "starship init fish | source" >>~/.config/fish/config.fish
        fi
    fi

    # Configure for nushell
    mkdir -p ~/.config/nushell
    echo 'mkdir ($nu.data-dir | path join "vendor/autoload"); starship init nu | save -f ($nu.data-dir | path join "vendor/autoload/starship.nu")' >>~/.config/nushell/config.nu

    print_success "Starship prompt installed and configured for bash, fish, and nushell"
}

# Install system info script for shell greeting
install_systeminfo() {
    print_header "Installing System Info Greeting"
    print_msg "$YELLOW" "Setting up a system information display on shell login"


    echo 'set -U fish_greeting ""' >>~/.config/fish/config.fish

    # Add to bash if not already there
    if ! grep -q "npx about-system@latest" ~/.bashrc; then
        echo "npx about-system@latest" >>~/.bashrc
    fi

    # Add to fish if config exists and line not already present
    if [ -f "$HOME/.config/fish/config.fish" ]; then
        if ! grep -q "npx about-system@latest" ~/.config/fish/config.fish; then
            echo 'set -U fish_greeting ""' >>~/.config/fish/config.fish
            echo "npx about-system@latest" >>~/.config/fish/config.fish
        fi
    fi
    # Add to nushell if config exists
    if [ -f "$HOME/.config/nushell/config.nu" ]; then
        if ! grep -q "npx about-system@latest" ~/.config/nushell/config.nu; then
            echo '$env.config.show_banner = false' >>~/.config/nushell/config.nu
            echo "npx about-system@latest" >>~/.config/nushell/config.nu
        fi
    fi

    # Clear default greeting
    touch ~/.hushlogin
    sudo rm -f /etc/motd
    sudo rm -rf /etc/update-motd.d

    print_success "System info greeting installed"
}

# Enable sudo without password
enable_sudo_without_password() {
    print_header "Enable Sudo Without Password"
    print_msg "$YELLOW" "This will allow your user to run sudo commands without entering a password"

    CURRENT_USER=$(whoami)
    echo "${CURRENT_USER} ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/${CURRENT_USER}
    sudo chmod 0440 /etc/sudoers.d/${CURRENT_USER}

    print_success "Sudo without password enabled for ${CURRENT_USER}"
}

# Show menu and get user selection
show_menu() {
    echo "Select dev tools to install (comma-separated numbers or 'all'):"
    echo "  1) Install Everything"
    echo "  2) Fish Shell - Modern shell with auto-suggestions"
    echo "  3) Neovim - Vim-based editor with NvChad configuration"
    echo "  4) Helix - Modern terminal-based editor written in Rust"
    echo "  5) Node.js - JavaScript runtime via Volta version manager"
    echo "  6) Bun - Fast JavaScript runtime and package manager"
    echo "  7) Pacstall - Package manager for Debian/Ubuntu (like AUR)"
    echo "  8) Docker - Container platform with rootless mode"
    echo "  9) Starship Prompt - Cross-shell customizable prompt"
    echo "  10) System Info Greeting - System stats on login"
    echo "  11) Nushell - Data-oriented shell with structured data handling"
    echo "  12) VSCode - Modern IDE with terminal & extensions"
    echo ""

    read -p "Enter your choice(s): " CHOICE < /dev/tty
}

# Parse comma-separated selection
parse_selection() {
    local selection="$1"

    # Convert to lowercase and remove spaces
    selection=$(echo "$selection" | tr '[:upper:]' '[:lower:]' | tr -d ' ')

    # Initialize empty array for components
    COMPONENTS=()

    # If "all" or "1", select everything
    if [[ "$selection" == "" || "$selection" == "all" || "$selection" == "1" ]]; then
        COMPONENTS=(fish nushell nvim helix node bun pacstall docker starship systeminfo code)
    else
        # Split by commas and process each number
        IFS=',' read -ra NUMS <<<"$selection"
        for num in "${NUMS[@]}"; do
            case "$num" in
            2) COMPONENTS+=("fish") ;;
            3) COMPONENTS+=("nvim") ;;
            4) COMPONENTS+=("helix") ;;
            5) COMPONENTS+=("node") ;;
            6) COMPONENTS+=("bun") ;;
            7) COMPONENTS+=("pacstall") ;;
            8) COMPONENTS+=("docker") ;;
            9) COMPONENTS+=("starship") ;;
            10) COMPONENTS+=("systeminfo") ;;
            11) COMPONENTS+=("nushell") ;;
            12) COMPONENTS+=("code") ;;
            *) echo "Invalid selection: $num" ;;
            esac
        done
    fi
}

# Parse command line arguments for non-interactive mode
parse_args() {
    local args="$1"

    # Convert to lowercase and remove spaces
    args=$(echo "$args" | tr '[:upper:]' '[:lower:]' | tr -d ' ')

    # Initialize empty array for components
    COMPONENTS=()

    # If "all", select everything
    if [[ "$args" == "all" ]]; then
        COMPONENTS=(fish nushell nvim helix node bun pacstall docker starship systeminfo)
    else
        # Split by commas and process each component
        IFS=',' read -ra COMPS <<<"$args"
        for comp in "${COMPS[@]}"; do
            # Validate components
            case "$comp" in
            fish | nushell | nvim | helix | node | bun | pacstall | docker | starship | systeminfo | ssh | sudo | code)
                COMPONENTS+=("$comp")
                ;;
            *)
                echo "Invalid component: $comp"
                echo "Available components: fish, nushell, nvim, helix, node, bun, pacstall, docker, starship, systeminfo, ssh, sudo"
                exit 1
                ;;
            esac
        done
    fi
}

# Install selected components
install_components() {
    # Always install base dependencies
    install_base_deps

    # Install selected components
    for component in "${COMPONENTS[@]}"; do
        case "$component" in
        fish) install_fish ;;
        nushell) install_nushell ;;
        nvim) install_nvim ;;
        helix) install_helix ;;
        node) install_node ;;
        bun) install_bun ;;
        pacstall) install_pacstall ;;
        docker) install_docker ;;
        starship) install_starship ;;
        systeminfo) install_systeminfo ;;
        code) install_code ;;
        sudo) enable_sudo_without_password ;;
        ssh) enable_ssh_with_password ;;
        esac
    done

    print_header "Installation Complete!"
    print_msg "$GREEN" "The following components were installed:"
    for component in "${COMPONENTS[@]}"; do
        echo "- $component"
    done

    # If fish is installed, open it
    if [ -x "$(command -v fish)" ]; then
        exec fish
    fi
}


# Enable SSH with password authentication
# enable_ssh_with_password() {
#     print_header "Enabling SSH with Password Authentication"
#     print_msg "$YELLOW" "This is useful for AWS EC2 instances where password authentication is disabled by default"

#     read -p "Enter root password: " ROOT_PASS
#     read -p "Enter user password: " USER_PASS
#     read -p "Enter username: " USER

#     echo "root:$ROOT_PASS" | sudo chpasswd
#     echo "$USER:$USER_PASS" | sudo chpasswd

#     sudo sed -re 's/^#?[[:space:]]*(PasswordAuthentication)[[:space:]]+no/\1 yes/' -i.bak /etc/ssh/sshd_config

#     if [ -d "/etc/ssh/sshd_config.d/" ]; then
#         for file in /etc/ssh/sshd_config.d/*; do
#             sudo sed -re 's/^#?[[:space:]]*(PasswordAuthentication)[[:space:]]+no/\1 yes/' -i.bak "$file"
#         done
#     fi

#     sudo service ssh restart 2>/dev/null || sudo service sshd restart

#     print_success "SSH password authentication enabled"
# }


# Main function
main() {
    # Check if running as root
    # if [ "$(id -u)" -eq 0 ]; then
    #     print_error "This script should not be run as root directly."
    #     print_msg "$YELLOW" "Instead, use: sudo bash $0"
    #     exit 1
    # fi

    # Non-interactive mode with command line arguments
    if [ -n "$1" ]; then
        parse_args "$1"
        install_components
        exit 0
    fi

    # Interactive mode
    while true; do
        show_menu
        if [[ "$CHOICE" == "quit" || "$CHOICE" == "q" ]]; then
            echo "Exiting."
            exit 0
        fi

        # Prompt for sudo password upfront
        sudo -v

        # Optionally, keep sudo alive for the duration of the script
        while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

        parse_selection "$CHOICE"

        if [ ${#COMPONENTS[@]} -eq 0 ]; then
            print_error "No valid components selected. Please try again."
            continue
        fi

        break
    done

    install_components
}

# Run main function with all arguments
main "$@"
