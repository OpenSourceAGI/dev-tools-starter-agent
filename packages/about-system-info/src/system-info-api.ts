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
import https from "https";
import path from "path";
import type { SystemInfo, SystemInfoOptions } from "./systeminfo-types";
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
  ip: 5 * 60 * 1000,
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
 * Default IPInfo.io API token for geolocation
 */
const DEFAULT_IPINFO_TOKEN = "da2d6cc4baa5d1";

/**
 * Default network request timeout in milliseconds
 */
const DEFAULT_NETWORK_TIMEOUT = 5000;

/**
 * Represents a cached value with timestamp
 */
interface CacheEntry {
  value: any;
  timestamp: number;
}

/**
 * Cache storage structure
 */
interface Cache {
  [key: string]: CacheEntry;
}

/**
 * IP information from ipinfo.io API
 */
interface IPInfo {
  ip?: string;
  city?: string;
  hostname?: string;
  org?: string;
}

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
 * Fetches IP geolocation information from ipinfo.io API
 */
async function fetchIPInfo(
  token: string = DEFAULT_IPINFO_TOKEN,
  timeout: number = DEFAULT_NETWORK_TIMEOUT
): Promise<IPInfo> {
  return new Promise((resolve) => {
    const url = `https://ipinfo.io/json${token ? `?token=${token}` : ""}`;

    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({});
        }
      });
    });

    req.on("error", () => resolve({}));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve({});
    });
  });
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

/**
 * Get all system information as a clean JSON object
 */
export async function getSystemInfo(
  options: SystemInfoOptions = {}
): Promise<SystemInfo> {
  const cache = loadCache();
  const context: InfoContext = { cache };

  // Check if we need IP info
  // Some functions need IP info, so we fetch it once if needed by any function
  // For now we always try to fetch it if not cached, as ip/city/etc depend on it
  // Optimization: check if we actually need to run those functions based on options if provided
  // But current implementation fetches it always if missing from cache

  const cachedIPInfo = cache["ipInfo"]?.value;
  if (cachedIPInfo) {
    context.ipInfo = cachedIPInfo;
  } else {
    context.ipInfo = await fetchIPInfo();
    // Cache IP info itself
    cache["ipInfo"] = {
      value: context.ipInfo,
      timestamp: Date.now(),
    };
  }

  // Collect all system information
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

  // Call all info functions
  for (const [key, fn] of Object.entries(infoFunctions)) {
    try {
      // most functions are sync but some are async (ip related)
      const value = await fn(context);
      info[key as keyof SystemInfo] = value as any;
    } catch (error) {
      info[key as keyof SystemInfo] = "" as any;
    }
  }

  saveCache(cache);

  return info as SystemInfo;
}

export { loadCache, saveCache };
