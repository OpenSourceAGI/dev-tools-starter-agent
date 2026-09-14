import { setCookiesOf } from "./cookies";

/**
 * Forwards the webview's `fetch("/api/...")` calls to the configured CCCP
 * deployment.
 *
 * The panel reuses the Next.js app's own React components unchanged, so it
 * issues exactly the same relative-path requests the browser dashboard does.
 * Those can't be made from a `vscode-webview://` origin -- there is no server to
 * be relative to, and the session cookie deliberately never leaves the extension
 * host -- so every request is relayed through here instead, gaining an absolute
 * URL and the `Cookie` header on the way.
 */

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

/** Header names the webview is never allowed to set on a proxied request. */
const BLOCKED_REQUEST_HEADERS = new Set(["cookie", "authorization", "host"]);

/** Only relative CCCP API paths may be proxied -- never an arbitrary URL. */
export function resolveProxyUrl(baseUrl: string, path: string): URL {
  if (!path.startsWith("/")) {
    throw new Error(`Refusing to proxy a non-relative path: ${path}`);
  }

  const url = new URL(path, baseUrl);
  const base = new URL(baseUrl);

  if (url.origin !== base.origin) {
    throw new Error(`Refusing to proxy a request that escapes ${base.origin}`);
  }

  return url;
}

/** Drops headers the webview must not control, keeping the rest verbatim. */
export function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers ?? {})) {
    if (!BLOCKED_REQUEST_HEADERS.has(name.toLowerCase())) {
      result[name] = value;
    }
  }

  return result;
}

/**
 * `AbortSignal.any` only landed in Node 20, and VS Code 1.85 still bundles
 * Node 18, so the timeout and the caller's cancellation are combined by hand.
 */
function anySignal(signals: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}

export interface ForwardOptions {
  baseUrl: string;
  cookieHeader?: string;
  timeoutMs: number;
  /** Called with any `Set-Cookie` the server returned, so the session can be refreshed. */
  onSetCookies?: (setCookies: string[]) => void | Promise<void>;
}

/** Performs one proxied request and flattens the response for `postMessage`. */
export async function forwardRequest(
  request: ProxyRequest,
  options: ForwardOptions,
  signal: AbortSignal,
): Promise<ProxyResponse> {
  const url = resolveProxyUrl(options.baseUrl, request.path);

  const headers = sanitizeHeaders(request.headers);
  headers["Accept"] = headers["Accept"] ?? "application/json";
  if (options.cookieHeader) headers["Cookie"] = options.cookieHeader;

  const timeout = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeout.abort();
  }, options.timeoutMs);

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body,
      signal: anySignal([signal, timeout.signal]),
      redirect: "follow",
    });

    const setCookies = setCookiesOf(response.headers);
    if (setCookies.length > 0) await options.onSetCookies?.(setCookies);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      // Set-Cookie stays on this side of the bridge -- the webview has no use
      // for it and must not be able to read the session token.
      if (name.toLowerCase() !== "set-cookie") responseHeaders[name] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: await response.text(),
    };
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error(`No response within ${options.timeoutMs}ms`);
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Turns a transport failure into the JSON error shape CCCP's components expect. */
export function errorResponse(error: unknown, baseUrl: string): ProxyResponse {
  const reason = error instanceof Error ? error.message : String(error);
  const message =
    error instanceof Error && error.name === "TimeoutError"
      ? `The CCCP server at ${baseUrl} did not respond in time.`
      : `Could not reach the CCCP server at ${baseUrl}: ${reason}`;

  return {
    status: 502,
    statusText: "Bad Gateway",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  };
}
