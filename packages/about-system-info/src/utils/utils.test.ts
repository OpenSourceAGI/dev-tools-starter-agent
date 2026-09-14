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

import { commandExists, execCommand } from "./command";
import { IS_LINUX, IS_MAC, IS_WINDOWS } from "./platform";
import { fetchIPInfo } from "./network";
import { DEFAULT_IPINFO_TOKEN } from "../cache/cache-config";

afterEach(() => {
  execSync.mockReset();
  httpsGet.mockReset();
  vi.restoreAllMocks();
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

/** A fake `https.get` whose response body and failure mode a test controls. */
function stubHttpsGet(behavior: (req: EventEmitter & { setTimeout: (ms: number, fn: () => void) => void; destroy: () => void }, onResponse: (res: EventEmitter) => void) => void) {
  httpsGet.mockImplementation(
    (_url: string, callback: (res: EventEmitter) => void) => {
      const req = Object.assign(new EventEmitter(), {
        setTimeout: vi.fn(),
        destroy: vi.fn(),
      });
      queueMicrotask(() => behavior(req, callback));
      return req;
    },
  );
  return httpsGet;
}

/** Emits a complete response body on the next tick. */
const respondWith = (body: string) =>
  stubHttpsGet((_req, onResponse) => {
    const res = new EventEmitter();
    onResponse(res);
    res.emit("data", body);
    res.emit("end");
  });

describe("fetchIPInfo", () => {
  it("parses the ipinfo.io payload", async () => {
    respondWith(JSON.stringify({ ip: "1.2.3.4", city: "San Francisco" }));

    await expect(fetchIPInfo()).resolves.toEqual({
      ip: "1.2.3.4",
      city: "San Francisco",
    });
  });

  it("sends the default token when none is given", async () => {
    const get = respondWith("{}");
    await fetchIPInfo();

    expect(get.mock.calls[0][0]).toBe(
      `https://ipinfo.io/json?token=${DEFAULT_IPINFO_TOKEN}`,
    );
  });

  it("sends a caller-supplied token", async () => {
    const get = respondWith("{}");
    await fetchIPInfo("my-token");

    expect(get.mock.calls[0][0]).toContain("token=my-token");
  });

  it("omits the query string entirely for an empty token", async () => {
    const get = respondWith("{}");
    await fetchIPInfo("");

    expect(get.mock.calls[0][0]).toBe("https://ipinfo.io/json");
  });

  it("reassembles a body that arrives in chunks", async () => {
    stubHttpsGet((_req, onResponse) => {
      const res = new EventEmitter();
      onResponse(res);
      res.emit("data", '{"ip":"1.2');
      res.emit("data", '.3.4"}');
      res.emit("end");
    });

    await expect(fetchIPInfo()).resolves.toEqual({ ip: "1.2.3.4" });
  });

  it("resolves empty rather than rejecting on a malformed body", async () => {
    respondWith("<html>gateway error</html>");
    await expect(fetchIPInfo()).resolves.toEqual({});
  });

  it("resolves empty rather than rejecting when the request errors", async () => {
    stubHttpsGet((req) => req.emit("error", new Error("ENOTFOUND")));
    await expect(fetchIPInfo()).resolves.toEqual({});
  });

  it("arms a timeout that abandons the request", async () => {
    let armed: { ms: number; fire: () => void } | undefined;
    httpsGet.mockImplementation(() => {
      const req = Object.assign(new EventEmitter(), {
        setTimeout: (ms: number, fire: () => void) => {
          armed = { ms, fire };
        },
        destroy: vi.fn(),
      });
      return req;
    });

    const pending = fetchIPInfo("t", 1234);
    expect(armed?.ms).toBe(1234);

    armed?.fire();
    await expect(pending).resolves.toEqual({});
  });
});
