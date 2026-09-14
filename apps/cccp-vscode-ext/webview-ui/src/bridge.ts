import { vscodeApi } from "./vscodeApi";
import type { AuthState, InboundMessage, OutboundMessage, ProxyRequest, ProxyResponse } from "./protocol";

type Listener = (message: InboundMessage) => void;

/** Fan-out for messages from the extension host, plus a typed `post`. */
class ExtensionBridge {
  private readonly listeners = new Set<Listener>();

  constructor() {
    window.addEventListener("message", (event: MessageEvent<InboundMessage>) => {
      for (const listener of this.listeners) listener(event.data);
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  post(message: OutboundMessage): void {
    vscodeApi.post(message);
  }
}

export const bridge = new ExtensionBridge();

/** Surfaces a message as a native VS Code notification. */
export function notify(level: "info" | "warning" | "error", message: string): void {
  bridge.post({ type: "notify", level, message });
}

export function openExternal(url: string): void {
  bridge.post({ type: "openExternal", url });
}

export function requestSignIn(): void {
  bridge.post({ type: "signIn" });
}

export function requestSignOut(): void {
  bridge.post({ type: "signOut" });
}

export function requestServerUrlChange(): void {
  bridge.post({ type: "setServerUrl" });
}

export function onAuthState(listener: (state: AuthState) => void): () => void {
  return bridge.subscribe((message) => {
    if (message.type === "authState") listener(message);
  });
}

/** Announces that the panel is mounted and wants its first auth state. */
export function announceReady(): void {
  bridge.post({ type: "ready" });
}

let requestCounter = 0;

const pending = new Map<string, (response: ProxyResponse) => void>();

bridge.subscribe((message) => {
  if (message.type !== "apiResponse") return;
  pending.get(message.requestId)?.(message.response);
  pending.delete(message.requestId);
});

function send(request: ProxyRequest, signal: AbortSignal | null | undefined): Promise<ProxyResponse> {
  const requestId = `req-${++requestCounter}`;

  return new Promise<ProxyResponse>((resolve, reject) => {
    const settle = (response: ProxyResponse) => {
      signal?.removeEventListener("abort", onAbort);
      resolve(response);
    };

    function onAbort() {
      pending.delete(requestId);
      bridge.post({ type: "cancelRequest", requestId });
      reject(new DOMException("The request was aborted.", "AbortError"));
    }

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });
    pending.set(requestId, settle);
    bridge.post({ type: "apiRequest", requestId, request });
  });
}

/** Statuses whose `Response` must be constructed with a null body. */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

function headerRecord(init: HeadersInit | undefined): Record<string, string> {
  const record: Record<string, string> = {};
  new Headers(init).forEach((value, name) => {
    record[name] = value;
  });
  return record;
}

async function bodyText(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (body === null || body === undefined) return undefined;
  if (typeof body === "string") return body;
  // Covers FormData/Blob/URLSearchParams the same way the platform would.
  return new Response(body).text();
}

/**
 * Routes the CCCP components' `window.open(...)` calls -- "open Dokploy",
 * "open the instance", a Docker Hub or GitHub result -- to the user's real
 * browser. A webview can't open a window itself, so without this the buttons
 * would silently do nothing.
 */
export function installExternalLinkBridge(): void {
  globalThis.open = ((url?: string | URL) => {
    if (url) openExternal(String(url));
    return null;
  }) as typeof globalThis.open;

  // Plain `target="_blank"` anchors are inert in a webview for the same reason.
  document.addEventListener("click", (event) => {
    const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    event.preventDefault();
    openExternal(anchor.href);
  });
}

/**
 * Routes the CCCP components' relative `fetch("/api/...")` calls through the
 * extension host.
 *
 * This is what lets the Next.js dashboard's components be reused byte-for-byte:
 * they still believe they are running on the CCCP origin, while the host adds
 * the real base URL and the session cookie. Absolute URLs are left alone -- the
 * webview's CSP blocks them, which is the intent.
 */
export function installApiBridge(): void {
  const nativeFetch = globalThis.fetch?.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : undefined;
    const url = request ? request.url : String(input);

    if (!url.startsWith("/")) {
      if (!nativeFetch) throw new TypeError(`Cannot fetch ${url} from the CCCP panel.`);
      return nativeFetch(input as RequestInfo, init);
    }

    const proxied: ProxyRequest = {
      method: (init?.method ?? request?.method ?? "GET").toUpperCase(),
      path: url,
      headers: { ...headerRecord(request?.headers), ...headerRecord(init?.headers) },
      body: await bodyText(init?.body ?? (request ? await request.clone().text() : undefined)),
    };

    const response = await send(proxied, init?.signal ?? request?.signal);

    return new Response(NULL_BODY_STATUSES.has(response.status) ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
