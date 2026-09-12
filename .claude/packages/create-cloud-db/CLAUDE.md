# CLAUDE.md — `create-cloud-db`

**skill:** [`skills/create-cloud-db`](../../../skills/create-cloud-db/SKILL.md)
· **runner:** Vitest · **build:** none — `create-cloud-db.js` ships as-is

A CLI that creates a Turso database and writes the `TURSO_*` variables into a
`.env` file.

## Rules

- **It edits the user's `.env`.** Never clobber existing keys without saying so,
  never reorder or reformat the rest of the file, and never print a token to
  stdout where it lands in a terminal scrollback or CI log.
- Turso API tokens are credentials. They belong in the `.env` it writes and
  nowhere else — not in fixtures, not in test snapshots.
- **No build step**: the `.js` at the package root is the published artifact.

```bash
cd packages/create-cloud-db && bun run test
```
