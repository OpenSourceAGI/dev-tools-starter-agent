# CLAUDE.md — `apps/cccp-vscode-ext`

Private. The Cloud Computer Control Panel dashboard, in the VS Code sidebar.

## The architecture in one sentence

It **imports CCCP's own React components unchanged** into a webview and routes
their `/api` calls through the extension host, so provisioning EC2 instances,
installing Dokploy and managing encrypted AWS credentials all happen without
leaving the editor.

Two consequences that drive every change here:

1. **`apps/Cloud-Computer-Control-Panel` is an upstream you do not control from
   here.** A renamed component or changed prop over there breaks this build.
   When you change shared components, build this extension too.
2. **Do not fork a component to fix it.** A local copy defeats the whole design
   and silently drifts. Fix it in CCCP.

## Extension-host boundary

The webview cannot make network calls directly — every `/api` call is bridged
through the extension host. So:

- A component that reaches for `fetch` against an absolute URL, or for `window`
  APIs the webview doesn't have, works in CCCP and fails here.
- Credentials live on the **host** side. Never pass a secret into the webview to
  "save a round trip".

## Shape

`src/` (extension host) · `webview-ui/` (the webview bundle) · `media/` ·
`esbuild.mjs` (bundler) · `test/` + `vitest.config.mts`

```bash
cd apps/cccp-vscode-ext
bun run compile        # what CI runs
bun run build:webview
bun run watch
bun run test
bun run package        # vsix
```
