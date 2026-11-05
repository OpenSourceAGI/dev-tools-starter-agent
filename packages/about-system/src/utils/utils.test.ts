/**
 * @fileoverview Covers the shell and network helpers every info module is
 * built on. Both are written to never throw — `about-system` prints a partial
 * readout rather than crashing when a tool is missing or the network is down —
 * so the failure paths are the point of these tests.
 */

import { EventEmitter } from "events";
import { afterEach, describe, expect, it, vi } from "vitest";

// `command.ts` binds `execSync` as a named ESM import, so spying on the
// child_process namespace object would not reach it — the module has to be
// mocked outright.
const execSync = vi.hoisted(() => vi.fn());
vi.mock("child_process", () => ({
  execSync,
  default: { execSync },
}));

const httpsGet = vi.hoisted(() => vi.fn());
vi.mock("https", () => ({
  get: httpsGet,
  default: { get: httpsGet },
}));
const httpGet = vi.hoisted(() => vi.fn());
vi.mock("http", () => ({
  get: httpGet,
  default: { get: httpGet },
}));

import { commandExists, execCommand } from "./command";
import { IS_LINUX, IS_MAC, IS_WINDOWS } from "./platform";
import { fetchIPInfo, fetchFromIPInfo, fetchFromIPAPI } from "./network";
import { DEFAULT_IPINFO_TOKEN, DEFAULT_NETWORK_TIMEOUT } from "../cache/cache-config";

afterEach(() => {
  execSync.mockReset();
  httpsGet.mockReset();
  httpGet.mockReset();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("platform flags", () => {
  it("identifies exactly one platform", () => {
    expect([IS_WINDOWS, IS_MAC, IS_LINUX].filter(Boolean).length).toBeLessThanOrEqual(1);
  });

  it("agrees with the running platform", () => {
    expect(IS_LINUX).toBe(process.platform === "linux");
    expect(IS_MAC).toBe(process.platform === "darwin");
    expect(IS_WINDOWS).toBe(process.platform === "win32");
  });
});

describe("execCommand", () => {
  it("returns the command's trimmed output", () => {
    execSync.mockReturnValue("  hello \n");
    expect(execCommand("echo hello")).toBe("hello");
  });

  it("returns an empty string instead of throwing when the command fails", () => {
    execSync.mockImplementation(() => {
      throw new Error("command not found");
    });
    expect(execCommand("nope")).toBe("");
  });

  it("never waits forever on a hung command", () => {
    execSync.mockReturnValue("");
    execCommand("sleep 999");

    expect(execSync.mock.calls[0][1]).toMatchObject({ timeout: 10_000 });
  });

  it("discards the command's stderr so it cannot corrupt the readout", () => {
    execSync.mockReturnValue("");
    execCommand("noisy");

    expect((execSync.mock.calls[0][1] as { stdio: string[] }).stdio).toEqual([
      "pipe",
      "pipe",
      "ignore",
    ]);
  });

  it("lets the caller override the default options", () => {
    execSync.mockReturnValue("");
    execCommand("slow", { timeout: 100 });

    expect(execSync.mock.calls[0][1]).toMatchObject({ timeout: 100 });
  });

  it("handles a Buffer result from execSync", () => {
    execSync.mockReturnValue(Buffer.from(" buffered \n"));
    expect(execCommand("x")).toBe("buffered");
  });
});

describe("commandExists", () => {
  it("reports a command that resolves", () => {
    execSync.mockReturnValue("");
    expect(commandExists("node")).toBe(true);
  });

  it("reports a command that does not resolve", () => {
    execSync.mockImplementation(() => {
      throw new Error("not found");
    });
    expect(commandExists("definitely-not-a-real-command")).toBe(false);
  });

  it("looks the command up with the platform's own resolver", () => {
    execSync.mockReturnValue("");
    commandExists("git");

    expect(execSync.mock.calls[0][0]).toBe(IS_WINDOWS ? "where git" : "which git");
  });

  it("silences the resolver's own output", () => {
    execSync.mockReturnValue("");
    commandExists("git");

    expect(execSync.mock.calls[0][1]).toMatchObject({ stdio: "ignore" });
  });
});

type FakeReq = EventEmitter & { destroy: () => void };

/**
 * A fake `get` (https or http) whose response a test controls. `behavior`
 * runs on the next microtask; leave it empty to simulate a hung request.
 */
function stubGet(
  get: typeof httpsGet,
  behavior: (req: FakeReq, onResponse: (res: EventEmitter) => void) => void = () => {},
) {
  get.mockImplementation((_url: string, callback: (res: EventEmitter) => void) => {
    const req: FakeReq = Object.assign(new EventEmitter(), { destroy: vi.fn() });
    queueMicrotask(() => behavior(req, callback));
    return req;
  });
  return get;
}

/** Emits a complete response body on the next tick. */
const respondWith = (get: typeof httpsGet, body: string) =>
  stubGet(get, (_req, onResponse) => {
    const res = new EventEmitter();
    onResponse(res);
    res.emit("data", body);
    res.emit("end");
  });

describe("fetchFromIPInfo", () => {
  it("parses the ipinfo.io lite payload", async () => {
    respondWith(httpsGet, JSON.stringify({ ip: "1.2.3.4", asn: "AS123", as_name: "Test ISP", country: "US" }));

    await expect(fetchFromIPInfo()).resolves.toEqual({
      ip: "1.2.3.4",
      org: "AS123 Test ISP",
    });
  });

  it("asks about this machine, not a fixed address", async () => {
    const get = respondWith(httpsGet, "{}");
    await fetchFromIPInfo();

    expect(get.mock.calls[0][0]).toBe(
      `https://api.ipinfo.io/lite/me?token=${DEFAULT_IPINFO_TOKEN}`,
    );
  });

  it("resolves empty rather than rejecting on a malformed body", async () => {
    respondWith(httpsGet, "<html>gateway error</html>");
    await expect(fetchFromIPInfo()).resolves.toEqual({});
  });

  it("resolves empty rather than rejecting when the request errors", async () => {
    stubGet(httpsGet, (req) => req.emit("error", new Error("ENOTFOUND")));
    await expect(fetchFromIPInfo()).resolves.toEqual({});
  });

  it("gives up after a hard 3 second deadline by default", async () => {
    vi.useFakeTimers();
    stubGet(httpsGet);
    let done = false;
    const pending = fetchFromIPInfo().then((r) => ((done = true), r));

    await vi.advanceTimersByTimeAsync(DEFAULT_NETWORK_TIMEOUT - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({});
    expect(DEFAULT_NETWORK_TIMEOUT).toBe(3000);
    expect(httpsGet.mock.results[0].value.destroy).toHaveBeenCalled();
  });

  it("abandons the request when the signal aborts", async () => {
    stubGet(httpsGet);
    const controller = new AbortController();
    const pending = fetchFromIPInfo(DEFAULT_IPINFO_TOKEN, 60_000, controller.signal);

    controller.abort();
    await expect(pending).resolves.toEqual({});
    expect(httpsGet.mock.results[0].value.destroy).toHaveBeenCalled();
  });
});

describe("fetchFromIPAPI", () => {
  it("parses the ip-api.com payload", async () => {
    respondWith(httpGet, JSON.stringify({
      status: "success",
      query: "1.2.3.4",
      city: "San Francisco",
      isp: "Test ISP",
      org: "AS123 Test Organization",
      as: "AS123 Test AS"
    }));

    await expect(fetchFromIPAPI()).resolves.toEqual({
      ip: "1.2.3.4",
      city: "San Francisco",
      org: "AS123 Test Organization",
    });
  });

  it("uses plain http, which is all ip-api.com's free tier serves", async () => {
    const get = respondWith(httpGet, '{"status":"success"}');
    await fetchFromIPAPI();

    expect(get.mock.calls[0][0]).toBe(
      "http://ip-api.com/json/?fields=status,message,query,city,isp,org,as"
    );
    expect(httpsGet).not.toHaveBeenCalled();
  });

  it("returns empty object on failed status", async () => {
    respondWith(httpGet, JSON.stringify({ status: "fail", message: "private range" }));
    await expect(fetchFromIPAPI()).resolves.toEqual({});
  });

  it("resolves empty rather than rejecting on a malformed body", async () => {
    respondWith(httpGet, "<html>gateway error</html>");
    await expect(fetchFromIPAPI()).resolves.toEqual({});
  });
});

describe("fetchIPInfo", () => {
  it("prefers ipinfo per field and fills gaps from ip-api", async () => {
    respondWith(httpsGet, JSON.stringify({ ip: "1.2.3.4", asn: "AS123", as_name: "Primary ISP" }));
    respondWith(httpGet, JSON.stringify({ status: "success", query: "5.6.7.8", city: "New York", org: "AS456 Other" }));

    await expect(fetchIPInfo()).resolves.toEqual({
      ip: "1.2.3.4",
      city: "New York",
      org: "AS123 Primary ISP",
    });
  });

  it("prefers an IPv4 address over ipinfo's IPv6 one", async () => {
    respondWith(httpsGet, JSON.stringify({ ip: "2600:1010::1", asn: "AS123", as_name: "Primary ISP" }));
    respondWith(httpGet, JSON.stringify({ status: "success", query: "5.6.7.8", city: "New York" }));

    await expect(fetchIPInfo()).resolves.toMatchObject({ ip: "5.6.7.8" });
  });

  it("falls back to ip-api when ipinfo fails", async () => {
    stubGet(httpsGet, (req) => req.emit("error", new Error("ECONNRESET")));
    respondWith(httpGet, JSON.stringify({ status: "success", query: "5.6.7.8", city: "New York", org: "AS456 Fallback ISP" }));

    await expect(fetchIPInfo()).resolves.toEqual({
      ip: "5.6.7.8",
      city: "New York",
      org: "AS456 Fallback ISP",
    });
  });

  it("returns empty when both fail", async () => {
    stubGet(httpsGet, (req) => req.emit("error", new Error("ENOTFOUND")));
    stubGet(httpGet, (req) => req.emit("error", new Error("ENOTFOUND")));

    await expect(fetchIPInfo()).resolves.toEqual({});
  });

  it("never waits past the shared deadline when both hang", async () => {
    vi.useFakeTimers();
    stubGet(httpsGet);
    stubGet(httpGet);
    const pending = fetchIPInfo();

    await vi.advanceTimersByTimeAsync(DEFAULT_NETWORK_TIMEOUT);
    await expect(pending).resolves.toEqual({});
  });
});
