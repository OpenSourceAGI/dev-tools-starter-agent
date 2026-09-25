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
- **`printLogo` is idempotent by design.** Several entry points print the banner
  so no path is left unbranded; the guard in `utils.ts` is what stops it showing
  twice. Call it freely — do not "fix" it by deleting call sites.
- **A sub-path is a prefix match and then a path join**, so `normalizeSubPath`
  rejects `..` rather than resolving it. Keep that gate in front of anything that
  reaches `tar` or `fs`.
- **History is fetched last on purpose.** `--history` starts *after* extraction
  and is awaited at the very end, so it overlaps the install and the IDE launch.
  Moving the `await` earlier silently gives back the speed the feature exists to
  keep — `benchmark/` is what measures that.

## Layout

`src/cli.ts` · `src/args.ts` · `src/github-api.ts` · `src/download.ts` ·
`src/history.ts` · `src/install.ts` · `src/ide.ts` · `src/package-menu.ts` ·
`src/platform.ts` · `src/fm.js`

`cli.ts` runs `main()` at import, so anything worth unit-testing lives elsewhere
— that is why flag parsing is `args.ts` and not a function in `cli.ts`.

`docs/` is the git0.js.org site — a copy of `starter-templates/template-fumadocs`
(Next.js + Fumadocs) with the homepage in `docs/components/DocsHomepage` and the
pages in `docs/content/docs`. It is not a workspace: `bun run docs` /
`bun run docs:build` install and run it on their own.

`benchmark/` is not collected by `bun test` (the runner file is `.bench.ts`) and
talks to github.com. Its pure reporting helpers are tested; the runner is not.

```bash
cd packages/git0-repo-downloader
bun run test
bun run build
bun run bench          # network, opt-in, never in CI
bun run docs:build     # the docs site in docs/
```
