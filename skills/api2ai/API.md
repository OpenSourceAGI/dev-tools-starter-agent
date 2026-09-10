# api2ai API Reference

## CLI

```
api2ai <openapi-spec> [output-folder] [options]
```

| Option | Default | Description |
| --- | --- | --- |
| `--name <name>` | `api-mcp-server` | Server name |
| `--base-url <url>` | from spec | Override the API base URL |
| `--port <port>` | `3000` | Server port |
| `--allow-mutations` | off | Enable `POST`/`PUT`/`PATCH`/`DELETE` tools by default |
| `--include-tags <tags>` | — | Comma-separated allowlist of tags |
| `--exclude-tags <tags>` | — | Comma-separated denylist of tags |
| `--approve-writes` | off | Drop the approval requirement for restricted tools |
| `--help` | — | Usage |

## Programmatic

```js
import { generateMcpServer, extractTools, loadOpenApiSpec } from "api2ai";
```

| Function | Purpose |
| --- | --- |
| `generateMcpServer(spec, outDir, options)` | Write a complete server; resolves to `{ toolCount, … }` |
| `loadOpenApiSpec(pathOrUrl)` | Load and parse a spec |
| `extractTools(spec, options)` | Get the tool list without generating files |

Options: `serverName`, `baseUrl`, `port`, `allowMutations`, `includeTags`, `excludeTags`, `excludeOperationIds`, `filterFn(tool)`. Each `tool` exposes at least `method`, `pathTemplate`, `operationId`, and `riskLevel`.

## Risk levels

| Level | Assigned when | Default |
| --- | --- | --- |
| `low` | `GET`/`HEAD`/`OPTIONS`, no dangerous keywords | Enabled, no approval |
| `medium` | Any mutating method | Blocked unless `ALLOW_RESTRICTED_TOOLS=true` |
| `high` | Admin, auth, billing, payments, tokens, secrets, user management | Blocked, approval required |

## Generated output

```
my-mcp-server/
├── .env / .env.example / .gitignore
├── package.json
├── README.md
└── src/
    ├── index.js        # server + tool registrations
    ├── http-client.js  # hardened HTTP client
    ├── tools-config.js # tools with risk metadata
    └── policy.js       # runtime policy
```

## Generated server endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /inspector` | Interactive tool testing UI (no auth — restrict in production) |
| `POST /mcp` | MCP protocol endpoint |
| `GET /sse` | Server-Sent Events transport |
| `GET /health` | Health check |

## Generated server environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | |
| `API_BASE_URL` | from spec | Upstream base URL |
| `API_KEY` | — | Bearer token for the upstream API |
| `API_AUTH_HEADER` | — | Custom auth header as `Name:value` |
| `MCP_URL` | — | Public URL used by widgets |
| `ALLOWED_ORIGINS` | — | CORS origins in production |
| `ALLOW_RESTRICTED_TOOLS` | `false` | Unlock medium/high-risk tools |
| `REQUIRE_APPROVALS` | `true` | Approval gate for restricted tools |
| `ALLOWED_API_HOSTS` | spec host | Outbound host allowlist |
| `REQUEST_TIMEOUT_MS` | `30000` | Outbound timeout |
| `MAX_RESPONSE_BYTES` | `10485760` | Response size cap |
