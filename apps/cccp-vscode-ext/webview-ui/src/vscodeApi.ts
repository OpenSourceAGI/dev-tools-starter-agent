import type { WebviewApi } from "vscode-webview";
import type { OutboundMessage } from "./protocol";

/** Typed wrapper around `acquireVsCodeApi()`, which may only be called once. */
class VsCodeApiWrapper {
  private readonly api: WebviewApi<unknown> | undefined;

  constructor() {
    if (typeof acquireVsCodeApi === "function") {
      this.api = acquireVsCodeApi();
    }
  }

  post(message: OutboundMessage): void {
    this.api?.postMessage(message);
  }
}

export const vscodeApi = new VsCodeApiWrapper();
