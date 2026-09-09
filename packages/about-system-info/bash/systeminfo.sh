#!/usr/bin/env bash

# =========================================================
#   System Info with Emojis - Bash Script Version
# =========================================================
#
#   wget -qO- tinyurl.com/25um7xjd | bash
#
#   Bash script to display key system information with emojis
#   The output and order are fully customizable: edit DISPLAY_ORDER
#   to control which info blocks are shown and in what order.
#   Supported blocks: user, hostname, Public IP, local IP, city, domain, isp, os,
#   cpu, disk_used, top_process, device, kernel, pacman.
#   Network info (ip, city, domain, isp) is fetched from ipinfo.io
#   only if needed.
#   Each info block uses standard Linux utilities and is only executed
#   if its keyword is present in DISPLAY_ORDER.
#   Output is a single, emoji-enhanced line for quick server status review.
#
#   If run with --install, sets up the script as a shell greeting and silences default login messages.
#
#   Dependencies:
#     - Standard Linux tools (whoami, hostname, ps, df, awk, grep, uname, etc.)
#     - wget (for ipinfo.io)
#     - hostname: sudo pacman -S inetutils;
#         sudo apt-get install hostname
#
#   Author: vtempest (2022-25) https://github.com/vtempest/Server-Shell-Setup/tree/master
#   Published: 2025-05-04
#   License: MIT
# */

# Set what to display and in what order (edit this line!)
DISPLAY_ORDER="user hostname disk_used ram_used top_process uptime \
  ip iplocal city domain isp os cpu gpu device kernel shell pacman ports containers"

# Fetch IP info only if needed
NEED_IPINFO=0
for key in $DISPLAY_ORDER; do
  [[ "$key" =~ ^(ip|isp|domain|city)$ ]] && NEED_IPINFO=1
done
INFO=$(wget -qO- https://ipinfo.io/json?token=da2d6cc4baa5d1 2>/dev/null) || {
  echo -e "\033[38;5;196m ❌ No internet connection"
}

for key in $DISPLAY_ORDER; do
  case $key in
  user)
    echo -ne "\e[38;5;196m👤 $(whoami) "
    ;;
  hostname)
    echo -ne "\e[38;5;208m🏠 $(hostname)"
    ;;
  top_process)
    export TOP_PROC=$(ps -eo pcpu,comm --sort=-%cpu --no-headers |
      head -1 | sed 's/\.[0-9]/%/' | awk '{$1=$1};1' | awk -F'/' '{print $NF}')
    echo -ne "\e[38;5;213m 🔝 $TOP_PROC"
    ;;
  disk_used)
    if df | grep -q "/storage/emulated"; then
      export DISK_USED=$(df | awk '$6=="/storage/emulated"{print $5}')
    else
      export DISK_USED=$(df | awk '$6=="/"{print $5}')
    fi

    [ -n "$DISK_USED" ] && echo -ne "\e[38;5;171m 📁 $DISK_USED"
    ;;
  ram_used)
    export RAM_USED=$(awk '/MemFree|MemTotal/ {a[$1]=$2/1024/1024} END {printf "%.0f/%.0fGB\n", a["MemFree:"], a["MemTotal:"]}' /proc/meminfo)
    [ -n "$RAM_USED" ] && echo -ne "\e[38;5;226m 💾 $RAM_USED"
    ;;
  uptime)
    UPTIME=$(
      uptime | awk -F'( |,|:)+' '{
            d=h=m=0;
            if ($7=="min")
                m=$6;
            else {
                if ($7~/^day/) { d=$6; h=$8; m=$9}
                else {h=$6;m=$7}
            }
            print d"d "h"h "m"m"
        }'
    )
    [ -n "$UPTIME" ] && echo -ne "\033[38;5;51m ⏱️  ${UPTIME}"
    ;;
  ip)
    IP=$(echo "$INFO" | grep -oP 'ip"\s*:\s*"\K[^"]+' 2>/dev/null)
    [ -n "$IP" ] && echo -ne "\033[38;5;46m 🌎 ${IP:-No IP}" || echo -ne "\033[38;5;250m 🌎 No Network"
    ;;
  iplocal)
    IPLOCAL=$(ifconfig 2>/dev/null | awk '/wlan0/{f=1} f && /inet /{print $2; exit}')
    if [ -z "$IPLOCAL" ]; then
      IPLOCAL=$(ip addr show 2>/dev/null | grep 'inet ' | awk '{print $2}' | tail -n +2 | cut -d/ -f1 | paste -sd' ' -)
    fi
    [ -n "$IPLOCAL" ] && echo -ne "\e[38;5;226m 🌐 ${IPLOCAL:-No IP}"
    ;;
  city)
    CITY=$(echo "$INFO" | grep -oP 'city"\s*:\s*"\K[^"]+' 2>/dev/null)
    [ -n "$CITY" ] && echo -ne "\033[38;5;46m 📍 ${CITY:-No City}"
    ;;
  domain)
    DOMAIN=$(echo "$INFO" | grep -oP 'hostname"\s*:\s*"\K[^"]+' 2>/dev/null)
    [ -n "$DOMAIN" ] && echo -ne "\033[38;5;250m 🔗 http://$DOMAIN"
    ;;
  isp)
    export ISP=$(echo $INFO | grep -oP 'org\": "\K[^"]+' | cut -f 1 -d ' ' --complement)
    echo -ne "\e[38;5;220m 👮 $ISP"
    ;;
  cpu)
    export CPU=$(lscpu | grep -oP 'Model name:\s*\K[^,]+' | head -n1)
    if [ -z "$CPU" ]; then
      export CPU=$(sed -n -e '/model name/p' -e '/Hardware/p' /proc/cpuinfo | cut -d':' -f2 | head -2 | awk '{$1=$1};1')
    fi

    [ -n "$CPU" ] && echo -ne "\e[38;5;208m 📈 $CPU"
    ;;
  gpu)
    if [ -z "$GPU" ]; then
      export GPU=$(lspci | grep -Ei 'VGA|3D controller|Display controller' | grep -Ei 'nvidia|geforce|rtx|gtx|quadro|tesla|amd|ati|radeon|navi|vega|rx|intel.*(arc|uhd|iris|hd.graphics)' | sed -n 's/.*\[\([^]]*\)\].*/\1/p' | tail -c +1 | paste -sd ',' | sed 's/,/, /g')
    fi
    [ -n "$GPU" ] && echo -ne "\e[38;5;226m 🎮 $GPU"
    ;;
  os)
    export OS=$([ -f /etc/os-release ] && grep -oP "^NAME=\"\K[^\"]+" /etc/os-release)
    export OS_VERSION=$(grep '^VERSION_ID=' /etc/os-release | cut -d'=' -f2 | tr -d '"')

    if command -v getprop >/dev/null 2>&1; then
      export OS="Android $(getprop ro.build.version.release)"
    fi

    [ -n "$OS" ] && echo -ne "\e[38;5;39m ⚡ $OS $OS_VERSION"
    ;;
  device)
    if command -v getprop >/dev/null 2>&1; then
      export DEVICE="$(getprop ro.product.model)"
    fi

    if test -f /sys/devices/virtual/dmi/id/product_name; then
      export DEVICE=$(cat /sys/devices/virtual/dmi/id/product_name)
    fi
    [ -n "$DEVICE" ] && echo -ne "\e[38;5;39m 💻 $DEVICE"
    ;;
  kernel)
    export KERNEL=$(uname -r)
    [ -n "$KERNEL" ] && echo -ne "\e[38;5;46m 🔧 $KERNEL"
    ;;
  shell)
    export SHELL=$(
      ps -p $PPID -o comm= | awk -F'/' '{print $NF}'
    )
    [ -n "$SHELL" ] && echo -ne "\e[38;5;208m 🐚 $SHELL"
    ;;
  pacman)
    echo -ne "\033[38;5;51m 🚀"
    # \ "pkg" "flatpak"  "yum" "snap" "pacman"\
    # \ "apk"  "brew" "yarn" "pnpm" "cargo" "gem" "go"
    for cmd in "apt" "npm" "pip" "docker" "hx" "nvim" "bun"; do
      if [ -x "$(command -v $cmd)" ]; then
        echo -ne " $cmd"
      fi
    done
    ;;
  ports)
    export PORTS=$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {split($9,a,":"); if(!seen[a[2] $1]++ && a[2]!="") printf "%s%s ", a[2], substr($1,1,4)}' | sed 's/ $//')
    [ -n "$PORTS" ] && {
      colors=("31" "32" "33" "34" "35" "36") # Red, Green, Yellow, Blue, Magenta, Cyan
      index=0
      output=" 🔌 "
      read -ra ports <<<"$PORTS"
      for port in "${ports[@]}"; do
        output+="\e[${colors[index % 6]}m${port}\e[0m "
        ((index++))
      done
      echo -ne "$output"
    }
    ;;
  containers)
    if [ -x "$(command -v docker)" ]; then
      CONTAINER_COUNT=$(docker ps -q 2>/dev/null | wc -l)
      if [ "$CONTAINER_COUNT" -gt 0 ]; then
        echo -ne " \033[32m📦\033[0m"
        docker ps --format '{{.Names}}\t{{.Ports}}' |
          awk -F'\t' '
                function in_array(val, arr,    i) {
                for (i in arr) if (arr[i] == val) return 1
                return 0
                }
                {
                split($2, ports, /, */)
                n = 0
                delete seen
                for (i in ports) {
                    if (match(ports[i], /->([0-9-]+)\//, arr)) {
                    p = arr[1]
                    } else if (match(ports[i], /^([0-9-]+)\//, arr)) {
                    p = arr[1]
                    } else {
                    continue
                    }
                    if (!in_array(p, seen)) {
                    seen[++n] = p
                    }
                }
                out = ""
                for (i=1; i<=n; i++) out = out " \033[33m" seen[i] "\033[0m"
                # Only print colon + ports if ports exist
                if (n > 0) {
                    printf " \033[32m%s:\033[0m%s", $1, out
                } else {
                    printf " \033[32m%s\033[0m", $1
                }
                }
                END { print "" }
                '
      fi
    fi
    ;;
  *) ;;
  esac
done

# Reset color
echo -e "\e[0m"

install_shell_greeting() {
  # Silence default login messages
  rm -f /etc/motd
  rm -rf /etc/update-motd.d
  touch ~/.hushlogin

  # Ensure target directory exists
  mkdir -p ~/.config

  # Copy this script (assumes it's named systeminfo.sh)
  cp "$(realpath "$0")" ~/.config/systeminfo.sh

  # Add to bash if not already there
  if ! grep -q "bash ~/.config/systeminfo.sh" ~/.bashrc; then
    echo "bash ~/.config/systeminfo.sh" >>~/.bashrc
  fi

  # Add to fish if config exists and line not already present
  if [ -f "$HOME/.config/fish/config.fish" ]; then
    if ! grep -q "bash ~/.config/systeminfo.sh" ~/.config/fish/config.fish; then
      echo 'set -U fish_greeting ""' >>~/.config/fish/config.fish
      echo "bash ~/.config/systeminfo.sh" >>~/.config/fish/config.fish
    fi
  fi
  # Add to nushell if config exists
  if [ -f "$HOME/.config/nushell/config.nu" ]; then
    if ! grep -q "bash ~/.config/systeminfo.sh" ~/.config/nushell/config.nu; then
      echo '$env.config.show_banner = false' >>~/.config/nushell/config.nu
      echo "bash ~/.config/systeminfo.sh" >>~/.config/nushell/config.nu
    fi
  fi
  echo "Shell greeting installed!"
}

# Main logic: check for --install argument
if [[ "$1" == "--install" ]]; then
  install_shell_greeting
  exit 0
fi
