# CLAUDE.md — `api2ai` (`packages/api2ai-mcp-generator`)

**npm name:** `api2ai` · **skill:** [`skills/api2ai`](../../../skills/api2ai/SKILL.md)
· **runner:** Vitest · **build:** `next build`

Generates production-ready MCP servers from any OpenAPI specification, on the
[mcp-use](https://mcp-use.com) framework. HTTP, SSE and Streamable HTTP
transports; a built-in inspector UI at `/inspector`; Zod schema validation;
bearer / API-key auth; Docker, PM2 and Kubernetes deploy configs.

## Rules

- **The generated server is output, not source.** Fix the generator, then
  regenerate — never patch a generated server and call it done.
- **Tool filtering and the auth layers are security surface.** The skill
  documents a three-layer security model; do not collapse a layer to simplify a
  call path.
- An OpenAPI spec is untrusted input. It arrives from a URL, can be malformed,
  and can name operations that collide. Validate before generating.
- This package builds with `next build` — it carries a UI (the inspector), so a
  change here can break the build without breaking a test.

```bash
cd packages/api2ai-mcp-generator && bun run test
```
