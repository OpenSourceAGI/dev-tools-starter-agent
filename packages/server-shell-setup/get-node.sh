#!/bin/sh

set -eu

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

die() {
    printf '\n%b\n' "${RED}${BOLD}✖ Error:${NC} $1" >&2
    exit "${2:-1}"
}

command -v curl >/dev/null 2>&1 ||
    die "curl is required but was not found."

VOLTA_HOME="${VOLTA_HOME:-$HOME/.volta}"
BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"

export VOLTA_HOME
export BUN_INSTALL
export PATH="$VOLTA_HOME/bin:$BUN_INSTALL/bin:$PATH"

clear

printf '%b\n' "${CYAN}${BOLD}⚙ Setting up JavaScript tooling...${NC}"

# Reinstall Volta if its installation exists.
if [ -d "$VOLTA_HOME" ]; then
    printf '%b\n' "${YELLOW}↻ Existing Volta found — removing it...${NC}"
    rm -rf "$VOLTA_HOME"
fi

# Install a clean copy of Volta.
printf '%b\n' "${GREEN}↓ Installing Volta...${NC}"

if ! curl --proto '=https' --tlsv1.2 -sSf https://get.volta.sh | bash; then
    die "Volta installation failed."
fi

export PATH="$VOLTA_HOME/bin:$BUN_INSTALL/bin:$PATH"

command -v volta >/dev/null 2>&1 ||
    die "Volta installed but could not be found at $VOLTA_HOME/bin/volta."

# Install the current Node release and Yarn through Volta.
printf '%b\n' "${GREEN}↓ Installing Node.js and Yarn with Volta...${NC}"

if ! volta install node yarn >/dev/null 2>&1; then
    die "Node.js or Yarn installation failed."
fi

# Reinstall Bun if its standard installation directory already exists.
if [ -d "$BUN_INSTALL" ]; then
    printf '%b\n' "${YELLOW}↻ Existing Bun found — removing it...${NC}"
    rm -rf "$BUN_INSTALL"
fi

printf '%b\n' "${GREEN}↓ Installing Bun...${NC}"

if ! curl --proto '=https' --tlsv1.2 -fsSL https://bun.com/install | bash >/dev/null 2>&1; then
    die "Bun installation failed."
fi

export PATH="$VOLTA_HOME/bin:$BUN_INSTALL/bin:$PATH"

command -v bun >/dev/null 2>&1 ||
    die "Bun installed but could not be found at $BUN_INSTALL/bin/bun."

# Clear installation output and show one clean status line.
clear

printf '%b\n' \
    "${GREEN}${BOLD}✓ Toolchain ready${NC}  " \
    "${CYAN}⚡ Volta ${BOLD}$(volta --version)${NC}  " \
    "${GREEN}⬢ Node ${BOLD}$(node --version)${NC}  " \
    "${YELLOW}🧶 Yarn ${BOLD}$(yarn --version)${NC}  " \
    "${RED}🥟 Bun ${BOLD}$(bun --version)${NC}"
