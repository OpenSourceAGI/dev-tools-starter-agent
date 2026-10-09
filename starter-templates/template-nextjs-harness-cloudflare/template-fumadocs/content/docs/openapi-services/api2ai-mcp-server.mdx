---
title: API2AI - OpenAPI to MCP Server 
icon: Bot
---

<p align="center">
    <img width="600px" src="https://i.imgur.com/TTJBLxo.png" />
</p>
<h3 align="center">
  <a href="https://github.com/vtempest/GRAB-URL/tree/master/api2ai/example-petstore"> 🎯 Example MCP Server </a>
</h3>


<p align="center">
   <a href="https://npmjs.org/package/grab-url"><img alt="NPM Version" src="https://img.shields.io/npm/v/grab-url" /></a><a href="https://github.com/vtempest/GRAB-URL/discussions"><img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/GRAB-URL" /></a><a href="https://github.blog/developer-skills/github/beginners-guide-to-github-creating-a-pull-request/"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/></a>
</p>


# API2AI: OpenAPI to MCP-Use Server 

Generate production-ready MCP servers from any OpenAPI specification using the highly-used and convenient [mcp-use](https://mcp-use.com) framework (8k+ GitHub stars).

OpenAPI specs are easy to write and organize your code and have [100s of tools available](https://openapi.tools) such as the [OpenAPI Builder web UI](https://www.apibldr.com).

## Features

- 🚀 **Modern Framework** - Uses mcp-use for clean, maintainable code
- 🔍 **Built-in Inspector** - Test tools immediately at `/inspector`
- 📡 **Multiple Transports** - HTTP, SSE, and Streamable HTTP support
- 🎨 **UI Widgets** - Compatible with ChatGPT Apps SDK and MCP-UI
- 🔐 **Auth Support** - Bearer tokens, API keys, custom headers
- ✨ **Zod Schemas** - Type-safe parameter validation
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
  --name <name>      Server name (default: api-mcp-server)
  --base-url <url>   Override API base URL
  --port <port>      Server port (default: 3000)
  --help             Show help
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
  }
);

console.log(`Generated ${result.toolCount} tools`);

// Or just extract tools for custom processing
const spec = await loadOpenApiSpec('./my-spec.json');
const tools = extractTools(spec, {
  filterFn: (tool) => tool.method === 'get',  // Only GET endpoints
  excludeOperationIds: ['deleteUser'],        // Exclude specific operations
});
```

## Generated Output

```
my-mcp-server/
├── .env              # Environment config (gitignored)
├── .env.example      # Example environment file
├── .gitignore
├── package.json
├── README.md         # Generated documentation
└── src/
    ├── index.js      # Main server with tool registrations
    ├── http-client.js # HTTP utilities
    └── tools-config.js # Tool configurations
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

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `NODE_ENV` | development/production |
| `API_BASE_URL` | Base URL for API calls |
| `API_KEY` | Bearer token auth |
| `API_AUTH_HEADER` | Custom header (`Name:value`) |
| `MCP_URL` | Public URL for widgets |
| `ALLOWED_ORIGINS` | CORS origins (production) |


### Connect to ChatGPT

The generated server supports the OpenAI Apps SDK out of the box.

## Advanced Options

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
  filterFn: (tool) => 
    tool.method === 'get' && 
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
| Production ready | ✅ Yes | ⚠️ Requires work |
