import * as vscode from "vscode";
import { hasSessionToken, mergeCookies, setCookiesOf } from "./cookies";
import { promptForServerUrl, serverUrl } from "./config";

const SESSION_SECRET = "cccp.sessionCookie";

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

export interface AuthState {
  authenticated: boolean;
  user?: AuthUser;
  serverUrl: string;
}

/**
 * Owns the CCCP session. The panel's UI never sees the cookie: the webview asks
 * the extension host for a path like `/api/instances`, and this class supplies
 * the `Cookie` header for the request the host makes on its behalf.
 *
 * CCCP signs in with better-auth's email + password endpoints, which is the one
 * method a self-hosted deployment always has enabled -- Google OAuth and magic
 * links need a browser round-trip that an extension can't drive, so those users
 * sign in on the website and the panel picks the session up from there.
 */
export class AuthManager {
  private readonly _onDidChangeAuth = new vscode.EventEmitter<AuthState>();
  readonly onDidChangeAuth = this._onDidChangeAuth.event;

  private cachedUser: AuthUser | undefined;

  constructor(private readonly secrets: vscode.SecretStorage) {}

  getCookieHeader(): Thenable<string | undefined> {
    return this.secrets.get(SESSION_SECRET);
  }

  /** Records cookies the server set on a proxied response (session refresh, sign-out). */
  async absorbSetCookies(setCookies: readonly string[]): Promise<void> {
    if (setCookies.length === 0) return;

    const merged = mergeCookies(await this.getCookieHeader(), setCookies);

    if (hasSessionToken(merged)) {
      await this.secrets.store(SESSION_SECRET, merged);
    } else {
      // The server expired the session out from under us.
      await this.clear();
    }
  }

  async state(): Promise<AuthState> {
    const cookie = await this.getCookieHeader();
    return {
      authenticated: hasSessionToken(cookie),
      user: this.cachedUser,
      serverUrl: serverUrl(),
    };
  }

  private fire(state: AuthState): void {
    this._onDidChangeAuth.fire(state);
  }

  private async clear(): Promise<void> {
    this.cachedUser = undefined;
    await this.secrets.delete(SESSION_SECRET);
  }

  /**
   * Confirms the stored cookie still names a live session, and caches the user
   * behind it so the panel header can show who is signed in.
   */
  async refreshUser(): Promise<AuthState> {
    const cookie = await this.getCookieHeader();

    if (!hasSessionToken(cookie)) {
      this.cachedUser = undefined;
      return this.state();
    }

    try {
      const response = await fetch(new URL("/api/auth/get-session", serverUrl()), {
        headers: { Cookie: cookie as string, Accept: "application/json" },
      });

      if (response.status === 401) {
        await this.clear();
        return this.state();
      }

      const session = (await response.json()) as { user?: AuthUser } | null;
      this.cachedUser = session?.user;

      if (!session?.user) await this.clear();
    } catch {
      // Server unreachable: keep the cookie so the panel can retry, and let the
      // request that surfaced the error report it.
    }

    return this.state();
  }

  /** Sign in (or sign up) against the configured deployment, then store the session. */
  async signIn(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: "$(sign-in) Sign in", description: "I already have a CCCP account", action: "signin" as const },
        { label: "$(person-add) Create an account", description: "Register on this deployment", action: "signup" as const },
        { label: "$(server) Change server URL", description: `Currently ${serverUrl()}`, action: "server" as const },
      ],
      { title: "Sign in to CCCP", placeHolder: `Connecting to ${serverUrl()}` },
    );

    if (!choice) return false;

    if (choice.action === "server") {
      if (!(await promptForServerUrl())) return false;
      return this.signIn();
    }

    const email = await vscode.window.showInputBox({
      title: "CCCP Email",
      prompt: `Email for ${serverUrl()}`,
      ignoreFocusOut: true,
      placeHolder: "you@example.com",
      validateInput: (value) => (value.includes("@") ? undefined : "Enter a valid email address"),
    });
    if (!email) return false;

    const password = await vscode.window.showInputBox({
      title: "CCCP Password",
      prompt: choice.action === "signup" ? "Choose a password (at least 8 characters)" : "Password",
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) return "A password is required";
        if (choice.action === "signup" && value.length < 8) return "At least 8 characters";
        return undefined;
      },
    });
    if (!password) return false;

    let name: string | undefined;
    if (choice.action === "signup") {
      name = await vscode.window.showInputBox({
        title: "CCCP Display Name",
        prompt: "How should the panel address you?",
        ignoreFocusOut: true,
        value: email.split("@")[0],
      });
      if (name === undefined) return false;
    }

    const path = choice.action === "signup" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";
    const body = choice.action === "signup" ? { name: name || email.split("@")[0], email, password } : { email, password };

    return vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Signing in to CCCP…" },
      async () => {
        try {
          const response = await fetch(new URL(path, serverUrl()), {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const detail = await response
              .json()
              .then((payload: any) => payload?.message)
              .catch(() => undefined);
            vscode.window.showErrorMessage(detail || `Sign in failed (HTTP ${response.status}).`);
            return false;
          }

          const cookie = mergeCookies(undefined, setCookiesOf(response.headers));

          if (!hasSessionToken(cookie)) {
            vscode.window.showErrorMessage(
              "CCCP accepted the credentials but returned no session cookie. Check that cccp.serverUrl matches the deployment's own base URL.",
            );
            return false;
          }

          await this.secrets.store(SESSION_SECRET, cookie);
          const state = await this.refreshUser();
          this.fire(state);

          vscode.window.showInformationMessage(`Signed in to CCCP as ${state.user?.email ?? email}.`);
          return true;
        } catch (error) {
          vscode.window.showErrorMessage(
            `Could not reach CCCP at ${serverUrl()}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return false;
        }
      },
    );
  }

  async signOut(): Promise<void> {
    const cookie = await this.getCookieHeader();

    if (cookie) {
      // Best effort: let the server drop its side of the session too.
      await fetch(new URL("/api/auth/sign-out", serverUrl()), {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      }).catch(() => undefined);
    }

    await this.clear();
    this.fire(await this.state());
    vscode.window.showInformationMessage("Signed out of CCCP.");
  }

  /** Re-broadcasts state, e.g. after the user points the panel at a new server. */
  async notifyChanged(): Promise<void> {
    this.fire(await this.refreshUser());
  }
}
