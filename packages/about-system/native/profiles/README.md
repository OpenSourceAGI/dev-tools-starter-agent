# Profiles

A profile is the one JSON file you edit to say what app this wrapper is. Everything else —
`src-tauri/tauri.conf.json`, the Rust constants, the remote capability's origin scope, the icon
set — is generated from it by `node bin/cli.js configure`, so the profile is the only place an app
identity is written down.

Copy `example.json`, fill it in, and either drop it in this folder or hand it straight to
`node bin/cli.js init <dir> --profile-file <path>` to scaffold a standalone copy of the wrapper
around it.

## Fields

| Field | Meaning |
|---|---|
| `appName` / `productName` | Display name used in window titles, installers, and store listings. `productName` defaults to `appName`. |
| `identifier` | Reverse-DNS app id (e.g. `com.example.app`). Used as the Tauri `identifier`, the Android `applicationId`, and the iOS bundle id unless overridden under `android`/`ios`. Changing this after a store release changes the app's identity — don't. |
| `version` | Semantic version written into `tauri.conf.json`. Bump this to trigger a new store/release version. |
| `mode` | `"remote"` (default) loads `url` in the main window; `"local"` bundles `dist/` as the app's frontend. See below. |
| `url` | **Remote mode only, required.** The site the wrapper loads. Must be HTTPS (`http://localhost` is allowed for local dev). Setting it in local mode is an error rather than a silently ignored field. |
| `sidecar` | **Local mode only.** `{ "name", "args", "build", "buildCwd" }` — a CLI bundled next to the app binary and exposed to the bundled frontend through the `sidecar_output` command. `args` is the fixed argument list it's always run with (default: none); `build` is the command that compiles it, with `{out}` standing in for the path Tauri expects. See `../docs/LOCAL_APPS.md`. |
| `deepLinkScheme` | Optional custom URL scheme (e.g. `exampleapp` → `exampleapp://...`) registered with the OS so the site's OAuth login page can hand a session back to the app window. Omit it and the whole deep-link path compiles out of the app's behavior. See `../docs/OAUTH.md`. |
| `trustedOrigins` | Origins allowed to use the scoped Tauri IPC bridge — keep this to exactly the domains you control. `capabilities/remote.json` is generated from this list; leave it empty (or omit it) and the wrapper loads no remote capability at all, which is what a local-mode app wants. |
| `iconSource` | Path (relative to the profile file) to a single square PNG, at least 1024x1024, used to generate every platform's icon set via `npm run icons`. |
| `placeholderIcon` | `{ "background": ["#top", "#bottom"], "accent": "#fg" }` — colors for the generated stand-in icon set (`node bin/cli.js icons`), used until you have real artwork. |
| `copyright` / `publisher` / `category` / `shortDescription` / `longDescription` | Metadata surfaced in installers and store listings. `category` should match the target store's taxonomy (e.g. Apple's `public.app-category.*`, Microsoft Store, Google Play categories — see `../docs/APP_STORES.md`). |
| `window` | Initial window size/behavior. `fullscreen: true` opens the app in true OS fullscreen (no window chrome); users can leave it with the in-app fullscreen toggle (F11 / Ctrl+Shift+F). |
| `updater` | Optional `{ "pubkey", "endpoints": [...] }` — turns on `tauri-plugin-updater`. Leave it out and the plugin isn't registered at all; see `../docs/BUILDING.md` for why an "off" updater config is a crash rather than a disabled feature. |
| `macos` | `{ "minimumSystemVersion": "10.15" }`. |
| `android` / `ios` | Mobile-specific overrides (package name, minimum OS version). Omit both if the app is desktop-only. |

## Remote vs. local mode

**Remote** is for packaging a website: the window loads the live site, `dist/` stays an unused
placeholder, and the app is useless offline — exactly like a browser tab pointed at the same URL.
The wrapper's added value is OS-level: an icon, an installer, a deep-link login handoff.

**Local** is for packaging something that isn't a website: the window loads `dist/index.html`, the
app ships everything it needs, and it works with no network. Pair it with a `sidecar` when the data
comes from a CLI you already have — the bundled binary runs on demand and the frontend renders its
output.

The two modes are mutually exclusive by validation, not by convention: a local profile with a `url`
and a remote profile with a `sidecar` are both rejected by `scripts/profile.mjs` rather than
half-working.

## Regenerating

```bash
node bin/cli.js configure          # tauri.conf.json + generated_config.rs + capabilities/remote.json
node bin/cli.js icons              # placeholder icon set from placeholderIcon's colors
npm run icons                      # real icon set from iconSource, via the Tauri CLI
```

A directory with exactly one profile (what `init` produces) needs no `--profile` flag. This package
itself keeps only `example.json`, so its own scripts fall back to that.
