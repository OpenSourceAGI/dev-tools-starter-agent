/**
 * Platform-related system information functions
 * @module info/platform
 */

import os from "os";
import fs from "fs";
import type { InfoContext } from "../types/internal-types";
import { IS_WINDOWS, IS_MAC, IS_LINUX } from "../utils/platform";
import { execCommand, commandExists } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";

/**
 * Gets the current username
 * @returns Current system username
 */
export function user(): string {
  return os.userInfo().username;
}

/**
 * Gets the system hostname
 * @returns Computer hostname/network name
 */
export function hostname(): string {
  return os.hostname();
}

/**
 * Gets operating system name and version
 * Platform-specific detection for Windows, macOS, and Linux
 * @param context - Info context with cache
 * @returns OS name and version string
 * @example "Windows 11 Pro", "macOS Ventura 13.2.1", "Ubuntu 22.04.3 LTS"
 */
export function os_info(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "os");
  if (cached) return cached;

  const platform = os.platform();
  const release = os.release();
  let osName = "";

  if (IS_WINDOWS) {
    try {
      const version = execCommand("ver");
      const match = version.match(/Microsoft Windows \[Version ([^\]]+)\]/);
      osName = match ? `Windows ${match[1]}` : `Windows ${release}`;
    } catch {
      osName = `Windows ${release}`;
    }
  } else if (IS_MAC) {
    const productName = execCommand("sw_vers -productName");
    const productVersion = execCommand("sw_vers -productVersion");
    osName =
      productName && productVersion
        ? `${productName} ${productVersion}`
        : `macOS ${release}`;
  } else if (IS_LINUX) {
    try {
      const osRelease = fs.readFileSync("/etc/os-release", "utf8");
      const nameMatch = osRelease.match(/^NAME="([^"]+)"/m);
      const versionMatch = osRelease.match(/^VERSION_ID="([^"]+)"/m);
      osName = nameMatch ? nameMatch[1] : "Linux";
      if (versionMatch) osName += ` ${versionMatch[1]}`;
    } catch {
      osName = `Linux ${release}`;
    }
  } else {
    osName = `${platform} ${release}`;
  }

  setCachedValue(context.cache, "os", osName);
  return osName;
}

/**
 * Gets kernel version string
 * Returns the operating system kernel version from os.release()
 * @param context - Info context with cache
 * @returns Kernel version string
 * @example "5.15.0-56-generic", "6.11.11-valve12-1-neptune"
 */
export function kernel(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "kernel");
  if (cached) return cached;

  const kernel = os.release();
  setCachedValue(context.cache, "kernel", kernel);
  return kernel;
}

/**
 * Gets device or computer model name
 * Uses WMI on Windows, DMI on Linux, getprop on Android
 * @param context - Info context with cache
 * @returns Device model name or empty string
 * @example "Dell OptiPlex 7090", "MacBook Pro 16-inch", "Valve Steam Deck"
 */
export function device(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "device");
  if (cached !== null) return cached;

  if (IS_WINDOWS) {
    try {
      const wmic = execCommand("wmic csproduct get name /format:list");
      const nameMatch = wmic.match(/Name=(.+)/);
      if (nameMatch) {
        const device = nameMatch[1].trim();
        if (device && device !== "") {
          setCachedValue(context.cache, "device", device);
          return device;
        }
      }
    } catch {}

    try {
      const ps = execCommand(
        'powershell.exe -Command "Get-WmiObject -Class Win32_ComputerSystem | Select-Object -ExpandProperty Model"'
      );
      if (ps.trim()) {
        const device = ps.trim();
        setCachedValue(context.cache, "device", device);
        return device;
      }
    } catch {}
  } else if (IS_MAC) {
    const profile = execCommand("system_profiler SPHardwareDataType");
    const nameMatch = profile.match(/Model Name:\s*(.+)/);
    if (nameMatch) {
      const device = nameMatch[1].trim();
      setCachedValue(context.cache, "device", device);
      return device;
    }
  } else if (IS_LINUX) {
    try {
      if (commandExists("getprop")) {
        const device = execCommand("getprop ro.product.model");
        if (device) {
          setCachedValue(context.cache, "device", device);
          return device;
        }
      }

      const dmiPath = "/sys/devices/virtual/dmi/id/product_name";
      if (fs.existsSync(dmiPath)) {
        const device = fs.readFileSync(dmiPath, "utf8").trim();
        if (device) {
          setCachedValue(context.cache, "device", device);
          return device;
        }
      }
    } catch {}
  }

  setCachedValue(context.cache, "device", "");
  return "";
}
