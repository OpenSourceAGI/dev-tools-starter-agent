---
name: about-system
description: Guide to about-system (packages/about-system-info), the cross-platform system-info CLI and library — install and run it, pick specific info blocks, JSON output, the settings file (colors, emojis, labels, display order), the cache, the shell-greeting installer, and the programmatic API. Use when working with about-system or troubleshooting it — blocks that print empty, a greeting that doesn't run on terminal start, stale or wrong values, `infoFunctions` import errors, or `--set` changes that seem ignored.
---

# Working With about-system

The CLI and library in `packages/about-system-info`, published to npm as **`about-system`** (the directory name is not the package name). It prints 30+ system metrics as one emoji line, on Linux, macOS, Windows, and Android/Termux. Full block list, settings keys, and cache TTLs live in [API.md](API.md); read it when you need an exact block name, setting path, or default.

## Setup

```bash
npx about-system              # run once, no install
npm install -g about-system   # then: about-system
about-system --install        # add it as a shell greeting
```

The package is **ESM-only** (`"type": "module"`) and ships four entry points: `.` (library), `./api` (raw info functions), `./cli`, `./types`.

## Picking the right call

| You want | Call |
| --- | --- |
| Everything, formatted | `about-system` |
| Only some blocks | `about-system cpu,ram_used,disk_used` — positional, comma-separated, no flag |
| Machine-readable output | `about-system --json` |
| One value in a script/dashboard | `import { getSystemInfo } from "about-system"` → `(await getSystemInfo()).cpu` |
| One block, cheaply, no full sweep | `import { infoFunctions } from "about-system/api"` → `infoFunctions.cpu({ cache: {} })` |
| Run on every terminal launch | `about-system --install` |
| Change a color/emoji/label | `about-system --set colors.user blue` |
| Force fresh values | `about-system --refresh` |

## Recipes

**Programmatic, whole snapshot** — `getSystemInfo()` is async, loads the on-disk cache itself, and returns a `SystemInfo` object:

```ts
import { getSystemInfo } from "about-system";
const info = await getSystemInfo();
console.log(info.cpu, info.ram_used);
```

**Individual blocks** — `infoFunctions` is a map keyed by block name (`cpu`, `ram_used`, `uptime`, `ports`, `containers`, …). Pass a context so repeated calls share a cache; blocks that shell out or hit the network return promises:

```ts
import { infoFunctions } from "about-system/api";
const context = { cache: {} };
const cpu = infoFunctions.cpu(context);
const uptime = infoFunctions.uptime();
```

**Customize the line** — `--set <path> <value>` writes into the settings JSON: `display.show_emojis false`, `colors.cpu orange`, `emojis.cpu "🚀 "`, `labels.ram_used "Memory"`, `display_order` (edit the file directly for nested arrays). `--settings-show` prints the current file, `--settings-reset` restores defaults, `--settings-init` writes a fresh one.

**Types** — `import type { SystemInfo, SystemInfoOptions, Platform, InfoContext } from "about-system/types"`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `infoFunctions is not exported` / undefined import | The root entry exports only `getSystemInfo`, `loadCache`, `saveCache` and types. `infoFunctions` lives in the `about-system/api` subpath — the README's root import is wrong. |
| `--cache-clear` does nothing / unknown flag | That flag in the README doesn't exist. The real one is `--refresh`. |
| Values are stale (IP, disk, uptime) | Cached by design, per-block TTL (IP 5 min, CPU/OS/device 24 h, top process 5 s). Run `--refresh`, or delete `systeminfo-cache.json` in the OS temp dir. |
| A block prints empty | The underlying tool isn't on that platform/PATH (`docker` for `containers`, `nvidia-smi`/`system_profiler` for `gpu`, `ss`/`netstat` for `ports`). Empty is the intended fallback, not a crash — drop the block from `display_order` if you don't want the gap. |
| Network blocks (`ip`, `city`, `isp`, `domain`) all blank | No outbound network, or the lookup timed out. They share one cached IP-info fetch; everything else still renders. |
| Greeting didn't appear after `--install` | The line is appended to the config of the shell that was detected (`~/.bashrc`, `~/.zshrc`, `~/.config/fish/config.fish`, `~/.config/nushell/config.nu`). Open a new shell, or if you use PowerShell add the printed line to `$PROFILE` yourself. |
| `--set` seems ignored | You set a key the renderer doesn't read (typo in the path) or the block isn't in `display_order`. Check with `--settings-show`; reset with `--settings-reset` if the file got malformed. |
| `ERR_REQUIRE_ESM` when importing | ESM-only package. Use `import`, or `await import("about-system")` from CJS. |
| Emoji render as boxes | Terminal font lacks the glyphs — `about-system --set display.show_emojis false` falls back to text labels. |
