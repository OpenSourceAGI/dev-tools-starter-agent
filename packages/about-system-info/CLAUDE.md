# CLAUDE.md — `about-system` (`packages/about-system-info`)

**npm name:** `about-system` · **skill:** [`skills/about-system`](../../skills/about-system/SKILL.md)
· **runner:** Vitest · **build:** Vite

Cross-platform CLI + library that prints CPU, memory, disk, uptime, public IP,
ISP and installed tools as one compact emoji line. Designed to be dropped into
`config.fish` / `.zshrc`, so it runs on **every terminal launch**.

## What that implies

- **Startup cost is the product.** Anything you add to the default path is paid
  on every shell open. Network lookups (public IP, ISP) go through the cache in
  `src/cache/`; keep them off the synchronous path.
- **Three OSes, really.** Windows, macOS and Linux each take a different branch
  in `src/info/`. A change that only reads right on Linux is a regression.
- There is a **desktop app** under `native/`, built by
  `.github/workflows/about-system-desktop.yml`, with the CLI compiled inside it
  so nothing needs installing first.

## Layout

`src/about-system-cli.ts` (bin) · `src/index.ts` (library) ·
`src/info/` (per-block collectors) · `src/cache/` · `src/bench/` ·
`src/system-info-api.ts` · `src/types/`

```bash
cd packages/about-system-info
bun run test
bun run build          # Vite — consumers get dist/, not src/
```
