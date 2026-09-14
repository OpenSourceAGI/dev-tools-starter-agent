# CLAUDE.md — `apps/vscode-cloud`

Per-user **VS Code (code-server)** instances on **Cloudflare Containers**.
Published (not private), deployed with Wrangler.

## How isolation works

Each user gets a fully isolated environment:

| Piece | Role |
| --- | --- |
| Cloudflare Access | SSO — decides *who* the request is |
| A **Durable Object** | Stores that user's password in SQLite; one DO per user |
| A Worker | Routes the request to that user's container |
| `Dockerfile` + `entrypoint.sh` | The code-server image itself |

**The routing and the DO identity are the security boundary.** A bug that maps
two users onto one container, or that lets a request reach a container without
passing Access, is not a routing bug — it is a full disclosure of someone's
editor, files and terminal. Changes to identity derivation, DO naming, or the
Access check need explicit tests for the cross-user case.

Never log the per-user password, and never return it on a path that isn't the
authenticated owner's.

## Local vs deployed

```bash
bun run dev
bun run local          # compose.local.yml — container locally
bun run local:build
bun run local:down
bun run local:clean
bun run type-check
bun run deploy         # wrangler deploy
```

`compose.yml` / `compose.local.yml` and `wrangler.jsonc` must agree about ports
and the entrypoint; a local run that works proves the image, not the routing.
