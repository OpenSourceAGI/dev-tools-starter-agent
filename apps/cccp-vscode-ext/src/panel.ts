import * as vscode from "vscode";
import { AuthManager } from "./auth";
import { errorResponse, forwardRequest, type ProxyRequest } from "./apiProxy";
import { followVsCodeTheme, requestTimeoutMs, serverUrl } from "./config";
import { renderWebviewHtml } from "./webviewHtml";

interface InboundMessage {
  type: "ready" | "signIn" | "signOut" | "setServerUrl" | "openExternal" | "apiRequest" | "cancelRequest" | "notify";
  requestId?: string;
  request?: ProxyRequest;
  url?: string;
  level?: "info" | "warning" | "error";
  message?: string;
}

/**
 * Drives one webview -- the sidebar view or the editor tab, which run the same
 * bundle. Everything the panel can't do from inside a webview (reach the CCCP
 * server, hold the session, open a browser) is answered here.
 */
export class PanelController {
  private readonly abortControllers = new Map<string, AbortController>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly webview: vscode.Webview,
    private readonly extensionUri: vscode.Uri,
    private readonly auth: AuthManager,
  ) {
    this.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist")],
    };
    this.webview.html = this.render();

    this.disposables.push(
      this.webview.onDidReceiveMessage((message: InboundMessage) => this.handleMessage(message)),

      this.auth.onDidChangeAuth((state) => this.post({ type: "authState", ...state })),

      vscode.workspace.onDidChangeConfiguration((event) => {
        // A new server URL means a different session and different data, so the
        // panel restarts rather than trying to reconcile what it already shows.
        // `requestTimeoutMs` is read per request and needs no reload.
        if (
          event.affectsConfiguration("cccp.serverUrl") ||
          event.affectsConfiguration("cccp.followVsCodeTheme")
        ) {
          this.reload();
        }
      }),
    );
  }

  /** Re-renders the webview from scratch (used by the reload command and on config changes). */
  reload(): void {
    this.webview.html = this.render();
  }

  dispose(): void {
    for (const controller of this.abortControllers.values()) controller.abort();
    this.abortControllers.clear();
    for (const disposable of this.disposables) disposable.dispose();
  }

  private render(): string {
    return renderWebviewHtml(this.webview, this.extensionUri, {
      serverUrl: serverUrl(),
      followVsCodeTheme: followVsCodeTheme(),
    });
  }

  private post(message: unknown): void {
    void this.webview.postMessage(message);
  }

  private async handleMessage(message: InboundMessage): Promise<void> {
    switch (message.type) {
      case "ready": {
        this.post({ type: "authState", ...(await this.auth.refreshUser()) });
        return;
      }

      case "signIn": {
        await vscode.commands.executeCommand("cccp.signIn");
        return;
      }

      case "signOut": {
        await vscode.commands.executeCommand("cccp.signOut");
        return;
      }

      case "setServerUrl": {
        await vscode.commands.executeCommand("cccp.setServerUrl");
        return;
      }

      case "openExternal": {
        if (message.url) await vscode.env.openExternal(vscode.Uri.parse(message.url));
        return;
      }

      case "notify": {
        const text = message.message ?? "";
        if (!text) return;
        if (message.level === "error") vscode.window.showErrorMessage(text);
        else if (message.level === "warning") vscode.window.showWarningMessage(text);
        else vscode.window.showInformationMessage(text);
        return;
      }

      case "cancelRequest": {
        if (message.requestId) this.abortControllers.get(message.requestId)?.abort();
        return;
      }

      case "apiRequest": {
        if (!message.requestId || !message.request) return;
        await this.proxy(message.requestId, message.request);
        return;
      }
    }
  }

  private async proxy(requestId: string, request: ProxyRequest): Promise<void> {
    const baseUrl = serverUrl();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    try {
      const response = await forwardRequest(
        request,
        {
          baseUrl,
          cookieHeader: await this.auth.getCookieHeader(),
          timeoutMs: requestTimeoutMs(),
          onSetCookies: (setCookies) => this.auth.absorbSetCookies(setCookies),
        },
        controller.signal,
      );

      this.post({ type: "apiResponse", requestId, response });

      // A 401 means the cookie we replayed is no longer good; tell the panel to
      // fall back to its sign-in view instead of rendering an empty dashboard.
      if (response.status === 401) {
        this.post({ type: "authState", ...(await this.auth.refreshUser()) });
      }
    } catch (error) {
      if (controller.signal.aborted && !(error instanceof Error && error.name === "TimeoutError")) return;
      this.post({ type: "apiResponse", requestId, response: errorResponse(error, baseUrl) });
    } finally {
      this.abortControllers.delete(requestId);
    }
  }
}

/** The sidebar view in the CCCP activity-bar container. */
export class CccpViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "cccp.panelView";

  private controller?: PanelController;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly auth: AuthManager,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.controller?.dispose();
    this.controller = new PanelController(webviewView.webview, this.extensionUri, this.auth);

    webviewView.onDidDispose(() => {
      this.controller?.dispose();
      this.controller = undefined;
    });
  }

  reload(): void {
    this.controller?.reload();
  }
}

/**
 * The same panel in an editor tab. The sidebar is the primary home, but instance
 * creation has a wide two-column form, so it helps to have the roomier view.
 */
export class CccpEditorPanel {
  private static current?: CccpEditorPanel;
  private static readonly viewType = "cccp.editorPanel";

  private readonly controller: PanelController;
  private readonly panel: vscode.WebviewPanel;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, auth: AuthManager) {
    this.panel = panel;
    this.controller = new PanelController(panel.webview, extensionUri, auth);

    panel.onDidDispose(() => {
      this.controller.dispose();
      CccpEditorPanel.current = undefined;
    });
  }

  static show(extensionUri: vscode.Uri, auth: AuthManager): void {
    if (CccpEditorPanel.current) {
      CccpEditorPanel.current.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      CccpEditorPanel.viewType,
      "Cloud Control Panel",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        // Keeps the instance list and any half-filled create form alive when the
        // user switches to another editor tab and back.
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "webview-ui", "dist")],
      },
    );

    panel.iconPath = vscode.Uri.joinPath(extensionUri, "media", "sidebar-icon.svg");
    CccpEditorPanel.current = new CccpEditorPanel(panel, extensionUri, auth);
  }

  static reload(): void {
    CccpEditorPanel.current?.controller.reload();
  }
}
