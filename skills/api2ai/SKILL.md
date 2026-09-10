---
name: api2ai
description: Guide to api2ai (packages/api2ai-mcp-generator), which generates MCP servers from an OpenAPI spec using mcp-use — the CLI and programmatic generateMcpServer/extractTools API, tool filtering by tag, method, risk or operationId, the three-layer security model (risk classification, runtime policy, HTTP hardening), generated server endpoints and env vars, and connecting to Claude or ChatGPT. Use when working with api2ai or troubleshooting it — tools missing from the generated server, mutations blocked, approval prompts, 401s from the upstream API, host-allowlist or timeout errors, or the inspector exposing more than intended.
---

# Working With api2ai

Generates a production-ready MCP server from any OpenAPI spec, on top of [mcp-use](https://mcp-use.com). Exact CLI flags, env vars, and generated file layout live in [API.md](API.md).

**Where the code is**: `packages/api2ai-mcp-generator` in this repo holds the Next.js site/docs for the project — it has no `bin` entry and no `generate-mcp-use-server.js`. The generator itself is the published **`api2ai`** package, so `npx api2ai …` resolves from the registry, not from this folder. Don't go looking for the CLI source here.

## Setup

```bash
npx api2ai https://petstore3.swagger.io/api/v3/openapi.json ./petstore-mcp --name petstore-api
cd petstore-mcp && npm install && npm start
```

Then open `http://localhost:3000/inspector` to exercise the tools.

## The security model — read this before filing a bug

Three layers, and most "my tool is missing" reports are layer 1 or 2 working as designed:

1. **Generation-time risk classification.** Every operation is labeled and the label is baked into `src/tools-config.js`: `low` for `GET`/`HEAD`/`OPTIONS`, `medium` for any mutating method, `high` for anything matching admin/auth/billing/payments/tokens/secrets/user-management patterns. Only `low` is enabled by default. `--allow-mutations` promotes medium to enabled.
2. **Runtime policy.** `checkToolPolicy()` runs before every outbound call and reads env at call time — `ALLOW_RESTRICTED_TOOLS=true` unlocks medium/high, `REQUIRE_APPROVALS=false` drops the per-call approval gate. No regeneration needed.
3. **HTTP hardening.** Timeouts (`REQUEST_TIMEOUT_MS`, 30 s), a response cap (`MAX_RESPONSE_BYTES`, 10 MB), `redirect: 'error'`, a host allowlist (`ALLOWED_API_HOSTS`), and credential-header protection — tool arguments can never override `Authorization`, `Cookie`, or `X-API-Key`; env-configured auth wins.

## Picking the right filter

| You want | How |
| --- | --- |
| Read-only tools only | default behavior — don't pass `--allow-mutations` |
| Writes enabled | `--allow-mutations`, plus `--approve-writes` to skip the approval requirement |
| A subset by tag | `--include-tags public` / `--exclude-tags admin,internal` |
| Arbitrary predicates | programmatic `filterFn: (tool) => …` on `riskLevel`, `method`, or `pathTemplate` |
| To drop named operations | `excludeOperationIds: ["deleteUser", …]` |

```js
import { generateMcpServer, extractTools, loadOpenApiSpec } from "api2ai";

const result = await generateMcpServer(specUrl, "./out", {
  serverName: "my-api",
  allowMutations: false,
  includeTags: ["public"],
  filterFn: (tool) => tool.riskLevel === "low",
});
```

## Connecting a client

Claude Desktop: `{"mcpServers": {"my-api": {"url": "http://localhost:3000/mcp"}}}`. The generated server also speaks the OpenAI Apps SDK, and exposes `/sse` and `/health` alongside `/mcp` and `/inspector`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Expected tools are missing | They were classified `medium`/`high` and are disabled by default. Regenerate with `--allow-mutations`, or set `ALLOW_RESTRICTED_TOOLS=true` at runtime. |
| Every call asks for approval | `REQUIRE_APPROVALS` defaults to true for restricted tools. Set it to `false`, or generate with `--approve-writes`. |
| Tool count is far lower than the number of paths | Tag filters, `excludeOperationIds`, or a `filterFn` are trimming it — and operations without an `operationId` may not survive naming. Check `src/tools-config.js` for what was actually emitted. |
| `401`/`403` from the upstream API | Auth comes from env (`API_KEY` bearer, or `API_AUTH_HEADER` as `Name:value`), never from tool arguments — that's the credential-header protection. Set the env var. |
| "Host not allowed" | `ALLOWED_API_HOSTS` doesn't include the host you're calling; it defaults to the spec's host, so a `--base-url` override needs the allowlist updated too. |
| Requests time out / responses truncated | The 30 s timeout and 10 MB response cap. Raise `REQUEST_TIMEOUT_MS` / `MAX_RESPONSE_BYTES` deliberately. |
| Redirects fail instead of following | Intentional (`redirect: 'error'`) to block host pivots. Point `API_BASE_URL` at the final host. |
| Anyone can drive the tools | `/inspector` exposes every registered tool with no auth. Put it behind a reverse proxy or firewall in production, and set `ALLOWED_ORIGINS`. |
| Spec fails to load | `loadOpenApiSpec` takes a URL or a local JSON/YAML path; check it's OpenAPI (not raw Swagger 1.x) and that the URL isn't behind auth. |
| `npx api2ai` not found in this repo | Correct — the folder here is the Next.js site. The CLI comes from the npm package. |
