# CLAUDE.md — `setup-git-repo`

**skills:** [`skills/git-badges`](../../skills/git-badges/SKILL.md) and
[`skills/github-actions-setup`](../../skills/github-actions-setup/SKILL.md)
— two skills cover this one package.
· **runner:** Vitest · **build:** none

One command to set up a GitHub repo: Turborepo config, CI workflows, and the
README badge block.

## Rules

- **The badge catalog lives in `packages/template-git-repo`**, not here. This
  package consumes it. Changing a badge definition means editing there — where
  it also changes every package README header via
  `scripts/sync-package-readmes.mjs`.
- **It writes into someone else's repo.** Never overwrite an existing workflow
  or README section without confirming. Additive by default.
- The workflows it scaffolds need secrets the user has to set up
  (`NPM_TOKEN`/OIDC, `CODECOV_TOKEN`). Scaffolding a workflow that fails
  silently on a missing secret is worse than not scaffolding it — keep the
  guidance the skill documents.

## Layout

`src/git.mjs` · `src/template.mjs` · `src/resolve-template.mjs` ·
`bin/setup-git-repo.js`

```bash
cd packages/setup-git-repo && bun run test
```
