/** Message protocol shared with the extension host (../../src/panel.ts). */

export interface ProxyRequest {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface AuthState {
  authenticated: boolean;
  user?: { id: string; name?: string; email?: string };
  serverUrl: string;
}

export type OutboundMessage =
  | { type: "ready" }
  | { type: "signIn" }
  | { type: "signOut" }
  | { type: "setServerUrl" }
  | { type: "openExternal"; url: string }
  | { type: "notify"; level: "info" | "warning" | "error"; message: string }
  | { type: "cancelRequest"; requestId: string }
  | { type: "apiRequest"; requestId: string; request: ProxyRequest };

export type InboundMessage =
  | ({ type: "authState" } & AuthState)
  | { type: "apiResponse"; requestId: string; response: ProxyResponse };

/** Injected into the page by the extension host, see src/webviewHtml.ts. */
export interface Bootstrap {
  serverUrl: string;
  followVsCodeTheme: boolean;
}

export function readBootstrap(): Bootstrap {
  const element = document.getElementById("cccp-bootstrap");

  try {
    return JSON.parse(element?.textContent ?? "{}") as Bootstrap;
  } catch {
    return { serverUrl: "", followVsCodeTheme: true };
  }
}
