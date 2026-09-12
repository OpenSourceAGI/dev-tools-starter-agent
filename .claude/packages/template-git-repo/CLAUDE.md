# CLAUDE.md — `template-git-repo`

**skills:** [`skills/template-git-repo`](../../../skills/template-git-repo/SKILL.md)
and [`skills/repo-badges`](../../../skills/repo-badges/SKILL.md)
· **runner:** Vitest · **build:** none — `src/index.js` is the entry

One-command repo setup: workflows, helper scripts, `turbo.json`, `codecov.yml`,
and the README badge block.

## This package has the widest blast radius in the repo

`src/badges.js` is the **single definition of what a badge is**, and it is used
twice:

1. By this package and `setup-git-repo`, to scaffold a new repo's README.
2. By `.github/scripts/sync-package-readmes.mjs`, to generate the header of **every
   `packages/*/README.md` in this monorepo**.

So a change here rewrites sixteen READMEs and `bun run readmes:check` fails in
CI until they are regenerated. After editing badges:

```bash
bun run readmes          # from the repo root
bun run readmes:check
```

The "omit a badge whose inputs are missing rather than render it broken" rule
also lives here — preserve it. A private package should end up with the two
badges that still mean something, not six broken ones.

## Not to be confused with

`starter-templates/template-git-repo/` — a scaffold directory with the same
name and a different job. See
[`../../architecture/templates.md`](../../architecture/templates.md).

## Layout

`src/index.js` · `src/badges.js` · `src/readme.js` · `src/apply.js` ·
`src/context.js`
