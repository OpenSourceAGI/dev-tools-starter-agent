import { afterEach, describe, expect, it, vi } from "vitest";
import { errorResponse, forwardRequest, resolveProxyUrl, sanitizeHeaders } from "../src/apiProxy";

const BASE = "https://cccp.example.com";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveProxyUrl", () => {
  it("resolves a relative API path against the configured server", () => {
    expect(resolveProxyUrl(BASE, "/api/instances").toString()).toBe(`${BASE}/api/instances`);
  });

  it("keeps the query string", () => {
    expect(resolveProxyUrl(BASE, "/api/docker-search?query=nginx").toString()).toBe(
      `${BASE}/api/docker-search?query=nginx`,
    );
  });

  it("refuses an absolute URL, which would escape the configured server", () => {
    expect(() => resolveProxyUrl(BASE, "https://evil.example.com/steal")).toThrow(/non-relative/);
  });

  it("refuses a protocol-relative path pointing at another origin", () => {
    expect(() => resolveProxyUrl(BASE, "//evil.example.com/steal")).toThrow(/escapes/);
  });
});

describe("sanitizeHeaders", () => {
  it("passes the AWS routing headers the CCCP components set", () => {
    expect(sanitizeHeaders({ "x-aws-region": "us-east-1", "Content-Type": "application/json" })).toEqual({
      "x-aws-region": "us-east-1",
      "Content-Type": "application/json",
    });
  });

  it("strips headers the webview must not be able to forge", () => {
    expect(sanitizeHeaders({ Cookie: "session=stolen", AUTHORIZATION: "Bearer x", host: "evil" })).toEqual({});
  });

  it("tolerates no headers at all", () => {
    expect(sanitizeHeaders(undefined)).toEqual({});
  });
});

describe("forwardRequest", () => {
  it("attaches the session cookie and flattens the response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ instances: [] }), {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardRequest(
      { method: "GET", path: "/api/instances", headers: { "x-aws-region": "us-east-1" } },
      { baseUrl: BASE, cookieHeader: "better-auth.session_token=abc", timeoutMs: 5000 },
      new AbortController().signal,
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ instances: [] });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Cookie).toBe("better-auth.session_token=abc");
    expect((init.headers as Record<string, string>)["x-aws-region"]).toBe("us-east-1");
  });

  it("never hands Set-Cookie back to the webview, but does report it", async () => {
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("set-cookie", "better-auth.session_token=refreshed; Path=/");
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200, headers }));

    const seen: string[][] = [];
    const response = await forwardRequest(
      { method: "GET", path: "/api/credentials" },
      { baseUrl: BASE, timeoutMs: 5000, onSetCookies: (cookies) => void seen.push(cookies) },
      new AbortController().signal,
    );

    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(seen[0][0]).toContain("session_token=refreshed");
  });

  it("reports a timeout as a TimeoutError rather than a bare abort", async () => {
    vi.stubGlobal("fetch", (_url: URL, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    );

    await expect(
      forwardRequest(
        { method: "GET", path: "/api/instances" },
        { baseUrl: BASE, timeoutMs: 5 },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("propagates a caller's cancellation untouched", async () => {
    vi.stubGlobal("fetch", (_url: URL, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    );

    const controller = new AbortController();
    const pending = forwardRequest(
      { method: "GET", path: "/api/instances" },
      { baseUrl: BASE, timeoutMs: 5000 },
      controller.signal,
    );
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("errorResponse", () => {
  it("renders an unreachable server in the shape CCCP components parse", () => {
    const response = errorResponse(new Error("ECONNREFUSED"), BASE);

    expect(response.status).toBe(502);
    expect(JSON.parse(response.body).message).toContain(BASE);
    expect(JSON.parse(response.body).message).toContain("ECONNREFUSED");
  });

  it("names a timeout for what it is", () => {
    const timeout = new Error("No response");
    timeout.name = "TimeoutError";

    expect(JSON.parse(errorResponse(timeout, BASE).body).message).toContain("did not respond in time");
  });
});
