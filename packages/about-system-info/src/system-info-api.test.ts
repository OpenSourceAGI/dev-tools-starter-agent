/**
 * @fileoverview Covers how getSystemInfo spends its time: only the requested
 * blocks run, an abort returns what was gathered so far, and the public IP
 * lookup hits the network at most once per 10 minutes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchIPInfo = vi.hoisted(() => vi.fn());
vi.mock("./utils/network", () => ({ fetchIPInfo }));

// Keep the on-disk cache in memory so tests don't touch the real temp file.
const disk = vi.hoisted(() => ({ cache: undefined as string | undefined }));
vi.mock("fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("fs")>();
  const fake = {
    ...real,
    existsSync: (p: string) =>
      String(p).endsWith("systeminfo-cache.json") ? disk.cache !== undefined : real.existsSync(p),
    readFileSync: (p: string, ...rest: any[]) =>
      String(p).endsWith("systeminfo-cache.json") ? disk.cache : (real.readFileSync as any)(p, ...rest),
    writeFileSync: (p: string, data: string) => {
      if (String(p).endsWith("systeminfo-cache.json")) disk.cache = data;
    },
    mkdirSync: () => undefined,
  };
  return { ...fake, default: fake };
});

import { getSystemInfo } from "./system-info-api";

const TEN_MINUTES = 10 * 60 * 1000;

beforeEach(() => {
  disk.cache = undefined;
  fetchIPInfo.mockResolvedValue({ ip: "203.0.113.7", city: "Oslo", org: "AS1 Example Net" });
});

afterEach(() => {
  fetchIPInfo.mockReset();
  vi.useRealTimers();
});

describe("getSystemInfo", () => {
  it("collects only the requested blocks", async () => {
    const info = await getSystemInfo({ keys: ["user", "hostname"] });

    expect(Object.keys(info).sort()).toEqual(["hostname", "platform", "timestamp", "user"]);
    expect(fetchIPInfo).not.toHaveBeenCalled();
  });

  it("derives ip, city and isp from one lookup", async () => {
    const info = await getSystemInfo({ keys: ["ip", "city", "isp"] });

    expect(info).toMatchObject({ ip: "203.0.113.7", city: "Oslo", isp: "Example Net" });
    expect(fetchIPInfo).toHaveBeenCalledTimes(1);
  });

  it("reuses the IP lookup for 10 minutes, then refreshes it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    await getSystemInfo({ keys: ["ip"] });
    vi.advanceTimersByTime(TEN_MINUTES - 1000);
    await getSystemInfo({ keys: ["ip"] });
    expect(fetchIPInfo).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    fetchIPInfo.mockResolvedValue({ ip: "198.51.100.9" });
    const info = await getSystemInfo({ keys: ["ip"] });
    expect(fetchIPInfo).toHaveBeenCalledTimes(2);
    expect(info.ip).toBe("198.51.100.9");
  });

  it("keeps the last good IP when a refresh fails, and waits 10 minutes to retry", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    await getSystemInfo({ keys: ["ip"] });
    vi.advanceTimersByTime(TEN_MINUTES + 1000);
    fetchIPInfo.mockResolvedValue({});

    expect((await getSystemInfo({ keys: ["ip"] })).ip).toBe("203.0.113.7");
    await getSystemInfo({ keys: ["ip"] });
    expect(fetchIPInfo).toHaveBeenCalledTimes(2);
  });

  it("returns no blocks when aborted before starting", async () => {
    const controller = new AbortController();
    controller.abort();

    const info = await getSystemInfo({ keys: ["user", "hostname", "cpu"], signal: controller.signal });

    expect(Object.keys(info).sort()).toEqual(["platform", "timestamp"]);
  });

  it("stops at the abort and returns what was gathered", async () => {
    const controller = new AbortController();
    const pending = getSystemInfo({ keys: ["user", "hostname", "cpu", "kernel"], signal: controller.signal });
    // Blocks yield to the event loop between each other; abort after the first.
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();

    const info = await pending;
    expect(info.user).toBeDefined();
    expect(info.kernel).toBeUndefined();
  });
});
