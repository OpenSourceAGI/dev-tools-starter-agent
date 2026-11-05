# Building

Every command below is run from the app directory — either this package (which builds
`profiles/example.json` as a smoke test) or a copy `node bin/cli.js init` scaffolded elsewhere.

## Prerequisites

Tauri compiles a Rust binary against the host's native webview, so each OS needs its own toolchain
before anything here works. From [Tauri's prerequisites guide](https://v2.tauri.app/start/prerequisites/):

| Host | Needs |
|---|---|
| **Windows** | [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++), WebView2 (preinstalled on Windows 10 1803+/11), and Rust. |
| **macOS** | Xcode Command Line Tools (`xcode-select --install`) and Rust. |
| **Linux** | `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev build-essential curl wget file libssl-dev` (Debian/Ubuntu names; see the guide for Fedora/Arch), and Rust. |

Plus [Rust](https://rustup.rs) 1.77.2 or newer and Node 18+ everywhere.

## Local dev

```bash
npm install
npm run dev
```

`predev` regenerates the Tauri config from the profile first, so a profile edit takes effect
without a separate step. In remote mode the window opens on the profile's `url` — there's no local
frontend to serve, so a dev server for the wrapped site is unrelated (to test against one, point
the profile's `url` at `http://localhost:3000` temporarily, re-run `npm run configure`, and don't
commit that change). In local mode the window opens on `dist/`.

## Release build

```bash
npm run build:desktop
```

Output lands under `src-tauri/target/release/bundle/`:

| Platform | Artifacts |
|---|---|
| Windows | `msi/*.msi` (WiX), `nsis/*-setup.exe` |
| macOS | `dmg/*.dmg`, `macos/*.app` |
| Linux | `deb/*.deb`, `rpm/*.rpm`, `appimage/*.AppImage` |

**Each installer must be built on its own OS.** Tauri does not cross-compile: a Windows `.msi`
needs a Windows host, a `.dmg` needs macOS. That's what makes a CI matrix (below) the normal way to
produce a full set.

macOS builds default to the host's architecture; add `--target universal-apple-darwin` (and
`rustup target add x86_64-apple-darwin aarch64-apple-darwin`) for a universal binary that runs on
both Intel and Apple Silicon.

If the profile bundles a sidecar, build it **before** `build:desktop` — the bundle step fails
outright when no binary exists for the target triple. See `LOCAL_APPS.md`.

## Android / iOS

See `MOBILE.md` — needs host tooling this package can't install for you. Sidecars are desktop-only,
so a local-mode app with a `sidecar` has no mobile story; a remote-mode app does.

## CI

Building for three OSes means three runners. The shape that works:

```yaml
strategy:
  matrix:
    include:
      - { os: windows-latest, args: "" }
      - { os: macos-latest,   args: "--target universal-apple-darwin" }
      - { os: ubuntu-22.04,   args: "" }
runs-on: ${{ matrix.os }}
steps:
  # ... checkout, node, rust, and the Linux apt packages from the table above ...
  - uses: tauri-apps/tauri-action@v0
    with:
      projectPath: <path to the app directory>
      args: ${{ matrix.args }}
```

[`tauri-apps/tauri-action`](https://github.com/tauri-apps/tauri-action) handles the build and can
attach the artifacts to a GitHub Release. `packages/about-system-info`'s
`.github/workflows/about-system-desktop.yml` is a complete working instance of this, including the
sidecar build step that has to run first.

Worth asserting in CI: that `src-tauri/tauri.conf.json` and `src-tauri/src/generated_config.rs`
still match what `configure` produces from the profile. Re-running configure and checking
`git diff --exit-code` catches hand-edits that have drifted from the profile they're generated
from.

## Code signing

Unsigned installers work, but users get an "unidentified developer" (macOS) or SmartScreen
(Windows) warning on first launch. `tauri-action` picks up signing automatically once the relevant
secrets exist:

- **macOS**: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, and for
  notarization `APPLE_ID` + `APPLE_PASSWORD` + `APPLE_TEAM_ID` (or `APPLE_API_KEY`,
  `APPLE_API_ISSUER`, `APPLE_API_KEY_PATH`).
- **Windows**: an Authenticode certificate, configured through `bundle.windows.certificateThumbprint`
  or a signing command.

See `APP_STORES.md` for where those credentials come from.

## Auto-update (off by default)

`tauri-plugin-updater` is in `Cargo.toml`, but a profile with no `updater` block never registers
it and `tauri.conf.json` gets no `plugins.updater` section. That is not the same as switching it
off with `"active": false` — the plugin reads `pubkey` during *initialization* and panics if it
isn't there, so an inert-looking config block is a crash on launch, not a disabled feature.

To turn updates on:

1. `npx @tauri-apps/cli@2 signer generate` — keep the private key, note the public key.
2. Add to the profile:
   ```json
   "updater": {
     "pubkey": "<the public key>",
     "endpoints": ["https://github.com/<owner>/<repo>/releases/latest/download/latest.json"]
   }
   ```
   and re-run `configure`. (Both fields are required; the profile validator rejects one without
   the other.)
3. Store the private key as a `TAURI_SIGNING_PRIVATE_KEY` secret, and its password as
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if you set one.
4. Set `tauri-action`'s `includeUpdaterJson: true` so releases carry the `latest.json` manifest
   the updater polls.

## Cutting a release

Bump `version` in the profile, run `npm run configure`, commit, then tag. The version in
`tauri.conf.json` is what ends up in the installer's metadata and in every store listing, so the
profile is the single place it's set.
