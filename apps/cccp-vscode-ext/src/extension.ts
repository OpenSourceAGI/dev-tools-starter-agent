import * as vscode from "vscode";
import { AuthManager } from "./auth";
import { promptForServerUrl, serverUrl } from "./config";
import { CccpEditorPanel, CccpViewProvider } from "./panel";

export function activate(context: vscode.ExtensionContext): void {
  const auth = new AuthManager(context.secrets);
  const provider = new CccpViewProvider(context.extensionUri, auth);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CccpViewProvider.viewType, provider, {
      // The instance list polls every 10s and the create form holds a long
      // draft, so the view keeps its state while the user is in another sidebar.
      webviewOptions: { retainContextWhenHidden: true },
    }),

    vscode.commands.registerCommand("cccp.signIn", () => auth.signIn()),
    vscode.commands.registerCommand("cccp.signOut", () => auth.signOut()),

    vscode.commands.registerCommand("cccp.focus", () =>
      vscode.commands.executeCommand("cccp.panelView.focus"),
    ),

    vscode.commands.registerCommand("cccp.openInEditor", () =>
      CccpEditorPanel.show(context.extensionUri, auth),
    ),

    vscode.commands.registerCommand("cccp.setServerUrl", async () => {
      const updated = await promptForServerUrl();
      // The panels reload themselves off the configuration change; re-checking
      // the session here keeps the auth state honest for the new deployment.
      if (updated) await auth.notifyChanged();
    }),

    vscode.commands.registerCommand("cccp.openInBrowser", () =>
      vscode.env.openExternal(vscode.Uri.parse(`${serverUrl()}/dashboard`)),
    ),

    vscode.commands.registerCommand("cccp.reload", () => {
      provider.reload();
      CccpEditorPanel.reload();
    }),
  );
}

export function deactivate(): void {}
