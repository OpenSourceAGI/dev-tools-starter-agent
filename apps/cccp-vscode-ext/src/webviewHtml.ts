import * as vscode from "vscode";
import { getNonce } from "./nonce";

export interface WebviewBootstrap {
  serverUrl: string;
  followVsCodeTheme: boolean;
}

/**
 * Renders the shell for the Vite build in `webview-ui/dist`. The same HTML backs
 * both the sidebar view and the editor-tab panel, so the two are literally the
 * same UI at two widths.
 *
 * The CSP is deliberately narrow: the panel talks to CCCP only through the
 * extension host, so `connect-src` stays closed. `img-src` allows `https:`
 * because Docker Hub and GitHub search results render remote avatars, and
 * `blob:` covers the WebGL globe's canvas snapshots on the create-instance tab.
 */
export function renderWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  bootstrap: WebviewBootstrap,
): string {
  const distUri = vscode.Uri.joinPath(extensionUri, "webview-ui", "dist");
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "main.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "main.css"));
  const nonce = getNonce();

  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https: data: blob:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
    `font-src ${webview.cspSource} data:`,
    "connect-src 'none'",
  ].join("; ");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>CCCP Cloud Computer Control Panel</title>
</head>
<body class="font-sans antialiased">
  <div id="root"></div>
  <script nonce="${nonce}" type="application/json" id="cccp-bootstrap">${JSON.stringify(bootstrap).replace(/</g, "\\u003c")}</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
