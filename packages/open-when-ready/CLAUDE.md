# CLAUDE.md — `open-ready` (`packages/open-when-ready`)

**npm name:** `open-ready` · **skill:** [`skills/open-ready`](../../skills/open-ready/SKILL.md)
· **runner:** Vitest · **build:** none — `open-when-ready.mjs` ships as-is

Wraps a dev server: watches its output, opens the browser when it reports
ready, and on an error runs an AI search for the message instead.

## The hard part is detection

Ready/error detection is pattern-matching against other tools' stdout, which
changes when they upgrade. So:

- **A missed "ready" is worse than a late one** — never open the browser
  speculatively on a timer if a pattern didn't match; that is how users get a
  blank tab.
- Keep the pass-through faithful: the wrapped process's stdout/stderr, exit
  code and signals must reach the user unchanged. A wrapper that swallows an
  exit code breaks every script that calls it.
- New framework patterns go in the existing pattern table, not in a new branch.

```bash
cd packages/open-when-ready && bun run test
```
