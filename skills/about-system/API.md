# about-system API Reference

Exact CLI flags, block names, settings keys, and cache TTLs.

## CLI

| Argument | Description |
| --- | --- |
| *(none)* | Print every block in `display_order`. |
| `cpu,ram_used,…` | Positional comma-separated block list — print only these. |
| `--json` | Emit the info object as JSON instead of the emoji line. |
| `--install` | Append the greeting to the detected shell's config file. |
| `--refresh` | Clear the cache before collecting. |
| `--set <path> <value>` | Write a settings value, e.g. `--set colors.user blue`. |
| `--settings-show` | Print the current settings JSON. |
| `--settings-reset` | Restore default settings. |
| `--settings-init` | Write a fresh settings file. |
| `--help` | Usage. |

## Entry points

| Import | Exports |
| --- | --- |
| `about-system` | `getSystemInfo(options?)`, `loadCache()`, `saveCache(cache)` |
| `about-system/api` | `infoFunctions`, `getSystemInfo`, `loadCache`, `saveCache` |
| `about-system/cli` | CLI entry (`about-system` bin) |
| `about-system/types` | `SystemInfo`, `SystemInfoOptions`, `Platform`, `InfoContext`, `GetSystemInfoFunction`, `DisplaySystemInfoFunction`, `PlatformAvailability` |

## Info blocks

`infoFunctions` keys, also usable as CLI positional filters and `display_order` entries:

| Block | Output |
| --- | --- |
| `user`, `hostname`, `device`, `kernel`, `os` | `👤 user`, `🏠 host`, `💻 MacBook Pro`, `🔧 5.15.0`, `⚡ Ubuntu 22.04` |
| `cpu`, `gpu`, `bench`, `cpu_bench_info`, `gpu_bench`, `gpu_bench_info` | Model strings plus Geekbench lookups from the bundled `bench/*.json` |
| `disk_used`, `ram_used`, `memory_available`, `swap_used`, `mount_points` | `📁 75%`, `💾 8/16GB`, and related storage/memory readouts |
| `top_process`, `load_average`, `uptime`, `users_logged_in` | `🔝 15% chrome`, load, `⏱️ 2d 5h 30m` |
| `ip`, `iplocal`, `city`, `domain`, `isp`, `network_interfaces` | Public/local IP, geo-IP city, reverse DNS, ISP |
| `shell`, `pacman`, `ports`, `containers`, `services_running` | Shell, package managers, open ports, Docker containers, systemd services |
| `temperature`, `battery`, `screen_resolution` | Sensors and display |

Note the two internal renames: `os` maps to `os_info`, `pacman` maps to `packages`.

## Settings file

- Linux/macOS: `~/.config/systeminfo-settings.json`
- Windows: `%APPDATA%\systeminfo-settings.json`

| Key | Shape | Notes |
| --- | --- | --- |
| `display_order` | `string[][]` | Array of lines, each an array of block names. Controls order and line breaks. |
| `colors` | `{ [block]: color }` | `red`, `orange`, `yellow`, `green`, `blue`, `cyan`, `purple`, `magenta`, `gray`, `lightblue`; `multicolor` for `ports`. |
| `emojis` | `{ [block]: string }` | Include the trailing space, e.g. `"🚀 "`. |
| `labels` | `{ [block]: string }` | Text label used when emojis are off. |
| `display` | `{ show_emojis, single_line, line_wrap_length }` | |
| `network` | `{ show_offline_message }` | |
| `advanced` | `{ debug }` | |

## Cache

File: `systeminfo-cache.json` in the OS temp dir (`os.tmpdir()`).

| Block group | TTL |
| --- | --- |
| `top_process` | 5 s |
| `ram_used` | 10 s |
| `temperature` | 30 s |
| `disk_used`, `battery` | 1 min |
| `ip`, `ports`, `containers`, `services_running`, `network_interfaces` | 5 min |
| `pacman`, `mount_points` | 10 min |
| `kernel` | 1 h |
| `cpu`, `gpu`, `os`, `device` | 24 h |
