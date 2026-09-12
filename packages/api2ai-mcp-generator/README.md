
<p align="center">
    <img width="600px" src="https://i.imgur.com/TTJBLxo.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/api2ai-mcp-generator"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/api2ai-mcp-generator"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/api2ai"><img src="https://img.shields.io/npm/dm/api2ai.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/api2ai"><img src="https://img.shields.io/npm/v/api2ai.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/api2ai"><img src="https://img.shields.io/npm/dt/api2ai.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/api2ai"><img src="https://img.shields.io/npm/types/api2ai" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=api2ai"><img src="https://packagephobia.com/badge?p=api2ai" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Next.js-black?logo=nextdotjs&logoColor=white" alt="Next.js" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /> <img src="https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white" alt="shadcn/ui" /> <img src="https://img.shields.io/badge/Drizzle%20ORM-C5F74F?logo=drizzle&logoColor=white" alt="Drizzle ORM" /> <img src="https://img.shields.io/badge/better--auth-000000" alt="better-auth" /> <img src="https://img.shields.io/badge/Stripe-635BFF?logo=stripe&logoColor=white" alt="Stripe" /> <img src="https://img.shields.io/badge/Vercel%20AI%20SDK-black?logo=vercel&logoColor=white" alt="Vercel AI SDK" /> <img src="https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white" alt="Zod" /> <img src="https://img.shields.io/badge/Fumadocs-000000" alt="Fumadocs" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill api2ai` ([what it covers](../../skills/api2ai/SKILL.md))
<!-- skills:install:end -->

<h3 align="center">
  <a href="https://api-2-ai.vercel.app/"> 🌐 Live Site </a> &nbsp;|&nbsp;
  <a href="https://github.com/vtempest/GRAB-URL/tree/master/api2ai/example-petstore"> 🎯 Example MCP Server </a>
</h3>




# API2AI: OpenAPI to MCP-Use Server 

Generate production-ready MCP servers from any OpenAPI specification using the highly-used and convenient [mcp-use](https://mcp-use.com) framework (8k+ GitHub stars).

OpenAPI specs are easy to write and organize your code and have [100s of tools available](https://openapi.tools) such as the [OpenAPI Builder web UI](https://www.apibldr.com).

Try it in the browser at **[api-2-ai.vercel.app](https://api-2-ai.vercel.app/)** — the hosted site lets you design and validate OpenAPI specs visually, browse the docs, and see generated-server examples without installing anything.

## Features

- 🚀 **Modern Framework** - Uses mcp-use for clean, maintainable code
- 🔍 **Built-in Inspector** - Test tools immediately at `/inspector`
- 📡 **Multiple Transports** - HTTP, SSE, and Streamable HTTP support
- 🎨 **UI Widgets** - Compatible with ChatGPT Apps SDK and MCP-UI
- 🔐 **Auth Support** - Bearer tokens, API keys, custom headers
- ✨ **Zod Schemas** - Type-safe parameter validation
- 🛡️ **Security Hardening** - Risk classification, policy enforcement, HTTP guardrails
- 🐳 **Production Ready** - Docker, PM2, and Kubernetes ready

## Quick Start

```bash
# Generate a server from the Petstore API
npx api2ai \
  https://petstore3.swagger.io/api/v3/openapi.json \
  ./petstore-mcp \
  --name petstore-api

# Install and run
cd petstore-mcp
npm install
npm start
```

Open http://localhost:3000/inspector to test your tools!

## Usage

### CLI

```bash
node generate-mcp-use-server.js <openapi-spec> [output-folder] [options]

Options:
  --name <name>            Server name (default: api-mcp-server)
  --base-url <url>         Override API base URL
  --port <port>            Server port (default: 3000)
  --allow-mutations        Enable POST/PUT/PATCH/DELETE tools by default
  --include-tags <tags>    Only include tools with these tags (comma-separated)
  --exclude-tags <tags>    Exclude tools with these tags (comma-separated)
  --approve-writes         Disable approval requirement for restricted tools
  --help                   Show help
```

### Examples

```bash
# From remote URL
node generate-mcp-use-server.js \
  https://api.example.com/openapi.json \
  ./my-server \
  --name my-api

# From local file
node generate-mcp-use-server.js \
  ./specs/my-api.yaml \
  ./my-mcp-server \
  --port 8080

# With custom base URL
node generate-mcp-use-server.js \
  ./petstore.json \
  ./petstore \
  --base-url https://petstore.example.com/v3

# Include only read-only tools tagged "public"
node generate-mcp-use-server.js \
  ./api.json \
  ./readonly-server \
  --include-tags public \
  --exclude-tags admin,internal

# Enable writes (mutations) explicitly
node generate-mcp-use-server.js \
  ./api.json \
  ./full-server \
  --allow-mutations \
  --approve-writes
```

### Programmatic Usage

```javascript
import { generateMcpServer, extractTools, loadOpenApiSpec } from './generate-mcp-use-server.js';

// Generate complete server
const result = await generateMcpServer(
  'https://api.example.com/openapi.json',
  './output-folder',
  {
    serverName: 'my-api',
    baseUrl: 'https://api.example.com/v1',
    port: 3000,
    allowMutations: false,       // block POST/PUT/PATCH/DELETE by default
    includeTags: ['public'],     // only include tools tagged "public"
    excludeTags: ['admin'],      // exclude tools tagged "admin"
  }
);

console.log(`Generated ${result.toolCount} tools`);

// Or just extract tools for custom processing
const spec = await loadOpenApiSpec('./my-spec.json');
const tools = extractTools(spec, {
  filterFn: (tool) => tool.riskLevel === 'low',  // only safe read-only tools
  excludeOperationIds: ['deleteUser'],
});
```

## Security

The generator enforces a three-layer security model in every generated server.

### Layer 1 — Generation-time risk classification

Every tool is classified during generation and the result is baked into `src/tools-config.js`:

| Risk level | When assigned | Default behavior |
|------------|---------------|------------------|
| `low` | `GET`, `HEAD`, `OPTIONS` with no dangerous keywords | Enabled, no approval required |
| `medium` | Any mutating method (`POST`, `PUT`, `PATCH`, `DELETE`) | Blocked unless `ALLOW_RESTRICTED_TOOLS=true` |
| `high` | Any operation matching admin, auth, billing, payments, tokens, secrets, user management patterns | Blocked, approval required |

Use `--allow-mutations` at generation time to promote medium-risk tools to enabled-by-default, or override at runtime with env vars.

### Layer 2 — Runtime policy enforcement

`checkToolPolicy()` runs before every outbound API call, reading env vars at call-time so you can change policy without regenerating:

```
ALLOW_RESTRICTED_TOOLS=true    # unlock medium/high-risk tools
REQUIRE_APPROVALS=false        # bypass per-call approval gate
```

### Layer 3 — HTTP hardening

The generated HTTP client enforces these on every request:

- **Timeouts** — configurable via `REQUEST_TIMEOUT_MS` (default 30 s)
- **Response size cap** — configurable via `MAX_RESPONSE_BYTES` (default 10 MB)
- **No redirects** — `redirect: 'error'` prevents host-pivot attacks
- **Credential header protection** — tool arguments cannot override `Authorization`, `Cookie`, `X-API-Key`, or other credential headers; env-configured auth always wins
- **Host allowlist** — `ALLOWED_API_HOSTS` restricts outbound calls to specific hostnames

> **Inspector note**: The built-in inspector at `/inspector` exposes all registered tools. In production, restrict access using a reverse proxy or firewall rule.

## Generated Output

```
my-mcp-server/
├── .env              # Environment config (gitignored)
├── .env.example      # Example environment file
├── .gitignore
├── package.json
├── README.md         # Generated documentation
└── src/
    ├── index.js        # Main server with tool registrations
    ├── http-client.js  # Hardened HTTP client
    ├── tools-config.js # Tool configurations with risk metadata
    └── policy.js       # Runtime security policy
```

## Generated Server Features

### Built-in Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /inspector` | Interactive tool testing UI |
| `POST /mcp` | MCP protocol endpoint |
| `GET /sse` | Server-Sent Events endpoint |
| `GET /health` | Health check |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `API_BASE_URL` | Base URL for API calls | From spec |
| `API_KEY` | Bearer token auth | — |
| `API_AUTH_HEADER` | Custom header (`Name:value`) | — |
| `MCP_URL` | Public URL for widgets | — |
| `ALLOWED_ORIGINS` | CORS origins (production) | — |
| `ALLOW_RESTRICTED_TOOLS` | Allow medium/high-risk tools | `false` |
| `REQUIRE_APPROVALS` | Require approval for restricted tools | `true` |
| `ALLOWED_API_HOSTS` | Comma-separated allowed API hostnames | (spec's host) |
| `REQUEST_TIMEOUT_MS` | Outbound request timeout in ms | `30000` |
| `MAX_RESPONSE_BYTES` | Maximum response body size in bytes | `10485760` |

### Connect to Claude Desktop

```json
{
  "mcpServers": {
    "my-api": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Connect to ChatGPT

The generated server supports the OpenAI Apps SDK out of the box.

## Advanced Options

### Filter by risk level

```javascript
const result = await generateMcpServer(specUrl, outputDir, {
  filterFn: (tool) => tool.riskLevel === 'low',
});
```

### Filter Tools by Method

```javascript
const result = await generateMcpServer(specUrl, outputDir, {
  filterFn: (tool) => ['get', 'post'].includes(tool.method),
});
```

### Exclude Dangerous Operations

```javascript
const result = await generateMcpServer(specUrl, outputDir, {
  excludeOperationIds: [
    'deleteUser',
    'deleteAllData', 
    'adminReset',
  ],
});
```

### Filter by Path Pattern

```javascript
const result = await generateMcpServer(specUrl, outputDir, {
  filterFn: (tool) => tool.pathTemplate.startsWith('/api/v2/'),
});
```

### Combine Filters

```javascript
const result = await generateMcpServer(specUrl, outputDir, {
  excludeOperationIds: ['deleteUser'],
  allowMutations: false,
  filterFn: (tool) => 
    tool.riskLevel === 'low' && 
    tool.pathTemplate.includes('/public/'),
});
```

## Comparison with Raw MCP SDK

| Feature | This Generator | Raw SDK |
|---------|---------------|---------|
| Code needed | ~50 lines | ~200+ lines |
| Inspector | ✅ Built-in | ❌ Manual |
| UI Widgets | ✅ Supported | ❌ Manual |
| Zod validation | ✅ Generated | ❌ Manual |
| Authentication | ✅ Configured | ❌ Manual |
| Risk classification | ✅ Automatic | ❌ Manual |
| Runtime policy | ✅ Generated | ❌ Manual |
| HTTP hardening | ✅ Built-in | ❌ Manual |
| Production ready | ✅ Yes | ⚠️ Requires work |

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
