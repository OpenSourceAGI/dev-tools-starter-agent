# CLAUDE.md — `native-app-wrapper`

**Private — not published.** **skill:** [`skills/native-app-wrapper`](../../../skills/native-app-wrapper/SKILL.md)
· **runner:** Vitest · **build:** none

A **Tauri** scaffold that packages a website, or a bundled CLI, as a native
desktop app for macOS, Windows and Linux. Profiles, a sidecar bridge for the
bundled binary, icon generation, per-OS builds.

## Things that bite

- **It is a scaffold you copy, not a dependency you install** — private here,
  and explicitly excluded from the workspace globs in the sibling GRAB-URL repo
  that also carries a copy.
- **Rust toolchain required.** Its CI is its own workflow
  (`.github/workflows/native-app-wrapper-ci.yml`); the normal test matrix does
  not build it.
- The **sidecar bridge** is the subtle part: a bundled CLI is invoked as a Tauri
  sidecar with platform-suffixed binary names. Get a name wrong and it fails
  only on one OS, at runtime, after packaging.
- Icons are generated per platform. Don't hand-place them.

```bash
cd packages/native-app-wrapper && bun run test
```
