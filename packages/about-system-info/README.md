<p align="center">
  <img src="https://i.imgur.com/1kwKBTR.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/about-system-info"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/about-system-info"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/about-system"><img src="https://img.shields.io/npm/dm/about-system.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/about-system"><img src="https://img.shields.io/npm/v/about-system.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/about-system"><img src="https://img.shields.io/npm/dt/about-system.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/about-system"><img src="https://img.shields.io/npm/types/about-system" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=about-system"><img src="https://packagephobia.com/badge?p=about-system" alt="Install size" /></a>
    <a href="https://app.codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/flags"><img src="https://img.shields.io/codecov/c/github/OpenSourceAGI/dev-tools-starter-agent?flag=about-system-info&label=about-system-info%20coverage&logo=codecov&logoColor=white" alt="Coverage" /></a>
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill about-system` ([what it covers](../../skills/about-system/SKILL.md))
<!-- skills:install:end -->

# About System Info

A TypeScript/Node.js library to display comprehensive system information with customizable output.

- 📊 **Comprehensive**: 30+ system metrics including CPU, GPU, network, containers, and more
- 🌍 **Cross-platform**: Works on Linux, macOS, and Windows, and Android
- 🎨 **Customizable**: Configure colors, emojis, and display order
- 🔌 **Two Modes**: Use as CLI tool or import as API
- 🚀 **Cached**: Intelligent caching system for quick repeated access
- 💾 **TypeScript**: Full type definitions included

## Installation

```bash
npx about-system
```

```bash
npm install -g about-system
about-system
```

```bash
bun x about-system
```

### Desktop app

The same 30+ metrics as a window you can leave open, built natively for every desktop OS. The CLI
is compiled into the app as a [Tauri sidecar](https://v2.tauri.app/develop/sidecar/), so an
installer runs on a machine with no Node, no Bun, and no package manager on it.

#### Download an installer

Every tagged release attaches a native build for each desktop system
([Releases](https://github.com/OpenSourceAGI/dev-tools-starter-agent/releases?q=about-system-desktop)):

| System | Architecture | Installer |
| --- | --- | --- |
| Windows 10 1803+ / 11 | x86_64 | `About System_<version>_x64_en-US.msi`, `About System_<version>_x64-setup.exe` |
| macOS 10.15+ | Apple Silicon + Intel (universal) | `About System_<version>_universal.dmg` |
| Linux (Debian/Ubuntu) | x86_64, aarch64 | `About System_<version>_amd64.deb`, `About System_<version>_arm64.deb` |
| Linux (Fedora/RHEL) | x86_64, aarch64 | `About System-<version>-1.x86_64.rpm`, `About System-<version>-1.aarch64.rpm` |
| Linux (any distro) | x86_64, aarch64 | `About System_<version>_amd64.AppImage`, `About System_<version>_aarch64.AppImage` |

Installers are unsigned by default, so macOS shows an "unidentified developer" warning and Windows
shows a SmartScreen prompt on first launch.

#### Build it yourself

Needs [Rust](https://rustup.rs) 1.77.2+, Node 18+, [Bun](https://bun.sh), and your platform's
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/):

```bash
bun install                # the CLI's dependencies — the sidecar is compiled from its source
cd native
npm install
npm run build:desktop      # regenerates config, compiles the sidecar, builds the installers
```

Artifacts land in `native/src-tauri/target/release/bundle/`. **Each installer must be built on its
own OS and architecture** — neither Tauri nor the `bun build --compile` sidecar cross-compiles,
which is why `.github/workflows/about-system-desktop.yml` runs the same two commands on a Windows,
a macOS, an x86_64 Linux, and an aarch64 Linux runner and attaches every artifact to one release.

The app is scaffolded from [`packages/native-app-wrapper`](../native-app-wrapper/) — a Tauri shell
that turns one JSON profile into a native app — and owns its whole identity (name, bundle id,
version, window, sidecar command) in `native/profiles/about-system.json`. See
[`native/README.md`](native/README.md) for the development loop, the universal-macOS build, and the
known limitations (no Windows-on-ARM build, since Bun has no `windows-arm64` compile target; and no
mobile build, since Android and iOS don't let an app spawn a bundled executable).

## Examples

![systeminfo_greeting](https://i.imgur.com/BX6YsaK.png)

`👤 deck 🏠 steamdeck 📁 90% 💾 2/14GB 🔝 6% cursor ⏱️  1d 7h 18m 🌎 174.194.193.230 📍 San Jose 🔗 http://230.sub-174-194-193.myvzw.com 👮 Verizon Business ⚡ SteamOS 📈 AMD Custom APU 0405 💻 Jupiter 🔧 6.11.11-valve12-1-neptune-611-g517a46b477e1 🐚 fish 🚀 npm pip docker nvim bun 📦 docker-node`

`👤 u0_a365 🏠 localhost 📁 54% 💾 1/5GB 🔝 1% fish ⏱️ 4d 9h 19m 🌎 174.194.193.230 🌐 192.168.42.229 📍 San Jose 🔗 http://230.sub-174-194-193.myvzw.com 👮 Verizon Business ⚡ Android 13 📈 Kryo-4XX-Silver 💻 SM-G781U 🔧 4.19.113-27223811 🐚 nu 🚀 apt npm pip hx nvim`

## CLI Usage

### Basic Usage

```bash
# Show all system information
about-system

# Show specific fields
about-system cpu,ram_used,disk_used

# Output as JSON
about-system --json

# Get help
about-system --help
```

### Installation as Shell Greeting

```bash
# Install as shell greeting (runs on terminal startup)
about-system --install
```

### Configuration

```bash
# View current settings
about-system --settings-show

# Reset settings to defaults
about-system --settings-reset

# Set specific configuration values
about-system --set display.show_emojis false
about-system --set colors.user blue
about-system --set emojis.cpu "🚀 "
about-system --set labels.cpu "Processor"

# Clear cache
about-system --refresh
```

## API Usage

You can import and use individual system info functions:

```typescript
import { infoFunctions, getSystemInfo } from "about-system";

// Create a context with cache
const cache = {};
const context = { cache };

// Use individual functions
const cpu = infoFunctions.cpu(context);
const ram = infoFunctions.ram_used(context);
const uptime = infoFunctions.uptime();

// Build custom monitoring tools
async function getBasicInfo() {
  return {
    user: infoFunctions.user(),
    hostname: infoFunctions.hostname(),
    uptime: infoFunctions.uptime(),
  };
}
```

### Available Info Blocks

| Block           | Description                | Example Output                 |
| --------------- | -------------------------- | ------------------------------ |
| `user`        | Current username           | `👤 username`                |
| `hostname`    | System hostname            | `🏠 hostname`                |
| `ip`          | Public IP address          | `🌎 192.168.1.1`             |
| `iplocal`     | Local IP addresses         | `🌐 192.168.1.100`           |
| `city`        | Location based on IP       | `📍 San Francisco`           |
| `domain`      | Reverse DNS hostname       | `🔗 http://example.com`      |
| `isp`         | Internet service provider  | `👮 Verizon Business`        |
| `os`          | Operating system           | `⚡ Ubuntu 22.04`            |
| `cpu`         | CPU information            | `📈 Intel Core i7-8700K`     |
| `gpu`         | Graphics card              | `🎮 NVIDIA GeForce RTX 3080` |
| `disk_used`   | Disk usage percentage      | `📁 75%`                     |
| `disk_size`   | Disk size per real disk    | `💽 256/512GB`               |
| `ram_used`    | Memory usage               | `💾 8/16GB`                  |
| `top_process` | Highest CPU process        | `🔝 15% chrome`              |
| `uptime`      | System uptime              | `⏱️ 2d 5h 30m`             |
| `device`      | Device model               | `💻 MacBook Pro`             |
| `kernel`      | Kernel version             | `🔧 5.15.0-56-generic`       |
| `shell`       | Current shell              | `🐚 fish`                    |
| `pacman`      | Available package managers | `🚀 apt npm pip docker`      |
| `ports`       | Open network ports         | `🔌 80http 443https 22ssh`   |
| `containers`  | Running Docker containers  | `📦 nginx redis postgres`    |

### Configuration

The script uses a JSON settings file located at:

- **Linux/macOS**: `~/.config/systeminfo-settings.json`
- **Windows**: `%APPDATA%\systeminfo-settings.json`

#### Settings Commands

```bash
# Show current settings
about-system --settings-show

# Reset to defaults
about-system --settings-reset

# Set individual values
about-system --set display.show_emojis false
about-system --set colors.user blue
about-system --set emojis.cpu "🚀 "
about-system --set labels.hostname "Computer"
about-system --set cache.enabled true

# Clear cache
about-system --cache-clear
```

#### Example Settings

```json
{
  "version": "1.0.0",
  "display_order": [
    ["user", "hostname", "os", "device", "kernel", "cpu", "gpu"],
    [
      "disk_used",
      "ram_used",
      "top_process",
      "uptime",
      "temperature",
      "battery"
    ],
    ["ip", "iplocal", "city", "domain", "isp"],
    ["shell", "pacman", "services_running", "containers"]
  ],
  "colors": {
    "user": "red",
    "hostname": "orange",
    "disk_used": "purple",
    "ram_used": "yellow",
    "uptime": "cyan",
    "ip": "green",
    "os": "blue",
    "cpu": "orange",
    "shell": "orange"
  },
  "emojis": {
    "user": "👤 ",
    "hostname": "🏠 ",
    "cpu": "📈 ",
    "gpu": "🎮 ",
    "disk_used": "📁 ",
    "ram_used": "💾 ",
    "ip": "🌎 ",
    "shell": "🐚 "
  },
  "labels": {
    "user": "User",
    "hostname": "Host",
    "cpu": "CPU",
    "gpu": "GPU",
    "disk_used": "Disk",
    "ram_used": "RAM",
    "ip": "IP",
    "shell": "Shell"
  },
  "display": {
    "show_emojis": true,
    "show_backgrounds": true,
    "single_line": true,
    "line_wrap_length": 100
  },
  "network": {
    "show_offline_message": true
  },
  "advanced": {
    "debug": false
  }
}
```

### Customization Options

#### Colors

Available color options for each info block:

- `red`, `orange`, `yellow`, `green`, `blue`, `cyan`, `purple`, `magenta`, `gray`, `lightblue`
- Use `multicolor` for ports to get a rainbow effect

All colors use darker, more saturated shades so they stay readable on both light and dark terminal backgrounds.

```bash
about-system --set colors.user blue
about-system --set colors.hostname green
```

#### Backgrounds

By default, every info block is rendered as a colored background badge with a contrasting text color, so it stays legible no matter what background color your terminal uses. Disable it to fall back to plain colored text:

```bash
about-system --set display.show_backgrounds false
```

#### Emojis

Customize the emoji displayed for each info block. Emojis can be toggled on/off globally with `display.show_emojis` or individually customized:

```bash
# Toggle emojis on/off
about-system --set display.show_emojis false

# Customize individual emojis
about-system --set emojis.cpu "🚀 "
about-system --set emojis.hostname "🖥️ "
about-system --set emojis.battery "🔋 "
```

#### Labels

Customize the text labels for each info block:

```bash
about-system --set labels.cpu "Processor"
about-system --set labels.hostname "Computer"
about-system --set labels.ram_used "Memory"
```

#### Line Wrapping

By default, output is printed as one continuous line and lets the terminal soft-wrap it on resize. To instead hard-wrap at a fixed width (filling each line completely, breaking mid-block if needed), disable `single_line`:

```bash
about-system --set display.single_line false
about-system --set display.line_wrap_length 100
```

### Platform-Specific Features

#### Windows

- Detects Windows-specific package managers (choco, winget, scoop)
- Uses `wmic` for system information
- Supports PowerShell and Command Prompt integration

#### Linux

- Detects Linux package managers (apt, yum, pacman, etc.)
- Reads from `/proc` and `/sys` filesystems
- Supports various shells (bash, zsh, fish, nushell)

#### macOS

- Detects macOS-specific tools
- Uses `system_profiler` for hardware info
- Supports zsh and bash integration

### Cache System

The script implements intelligent caching to improve performance:

- **IP Info**: 5 minutes (network requests are expensive)
- **System Info**: 24 hours (rarely changes)
- **Process Info**: 5 seconds (changes frequently)
- **Disk/RAM**: 1 minute (moderate change frequency)

### Shell Integration

The `--install` flag automatically configures the script as a shell greeting:

- **Bash**: Adds to `~/.bashrc`
- **Zsh**: Adds to `~/.zshrc`
- **Fish**: Adds to `~/.config/fish/config.fish`
- **NuShell**: Adds to `~/.config/nushell/config.nu`
- **PowerShell**: Provides instructions for profile setup

## Documentation

### JSDoc Comments

All API functions include comprehensive JSDoc documentation:

```typescript
import { infoFunctions } from "about-system/api";

// Hover over any function in your IDE to see:
// - Function description
// - Parameter details
// - Return type information
// - Usage examples
// - Platform-specific notes

infoFunctions.cpu(context); // IDE shows full documentation
```

**Features:**

- ✅ Every function documented with JSDoc
- ✅ Parameter and return type descriptions
- ✅ Real-world usage examples
- ✅ Platform compatibility notes
- ✅ IDE autocomplete support

### TypeScript Support

Full TypeScript definitions with:

- Complete `SystemInfo` interface
- All 30+ field types documented
- Platform-specific type unions
- Exported helper types

```typescript
import type {
  SystemInfo, // Main info object
  Platform, // Platform type
  SystemInfoOptions, // Config options
  InfoContext, // Context for functions
} from "about-system/types";
```

## Links

- [Repository](https://github.com/OpenSourceAGI/StarterDOCS/tree/master/packages/about-system-info)
- [Issues](https://github.com/OpenSourceAGI/StarterDOCS/issues)

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
