// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutboundMessage, ProxyResponse } from "../webview-ui/src/protocol";

/**
 * The webview's half of the API bridge. It is what lets the CCCP dashboard's
 * components be reused unchanged: they keep calling `fetch("/api/...")` as if
 * they were served by Next.js, and this turns each call into a request the
 * extension host performs.
 */

const posted: OutboundMessage[] = [];

/**
 * Waits for the patched `fetch` to post its request -- it reads the body
 * asynchronously first -- then replies the way the extension host would.
 */
async function respond(response: Partial<ProxyResponse> = {}): Promise<void> {
  let request: OutboundMessage | undefined;

  for (let attempt = 0; attempt < 20 && !request; attempt++) {
    request = posted.filter((message) => message.type === "apiRequest").at(-1);
    if (!request) await Promise.resolve();
  }

  if (request?.type !== "apiRequest") throw new Error("no request was posted");

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "apiResponse",
        requestId: request.requestId,
        response: { status: 200, statusText: "OK", headers: {}, body: "{}", ...response },
      },
    }),
  );
}

async function loadBridge() {
  vi.stubGlobal("acquireVsCodeApi", () => ({
    postMessage: (message: OutboundMessage) => void posted.push(message),
    getState: () => undefined,
    setState: () => undefined,
  }));

  vi.resetModules();
  return import("../webview-ui/src/bridge");
}

beforeEach(() => {
  posted.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("installApiBridge", () => {
  it("relays a relative CCCP API call to the extension host", async () => {
    const { installApiBridge } = await loadBridge();
    installApiBridge();

    const pending = fetch("/api/instances", {
      method: "GET",
      headers: { "x-aws-region": "us-east-1" },
    });

    await respond({ body: JSON.stringify({ instances: [] }) });

    const response = await pending;
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({ instances: [] });

    const sent = posted.at(-1);
    expect(sent).toMatchObject({
      type: "apiRequest",
      request: { method: "GET", path: "/api/instances", headers: { "x-aws-region": "us-east-1" } },
    });
  });

  it("forwards the JSON body of a POST", async () => {
    const { installApiBridge } = await loadBridge();
    installApiBridge();

    const pending = fetch("/api/credentials", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region: "eu-west-1" }),
    });
    await respond();
    await pending;

    const sent = posted.at(-1);
    expect(sent).toMatchObject({ type: "apiRequest" });
    if (sent?.type !== "apiRequest") throw new Error("unreachable");
    expect(sent.request.method).toBe("POST");
    expect(JSON.parse(sent.request.body!)).toEqual({ region: "eu-west-1" });
  });

  it("preserves a non-ok status so the components' error paths still run", async () => {
    const { installApiBridge } = await loadBridge();
    installApiBridge();

    const pending = fetch("/api/instances");
    await respond({ status: 502, statusText: "Bad Gateway", body: JSON.stringify({ message: "unreachable" }) });

    const response = await pending;
    expect(response.ok).toBe(false);
    expect(response.status).toBe(502);
    expect((await response.json()).message).toBe("unreachable");
  });

  it("builds a bodyless Response for statuses that forbid one", async () => {
    const { installApiBridge } = await loadBridge();
    installApiBridge();

    const pending = fetch("/api/instances", { method: "DELETE" });
    await respond({ status: 204, statusText: "No Content", body: "" });

    await expect(pending).resolves.toMatchObject({ status: 204 });
  });

  it("cancels the host request when the caller aborts", async () => {
    const { installApiBridge } = await loadBridge();
    installApiBridge();

    const controller = new AbortController();
    const pending = fetch("/api/instances/all-regions", { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(posted.at(-1)).toMatchObject({ type: "cancelRequest" });
  });

  it("leaves absolute URLs to the platform, where the CSP can reject them", async () => {
    const nativeFetch = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", nativeFetch);

    const { installApiBridge } = await loadBridge();
    installApiBridge();

    await fetch("https://example.com/thing");

    expect(nativeFetch).toHaveBeenCalledOnce();
    expect(posted.filter((message) => message.type === "apiRequest")).toHaveLength(0);
  });
});

describe("installExternalLinkBridge", () => {
  it("sends window.open through the host so a real browser handles it", async () => {
    const { installExternalLinkBridge } = await loadBridge();
    installExternalLinkBridge();

    window.open("http://203.0.113.10:3000", "_blank");

    expect(posted.at(-1)).toEqual({ type: "openExternal", url: "http://203.0.113.10:3000" });
  });

  it("does the same for a clicked link, which a webview would otherwise ignore", async () => {
    const { installExternalLinkBridge } = await loadBridge();
    installExternalLinkBridge();

    document.body.innerHTML = '<a href="https://hub.docker.com/_/nginx">nginx</a>';
    document.querySelector("a")!.click();

    expect(posted.at(-1)).toEqual({ type: "openExternal", url: "https://hub.docker.com/_/nginx" });
  });

  it("leaves in-page anchors alone", async () => {
    const { installExternalLinkBridge } = await loadBridge();
    installExternalLinkBridge();

    document.body.innerHTML = '<a href="#section">jump</a>';
    document.querySelector("a")!.click();

    expect(posted.filter((message) => message.type === "openExternal")).toHaveLength(0);
  });
});

describe("readBootstrap", () => {
  it("reads the config the extension host injected", async () => {
    document.body.innerHTML =
      '<script type="application/json" id="cccp-bootstrap">{"serverUrl":"https://cccp.example.com","followVsCodeTheme":false}</script>';

    const { readBootstrap } = await import("../webview-ui/src/protocol");
    expect(readBootstrap()).toEqual({ serverUrl: "https://cccp.example.com", followVsCodeTheme: false });
  });

  it("falls back to safe defaults when the payload is unreadable", async () => {
    document.body.innerHTML = '<script type="application/json" id="cccp-bootstrap">not json</script>';

    const { readBootstrap } = await import("../webview-ui/src/protocol");
    expect(readBootstrap()).toEqual({ serverUrl: "", followVsCodeTheme: true });
  });
});
