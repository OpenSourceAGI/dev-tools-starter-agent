# Packaging a CLI as a native app

Remote mode wraps a website. Local mode wraps something that has no website at all — a
command-line tool — and turns it into an installable GUI app that needs no runtime on the user's
machine. `packages/about-system-info/native` is the worked example: the `about-system` CLI, a
Node program, shipped as a `.msi` / `.dmg` / `.AppImage` that a user who has never installed Node
can double-click.

## The three pieces

```
  ┌──────────────────────────┐
  │ dist/index.html          │   the app's entire UI, bundled into the binary
  │   invoke("sidecar_output")│
  └───────────┬──────────────┘
              │ Tauri IPC
  ┌───────────▼──────────────┐
  │ src-tauri/src/lib.rs     │   sidecar_output: fixed args, bundled-content-only
  │   shell().sidecar(NAME)  │
  └───────────┬──────────────┘
              │ spawn + capture stdout
  ┌───────────▼──────────────┐
  │ src-tauri/binaries/      │   the CLI, compiled to one self-contained executable
  │   <name>-<target triple> │   per platform, bundled into the installer
  └──────────────────────────┘
```

1. **The frontend** replaces `dist/index.html`. It's plain bundled content, so it can use
   `window.__TAURI__.core.invoke` directly (the profile sets `withGlobalTauri`) with no build step
   and no npm dependency.
2. **The bridge** is `sidecar_output`, defined in `src-tauri/src/lib.rs` and available to any
   local-mode app for free. It runs the bundled binary with the profile's fixed `sidecar.args` and
   returns its stdout as a string.
3. **The binary** is whatever compiles your CLI into one file. For a Node/TypeScript CLI,
   `bun build --compile` does it; Go and Rust CLIs are already single files; Python needs
   PyInstaller or similar. It must land at `src-tauri/binaries/<name>-<rust target triple>` —
   Tauri appends the triple itself so one installer per platform picks up the right build.
   `scripts/build-sidecar.mjs` runs your build command and puts the result there under the right
   name; `npm run build:sidecar` calls it, and the `predev`/`prebuild:desktop` hooks call it too,
   so the binary is never a step you have to remember.

## Configuring it

```jsonc
{
  "mode": "local",
  // and no "url" — local mode loads dist/
  "sidecar": {
    "name": "about-system",                    // the binary's base name
    "args": ["--json"],                        // the fixed argv it is always run with
    "build": "bun build --compile src/cli.ts --outfile {out}",
    "buildCwd": ".."                           // where to run that command, relative to the app dir
  }
}
```

`{out}` is the only substitution `build-sidecar.mjs` makes — it expands to the full path, target
triple and `.exe` suffix included, that Tauri will look for. The build command owns everything
else, so the wrapper never has to know what language the CLI is written in. A `build` without
`{out}` is rejected by profile validation rather than quietly producing a binary in the wrong
place.

`configure` turns that into `bundle.externalBin: ["binaries/about-system"]` plus the Rust
constants. `tauri build` then **fails** if no binary exists for the platform being built, which is
the behavior you want: a silently sidecar-less installer would ship a GUI that can't load anything.

## Why the arguments are fixed

`sidecar_output` takes no parameters. The frontend asks for "the output this app is built around";
it can't choose the argument list. A command that forwarded arbitrary argv to a bundled executable
would be a process spawner reachable from page content, and in a remote-mode app that page is a
website.

It also refuses to run unless the calling window is showing bundled content (`tauri://localhost`,
or `http://tauri.localhost` on Windows). Tauri does already reject app-defined commands from a
remote origin unless a capability explicitly grants them, so that check is a second line of
defense — but it's the line that survives someone adding the command to `capabilities/remote.json`
without thinking it through.

If your app genuinely needs several different invocations, add them as separate commands with
separate fixed argument lists rather than opening up the one.

**One gotcha if you add your own ACL manifest.** Tauri skips the ACL for app-defined commands
called from local content *only while the app has no `src-tauri/permissions/` directory of its
own*. Create one — for any reason — and every app command, `sidecar_output` included, starts
needing an explicit entry in `capabilities/default.json`, and the app fails with "not allowed by
ACL" until it gets one.

## Getting the target triple right

Tauri resolves `binaries/<name>` to `binaries/<name>-<triple>` using the *Rust* target triple, not
Node's `process.platform`. Read it from the toolchain rather than mapping it by hand:

```bash
rustc -vV | sed -n 's/^host: //p'   # e.g. x86_64-unknown-linux-gnu, aarch64-apple-darwin
```

`scripts/build-sidecar.mjs` does exactly this: it reads the host triple from the toolchain,
compiles the CLI, names the output accordingly, and marks it executable.

macOS universal builds (`--target universal-apple-darwin`) need **both**
`<name>-x86_64-apple-darwin` and `<name>-aarch64-apple-darwin` present, since the sidecar isn't
lipo'd for you.

## Offline, updates, and size

A local-mode app has no network dependency at all, which is the main reason to choose it. The
tradeoffs:

- **Size.** A compiled Node CLI is 50–100 MB before the Tauri binary. Nothing about that is
  avoidable if you want a runtime-free install; a Go or Rust CLI is a fraction of it.
- **Updates.** There's no server to change, so shipping a fix means shipping a new installer.
  Tauri's updater (see `BUILDING.md`) is the answer if you want that to be automatic.
- **Permissions.** The CLI runs with the user's own privileges, exactly as it would in their
  terminal. If it reads system state, the app reads system state; if it needs elevation, the app
  needs elevation.
