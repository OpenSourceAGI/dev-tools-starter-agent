import * as vscode from "vscode";

export const CONFIG_SECTION = "cccp";

const DEFAULT_SERVER_URL = "http://localhost:3000";

/** Base URL of the CCCP deployment, normalised so `new URL(path, base)` behaves. */
export function serverUrl(): string {
  const configured = vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<string>("serverUrl", DEFAULT_SERVER_URL)
    .trim();

  const base = configured || DEFAULT_SERVER_URL;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function followVsCodeTheme(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>("followVsCodeTheme", true);
}

export function requestTimeoutMs(): number {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>("requestTimeoutMs", 60_000);
}

/** Prompts for a new server URL and writes it to the user's settings. */
export async function promptForServerUrl(): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    title: "CCCP Server URL",
    prompt: "Base URL of your Cloud Computer Control Panel deployment",
    value: serverUrl(),
    ignoreFocusOut: true,
    placeHolder: DEFAULT_SERVER_URL,
    validateInput: (input) => {
      const trimmed = input.trim();
      if (!trimmed) return "A server URL is required";
      try {
        const url = new URL(trimmed);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return "The URL must start with http:// or https://";
        }
        return undefined;
      } catch {
        return "That is not a valid URL";
      }
    },
  });

  if (!value) return undefined;

  const trimmed = value.trim().replace(/\/$/, "");
  await vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .update("serverUrl", trimmed, vscode.ConfigurationTarget.Global);

  return trimmed;
}
