<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/apps/cccp-vscode-ext"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
</p>
<!-- template-git-repo:badges:end -->

# CCCP for VS Code

The [Cloud Computer Control Panel](../Cloud-Computer-Control-Panel/) dashboard, in the VS Code sidebar.

![the panel in the sidebar](https://i.imgur.com/t6WlnCI.png)

Provision EC2 instances, install Dokploy, deploy Docker images and GitHub repos, and manage your
encrypted AWS credentials — without leaving the editor.

## It is the same UI, not a copy of it

The panel does not re-implement the dashboard. `webview-ui` imports CCCP's own React components
straight out of `apps/Cloud-Computer-Control-Panel` and renders them unchanged:

| Reused as-is | From |
| --- | --- |
| Instance list, start/stop/terminate/snapshot, Dokploy install | `components/dashboard/manager-list.tsx` |
| Instance controls and SSH software install | `components/instance/instance-controls.tsx`, `add-software-modal.tsx` |
| Create-instance form, cost estimate, region globe | `components/instance/create-manager.tsx` |
| AWS credential settings | `components/dashboard/credentials-settings.tsx` |
| Docker Hub and GitHub search | `components/search/*.tsx` |
| shadcn/ui primitives and the design tokens | `components/ui/*`, `app/theme-tokens.css` |

Only the shell around them is written here, because a 400px sidebar wants a different frame than a
full page — and because VS Code already supplies what the web header did (theming, the account
menu, external links). Change a component in the Next.js app and the panel changes with it.

Two mechanisms make that possible, both in `webview-ui/src/bridge.ts`:

- **`fetch("/api/...")`** — the components issue the same relative requests they do in the browser.
  A webview has no origin to be relative to, so the patched `fetch` posts each request to the
  extension host, which resolves it against `cccp.serverUrl` and adds the session cookie.
- **`window.open(...)`** — a webview cannot open windows, so those calls (and `target="_blank"`
  links) are routed to `vscode.env.openExternal` and land in the user's real browser.

## Architecture

```
webview (webview-ui/dist/main.js)          extension host (dist/extension.js)
  CCCP components, unchanged                 AuthManager  — session cookie in SecretStorage
  bridge.ts  fetch → postMessage    ←──→     apiProxy.ts  — fetch to cccp.serverUrl
  theme.ts   VS Code kind → .dark            panel.ts     — sidebar view + editor tab
```

The session cookie never enters the webview, and the webview can never reach the network itself:
its Content-Security-Policy sets `connect-src 'none'`, and the proxy refuses any path that is not
relative to the configured server.

## Setup

1. Run a CCCP deployment — `cd ../Cloud-Computer-Control-Panel && bun dev` for a local one.
2. Install this extension (see **Development** below, or install the packaged `.vsix`).
3. Open the cloud icon in the activity bar and choose **Sign in to CCCP**. You are prompted for the
   server URL, then email and password; **Create an account** registers on that deployment.
4. Save your AWS IAM keys from the panel's settings (gear) icon. They are encrypted by the CCCP
   server before storage and are never sent back — the panel only ever holds a masked key id.

Signing in with Google or a magic link needs a browser round-trip an extension cannot drive: sign in
on the website for those, then use email + password here, or point `cccp.serverUrl` at the same
deployment and sign in with a password you set there.

## Commands

| Command | What it does |
| --- | --- |
| `CCCP: Open Control Panel` | Reveals the sidebar view |
| `CCCP: Open Control Panel in an Editor Tab` | The same panel at full editor width, for the create form |
| `CCCP: Sign In` / `CCCP: Sign Out` | Manages the session held in SecretStorage |
| `CCCP: Set Server URL` | Points the panel at a different deployment |
| `CCCP: Open the Web Dashboard in a Browser` | Opens `/dashboard` on the configured server |
| `CCCP: Reload Panel` | Re-renders the webview |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `cccp.serverUrl` | `http://localhost:3000` | Base URL of your CCCP deployment |
| `cccp.followVsCodeTheme` | `true` | Match the panel's light/dark mode to the editor theme |
| `cccp.requestTimeoutMs` | `60000` | How long to wait on the server; provisioning calls are slow |

## Development

```bash
bun install
cd webview-ui && bun install && cd ..

bun run compile   # builds webview-ui/dist and dist/extension.js
bun run test      # host transport, session and bridge tests
bun run type-check
```

Then press <kbd>F5</kbd> in VS Code to launch an Extension Development Host.

`webview-ui` resolves the neighbouring app's bare imports (`react`, `lucide-react`, Radix) against
its own `node_modules` — see `resolveCccpImportsHere()` in `webview-ui/vite.config.ts` and the `"*"`
path fallback in `webview-ui/tsconfig.json` — so the Next.js app does not need to be installed to
build the panel.

## Notes

- The instance list keeps its manager configs and generated SSH keys in the webview's
  `localStorage`, exactly as the web dashboard does in the browser's. They are per-surface: keys
  generated in the browser are not visible to the panel, and vice versa.
- The list polls every 10 seconds while the view is open, matching the web dashboard.
