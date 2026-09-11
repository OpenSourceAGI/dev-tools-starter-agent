# CLAUDE.md — `cloudflare-to-claude-fix`

**skill:** [`skills/cloudflare-to-claude-fix`](../../skills/cloudflare-to-claude-fix/SKILL.md)
· **runner:** Vitest · **build:** none — `src/index.js` ships as-is

A Cloudflare Workers **Queue consumer** that fires a Claude Code routine
whenever a Workers build fails. Subscribes to Cloudflare build events through a
Workers Queue plus a dead-letter queue, then triggers the fix routine over its
`/fire` API.

## Things that bite

- **No build step.** `src/index.js` is the artifact. A syntax error ships.
- **Queue semantics, not request semantics.** Messages retry, and a message that
  keeps throwing lands in the DLQ. An unhandled throw is not a 500 — it is a
  retry storm. Ack deliberately.
- **Secrets are Worker secrets**, never committed. The routine trigger token in
  particular.
- Requires a Workers **Paid** plan (queues) and Claude Pro. A local run that
  "works" without them proves nothing.

```bash
cd packages/cloudflare-to-claude-fix
bun run test
wrangler deploy        # via `bun deploy`
```
