---
name: native-app-wrapper
description: Guide to native-app-wrapper (packages/native-app-wrapper), the Tauri scaffold that packages a website or a bundled CLI as a native desktop and mobile app from one JSON profile — remote vs local mode, the generated tauri.conf.json/Rust constants/remote capability, the sidecar bridge for shipping a CLI as a GUI, placeholder icon generation, and `init` scaffolding. Use when wrapping something as a native app or troubleshooting one — a build that fails on a missing sidecar binary or icon, a deep-link OAuth login that never returns, `sidecar_output` refusing to run, target-triple naming, or store submission of a webview wrapper.
---

# Working With native-app-wrapper

The scaffold in `packages/native-app-wrapper` (marked `private`, so run it from a checkout). It renders a [Tauri 2](https://v2.tauri.app) app whose entire identity comes from one profile JSON, and packages one of two things:

- **`"mode": "remote"`** — the window loads a live website. The wrapper adds what a browser tab can't: an OS-registered app icon and installer, a deep-link handoff so OAuth can happen in the system browser, and a fullscreen toggle.
- **`"mode": "local"`** — the window loads a bundled `dist/`, and a CLI compiled to a single executable ships beside it as a Tauri sidecar. The app then needs no Node/Python/runtime on the user's machine. `packages/about-system-info/native` is the worked example.

## Setup

```bash
cd packages/native-app-wrapper
node bin/cli.js init <target-dir> --profile-file <your-profile.json>
cd <target-dir> && npm install && npm run dev
```

`init` copies the sources, gives the copy your profile as its only identity, regenerates the Tauri config and Rust constants, renames the crate, drops mobile npm scripts and irrelevant docs when the profile doesn't use them, and draws a placeholder icon set. **Nothing links back to the wrapper afterward** — the copy is a standalone app meant to be committed next to the thing it wraps.

Prerequisites: Rust 1.77.2+, Node 18+, and the host's Tauri prerequisites (MSVC build tools on Windows, Xcode CLT on macOS, `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev` on Debian/Ubuntu).

## The profile is the only file you edit

`scripts/configure.mjs` writes all five places an app identity appears, so they can't drift:

| Generated | From |
| --- | --- |
| `src-tauri/tauri.conf.json` | the whole profile |
| `src-tauri/src/generated_config.rs` | `deepLinkScheme`, `url`, `sidecar` |
| `src-tauri/capabilities/remote.json` | `trustedOrigins` (deleted when empty) |
| `src-tauri/icons/` | `placeholderIcon` colors, or `iconSource` via `npm run icons` |
| `src-tauri/binaries/<name>-<triple>` | `sidecar.build` |

Never hand-edit those — re-running `configure` overwrites them. Assert in CI that re-running configure leaves `git diff --exit-code` clean.

`scripts/profile.mjs` rejects contradictions rather than half-working: a local profile with a `url`, a remote profile with a `sidecar`, a non-HTTPS `url`, a `sidecar.build` missing its `{out}` placeholder.

## Commands

| Goal | Command (from the app directory) |
| --- | --- |
| Scaffold a new app | `node bin/cli.js init <dir> --profile-file <path>` |
| Regenerate config after a profile edit | `node bin/cli.js configure` (also runs as `predev`/`prebuild:desktop`) |
| Placeholder icons, no artwork needed | `node bin/cli.js icons` |
| Real icons from artwork | `npm run icons` (needs the Tauri CLI + Rust) |
| Compile the sidecar | `npm run build:sidecar` |
| Dev window | `npm run dev` |
| Installers for this OS | `npm run build:desktop` → `src-tauri/target/release/bundle/` |
| Android / iOS project | `npm run android:init` · `npm run ios:init` (host tooling required) |

Tauri does not cross-compile: each OS's installer must be built on that OS. A three-runner CI matrix with `tauri-apps/tauri-action` is the normal answer — `.github/workflows/about-system-desktop.yml` is a complete instance.

## Recipes

**Ship a CLI as a desktop app.** Set `"mode": "local"` and a `sidecar` block: `{ "name": "<binary>", "args": ["--json"], "build": "<compile command using {out}>", "buildCwd": ".." }`. Replace `dist/index.html` with your UI and call `window.__TAURI__.core.invoke("sidecar_output")` — it returns the CLI's stdout as a string. For a Node/TypeScript CLI, `bun build --compile src/cli.ts --outfile {out}` is the whole build command.

**Wire up OAuth for a wrapped site.** Set `deepLinkScheme` and `trustedOrigins`. The site needs three routes: a login page that detects `window.__TAURI__` and opens the system browser via `plugin:opener|open_url`, a `/auth/native-complete` that mints a one-time token and redirects to `<scheme>://auth-callback?token=…`, and a `/auth/native-callback` that spends it. See `docs/OAUTH.md`.

**Point at a local dev server.** Temporarily set the profile's `url` to `http://localhost:3000` (the only non-HTTPS value the validator allows) and re-run `configure`. Don't commit it.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `binary not found` at bundle time, after the whole Rust build | No sidecar for this target triple. Tauri appends the **Rust** triple, not `process.platform` — run `npm run build:sidecar`, and check `rustc -vV \| grep host` matches the filename in `src-tauri/binaries/`. |
| macOS universal build can't find the sidecar | Tauri doesn't `lipo` sidecars. Build **both** `-x86_64-apple-darwin` and `-aarch64-apple-darwin` before `--target universal-apple-darwin`. |
| `sidecar_output` returns "only callable from the app's bundled frontend" | The window is showing a real website. The command is deliberately restricted to `tauri://localhost` (`http://tauri.localhost` on Windows) so a wrapped site can never reach a process spawner, even if someone grants it in `capabilities/remote.json`. |
| `Command sidecar_output not allowed by ACL` from the bundled frontend | The app grew a `src-tauri/permissions/` directory. Tauri skips the ACL for app-defined commands from local content only while the app has no manifest of its own; once it has one, every app command needs an explicit entry in `capabilities/default.json`. |
| `sidecar_output` returns "this app bundles no sidecar" | The profile has no `sidecar` block, so `SIDECAR_NAME` generated as `""`. Add one and re-run `configure`. |
| Build fails on a missing icon | `bundle.icon` lists five files that must exist. `node bin/cli.js icons` draws all of them with no dependencies and no artwork. |
| Deep link opens a second copy of the app instead of returning to the running one | Expected on Windows/Linux — that's what `tauri-plugin-single-instance` is for. If it still happens, the scheme isn't registered: check `plugins.deep-link.desktop.schemes` and that the app was launched from an installed build, not `cargo run`. |
| Login works in the browser but the app window stays logged out | The two have separate cookie jars. The token must be spent by a page loaded at the **site's own origin** in the app window, not verified from Rust — that's the whole design in `docs/OAUTH.md`. |
| Google login fails inside the window | Google blocks OAuth in embedded webviews. There is no flag for this; the system-browser handoff is the fix. |
| App panics on launch with `Error deserializing 'plugins.updater'... missing field pubkey` | A `plugins.updater` block exists without a `pubkey`. `"active": false` is not an off switch — the plugin panics during initialization. Remove the block (and the profile's `updater`), or configure it properly per `docs/BUILDING.md`. |
| Window is fullscreen with no way out | `window.fullscreen: true` hides the title bar. F11 or Ctrl+Shift+F toggles it (desktop only). |
| App works in dev, blank when installed | Remote mode needs network at runtime, same as a browser tab. For an offline app use local mode. |
| iOS review rejects the app | Guideline 4.2 "Minimum Functionality" targets webview wrappers specifically. Add real native chrome before submitting — see `docs/APP_STORES.md`. |
| No mobile build for a sidecar app | Android and iOS can't spawn a bundled executable. A local-mode app with a `sidecar` is desktop-only by construction. |
