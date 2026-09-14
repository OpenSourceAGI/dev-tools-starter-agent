/**
 * @fileoverview Covers the on-disk cache that keeps `about-system` fast: most
 * of the facts it reports are expensive to collect (shelling out to `wmic`,
 * `sw_vers`, `lspci`) and change rarely, so a stale-but-valid entry is the
 * difference between an instant readout and a multi-second one.
 *
 * The behaviours worth pinning are the ones that decide whether a user sees
 * anything at all: a corrupt cache file must not throw, an unwritable temp
 * directory must not throw, and an expired entry must never be served.
 */

import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Cache,
  getCachedValue,
  isCacheValid,
  loadCache,
  saveCache,
  setCachedValue,
} from "./cache";
import { CACHE_DURATION, CACHE_FILE } from "./cache-config";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadCache", () => {
  it("returns an empty cache when no file exists yet", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(loadCache()).toEqual({});
  });

  it("reads a previously saved cache back", () => {
    const stored: Cache = { cpu: { value: "M2 Pro", timestamp: 123 } };
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(stored));

    expect(loadCache()).toEqual(stored);
  });

  it("reads from the temp-directory cache file", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const read = vi.spyOn(fs, "readFileSync").mockReturnValue("{}");

    loadCache();

    expect(read).toHaveBeenCalledWith(CACHE_FILE, "utf8");
  });

  it("recovers from a corrupt cache file rather than throwing", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("{ not json");

    expect(loadCache()).toEqual({});
  });

  it("recovers from an unreadable cache file", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("EACCES");
    });

    expect(loadCache()).toEqual({});
  });
});

describe("saveCache", () => {
  it("writes the cache as readable json", () => {
    const write = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    const cache: Cache = { cpu: { value: "M2 Pro", timestamp: 1 } };

    saveCache(cache);

    expect(write).toHaveBeenCalledWith(
      CACHE_FILE,
      JSON.stringify(cache, null, 2),
    );
  });

  it("stays silent when the cache file cannot be written", () => {
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("EROFS");
    });

    expect(() => saveCache({})).not.toThrow();
  });
});

describe("isCacheValid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts an entry written just now", () => {
    expect(isCacheValid({ value: "x", timestamp: Date.now() }, "cpu")).toBe(true);
  });

  it("rejects an entry older than its key's duration", () => {
    const timestamp = Date.now() - CACHE_DURATION.ram_used - 1;
    expect(isCacheValid({ value: "x", timestamp }, "ram_used")).toBe(false);
  });

  it("uses each key's own duration, not one global one", () => {
    // A minute-old entry is stale for RAM (10s) but fresh for the CPU (24h).
    const timestamp = Date.now() - 60_000;
    expect(isCacheValid({ value: "x", timestamp }, "ram_used")).toBe(false);
    expect(isCacheValid({ value: "x", timestamp }, "cpu")).toBe(true);
  });

  it("falls back to a one-minute window for an unknown key", () => {
    expect(
      isCacheValid({ value: "x", timestamp: Date.now() - 59_000 }, "unknown"),
    ).toBe(true);
    expect(
      isCacheValid({ value: "x", timestamp: Date.now() - 61_000 }, "unknown"),
    ).toBe(false);
  });

  it.each([
    [undefined, "missing"],
    [null, "null"],
    [{ value: "x" }, "timestamp-less"],
    [{ value: "x", timestamp: 0 }, "zero-timestamped"],
  ])("rejects a %s entry", (entry) => {
    expect(isCacheValid(entry as never, "cpu")).toBe(false);
  });
});

describe("getCachedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for a key that was never cached", () => {
    expect(getCachedValue({}, "cpu")).toBeNull();
  });

  it("returns a fresh value", () => {
    const cache: Cache = { cpu: { value: "M2 Pro", timestamp: Date.now() } };
    expect(getCachedValue(cache, "cpu")).toBe("M2 Pro");
  });

  it("returns a cached falsy value rather than mistaking it for a miss", () => {
    const cache: Cache = { battery: { value: 0, timestamp: Date.now() } };
    expect(getCachedValue(cache, "battery")).toBe(0);
  });

  it("returns null for an expired value", () => {
    const cache: Cache = {
      ram_used: { value: "8 GB", timestamp: Date.now() - 60_000 },
    };
    expect(getCachedValue(cache, "ram_used")).toBeNull();
  });

  it("evicts an expired entry so it is not re-checked", () => {
    const cache: Cache = {
      ram_used: { value: "8 GB", timestamp: Date.now() - 60_000 },
    };

    getCachedValue(cache, "ram_used");

    expect(cache).not.toHaveProperty("ram_used");
  });

  it("keeps a fresh entry in place", () => {
    const cache: Cache = { cpu: { value: "M2 Pro", timestamp: Date.now() } };
    getCachedValue(cache, "cpu");
    expect(cache).toHaveProperty("cpu");
  });
});

describe("setCachedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stamps the value with the time it was cached", () => {
    const cache: Cache = {};
    setCachedValue(cache, "cpu", "M2 Pro");

    expect(cache.cpu).toEqual({ value: "M2 Pro", timestamp: 1_000_000 });
  });

  it("round-trips through getCachedValue", () => {
    const cache: Cache = {};
    setCachedValue(cache, "cpu", "M2 Pro");
    expect(getCachedValue(cache, "cpu")).toBe("M2 Pro");
  });

  it("replaces an existing entry and refreshes its timestamp", () => {
    const cache: Cache = { cpu: { value: "old", timestamp: 1 } };
    setCachedValue(cache, "cpu", "new");

    expect(cache.cpu).toEqual({ value: "new", timestamp: 1_000_000 });
  });

  it("stores structured values, not just strings", () => {
    const cache: Cache = {};
    setCachedValue(cache, "network_interfaces", [{ name: "en0" }]);

    expect(getCachedValue(cache, "network_interfaces")).toEqual([
      { name: "en0" },
    ]);
  });
});

describe("CACHE_DURATION", () => {
  it("gives every cached key a positive window", () => {
    for (const [key, duration] of Object.entries(CACHE_DURATION)) {
      expect(duration, key).toBeGreaterThan(0);
    }
  });

  it("caches volatile readings for less time than fixed hardware facts", () => {
    expect(CACHE_DURATION.ram_used).toBeLessThan(CACHE_DURATION.cpu);
    expect(CACHE_DURATION.top_process).toBeLessThan(CACHE_DURATION.os);
  });
});
