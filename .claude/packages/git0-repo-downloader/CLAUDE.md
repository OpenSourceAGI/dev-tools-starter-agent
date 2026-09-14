# CLAUDE.md — `git0` (`packages/git0-repo-downloader`)

**npm name:** `git0` · **skill:** [`skills/git0`](../../../skills/git0/SKILL.md)
· **runner:** **`bun test`** (not Vitest) · **build:** `bun build`

CLI to search GitHub, download source and releases, auto-install dependencies
and launch an IDE. Four bins: `git0`, `g`, `gg`, `fm`.

## Things that bite

- **This is the one package on `bun test`.** `bun run test` here runs Bun's
  runner — Vitest APIs and config do not apply. Don't port it as a drive-by.
- **Four bins, one of which is unbuilt.** `git0`/`g`/`gg` point at `dist/cli.js`;
  `fm` points at `src/fm.js` directly. Editing `fm.js` needs no rebuild;
  editing anything else does.
- **GitHub API rate limits** are the dominant failure mode — unauthenticated
  requests run out fast. Handle 403-with-rate-limit-headers distinctly from a
  real 403, and never retry into the limit.
- It **writes to the user's filesystem and runs installers**. Keep the
  confirmation prompts; never auto-execute a downloaded repo's scripts without
  one.

## Layout

`src/cli.ts` · `src/github-api.ts` · `src/download.ts` · `src/install.ts` ·
`src/ide.ts` · `src/package-menu.ts` · `src/platform.ts` · `src/fm.js`

```bash
cd packages/git0-repo-downloader
bun run test
bun run build
```
