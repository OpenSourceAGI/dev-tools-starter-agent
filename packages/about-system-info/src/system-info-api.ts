/**
 * @fileoverview System Information API
 *
 * A comprehensive cross-platform system information collection API.
 * Provides clean JSON data without formatting, suitable for programmatic use.
 *
 * @module system-info-api
 * @author vtempest
 * @license rights.institute/prosper
 */

import os from "os";
import fs from "fs";
import { fetchIPInfo } from "./utils/network";
import type { IPInfo } from "./utils/network";
import path from "path";
import type { SystemInfo, SystemInfoOptions } from "./systeminfo-types";
import type { Cache } from "./cache/cache";
import { isCacheValid } from "./cache/cache";
import { CACHE_FILE } from "./info/settings"; // Using CACHE_FILE from settings to ensure consistency

// Import info functions from modules
import { user, hostname, os_info, kernel, device } from "./info/platform";
import { cpu, gpu, screen_resolution, bench, cpu_bench_info, gpu_bench, gpu_bench_info } from "./info/hardware";
import {
  disk_used,
  disk_size,
  ram_used,
  memory_available,
  swap_used,
  mount_points,
} from "./info/memory";
import { top_process, uptime, users_logged_in } from "./info/process";
import {
  ip,
  iplocal,
  city,
  domain,
  isp,
  network_interfaces,
  ports,
} from "./info/network";
import {
  services_running,
  temperature,
  battery,
  load_average,
} from "./info/system-status";
import { shell, packages, containers } from "./info/software";

/**
 * Cache duration configuration for different system information types
 * Values are in milliseconds
 */
const CACHE_DURATION = {
  ip: 10 * 60 * 1000,
  cpu: 24 * 60 * 60 * 1000,
  gpu: 24 * 60 * 60 * 1000,
  bench: 24 * 60 * 60 * 1000,
  cpu_bench_info: 24 * 60 * 60 * 1000,
  gpu_bench: 24 * 60 * 60 * 1000,
  gpu_bench_info: 24 * 60 * 60 * 1000,
  os: 24 * 60 * 60 * 1000,
  device: 24 * 60 * 60 * 1000,
  kernel: 60 * 60 * 1000,
  pacman: 10 * 60 * 1000,
  ports: 5 * 60 * 1000,
  containers: 5 * 60 * 1000,
  top_process: 5 * 1000,
  disk_used: 60 * 1000,
  disk_size: 60 * 1000,
  ram_used: 10 * 1000,
  services_running: 5 * 60 * 1000,
  temperature: 30 * 1000,
  battery: 60 * 1000,
  network_interfaces: 5 * 60 * 1000,
  mount_points: 10 * 60 * 1000,
};

/**
 * Platform detection constants
 */
const IS_WINDOWS = os.platform() === "win32";
const IS_MAC = os.platform() === "darwin";
const IS_LINUX = os.platform() === "linux";

/**
 * Context object passed to info collection functions
 */
interface InfoContext {
  cache: Cache;
  ipInfo?: IPInfo;
}

/**
 * Loads cache from disk
 */
function loadCache(): Cache {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch (error) {
    // Corrupted cache - return empty object
  }
  return {};
}

/**
 * Saves cache to disk
 */
function saveCache(cache: Cache): void {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    // Silently fail if can't write cache
  }
}

/**
 * System information collection functions map
 */
export const infoFunctions = {
  user,
  hostname,
  ip,
  iplocal,
  city,
  domain,
  isp,
  os: os_info, // Mapped from os_info
  cpu,
  gpu,
  bench,
  cpu_bench_info,
  gpu_bench,
  gpu_bench_info,
  disk_used,
  disk_size,
  ram_used,
  top_process,
  uptime,
  device,
  kernel,
  shell,
  pacman: packages, // Mapped from packages
  ports,
  containers,
  memory_available,
  swap_used,
  load_average,
  users_logged_in,
  network_interfaces,
  mount_points,
  services_running,
  temperature,
  battery,
  screen_resolution,
};

/** Blocks derived from the public IP lookup. */
const IP_BLOCKS = new Set(["ip", "city", "domain", "isp"]);

/** Lets pending I/O callbacks (keypresses, HTTP responses) run between blocks. */
const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Returns the cached public IP lookup, or fetches it when the cache entry is
 * older than 10 minutes. A failed fetch keeps the previous value and is still
 * timestamped, so an offline machine is not re-queried on every launch. An
 * aborted fetch leaves the cache untouched.
 */
async function getIPInfo(cache: Cache, signal?: AbortSignal): Promise<IPInfo> {
  const entry = cache["ipInfo"];
  if (entry && isCacheValid(entry, "ipInfo")) return entry.value || {};

  const fresh = await fetchIPInfo(undefined, undefined, signal);
  const value = fresh.ip ? fresh : entry?.value || {};
  if (!signal?.aborted) {
    cache["ipInfo"] = { value, timestamp: Date.now() };
  }
  return value;
}

/**
 * Get system information as a clean JSON object.
 *
 * `options.keys` limits collection to those blocks (all by default).
 * `options.signal` stops collection early: whatever was gathered before the
 * abort is returned, and the remaining blocks are left out.
 */
export async function getSystemInfo(
  options: SystemInfoOptions = {}
): Promise<SystemInfo> {
  const { keys, signal } = options;
  const cache = loadCache();
  const context: InfoContext = { cache };

  const wanted = Object.keys(infoFunctions).filter(
    (key) => !keys || keys.includes(key)
  );

  // Start the IP lookup first so it overlaps with the local blocks.
  const ipInfoPromise = wanted.some((key) => IP_BLOCKS.has(key))
    ? getIPInfo(cache, signal)
    : undefined;

  const collected: Record<string, unknown> = {};
  const run = async (key: string) => {
    try {
      collected[key] = await infoFunctions[key as keyof typeof infoFunctions](context);
    } catch {
      collected[key] = "";
    }
  };

  for (const key of wanted) {
    if (IP_BLOCKS.has(key)) continue;
    await yieldToEventLoop();
    if (signal?.aborted) break;
    await run(key);
  }

  // On abort the lookup resolves at once with whatever was cached.
  if (ipInfoPromise) {
    context.ipInfo = await ipInfoPromise;
    for (const key of wanted) {
      if (IP_BLOCKS.has(key)) await run(key);
    }
  }

  // Keep the infoFunctions key order regardless of collection order.
  const info: Partial<SystemInfo> = {
    timestamp: new Date().toISOString(),
    platform: IS_WINDOWS
      ? "windows"
      : IS_MAC
      ? "macos"
      : IS_LINUX
      ? "linux"
      : "unknown",
  };
  for (const key of wanted) {
    if (key in collected) info[key as keyof SystemInfo] = collected[key] as any;
  }

  saveCache(cache);

  return info as SystemInfo;
}

export { loadCache, saveCache };
