/**
 * Process-related system information functions
 * @module info/process
 */

import os from "os";
import type { InfoContext } from "../types/internal-types";
import { IS_LINUX, IS_MAC } from "../utils/platform";
import { execCommand } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";

/**
 * Gets the highest CPU-consuming process
 * Uses ps command to find top process by CPU usage (Linux/macOS only)
 * @param context - Info context with cache
 * @returns Process info as "percentage processname" or empty string
 * @example "8% firefox", "15% chrome", "3% systemd"
 */
export function top_process(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "top_process");
  if (cached !== null) return cached;

  if (IS_LINUX) {
    try {
      const ps = execCommand("ps -eo pcpu,comm --sort=-%cpu --no-headers");
      const lines = ps.split("\n");
      if (lines.length > 0) {
        const topProcess = lines[0].trim().replace(/\s+/, " ").split(" ");
        const cpu = topProcess[0].replace(/\.\d+/, "%");
        const process = topProcess[1].split("/").pop();
        const result = `${cpu}% ${process}`;
        setCachedValue(context.cache, "top_process", result);
        return result;
      }
    } catch {}
  } else if (IS_MAC) {
    try {
      // -c gives the short command name, -r sorts by %CPU descending
      const ps = execCommand("ps -Aceo pcpu,comm -r");
      const lines = ps.split("\n").filter((line) => line.trim());
      if (lines.length > 1) {
        const topProcess = lines[1].trim().split(/\s+/);
        const cpuValue = Math.round(parseFloat(topProcess[0]));
        const process = topProcess.slice(1).join(" ");
        if (!isNaN(cpuValue) && process) {
          const result = `${cpuValue}% ${process}`;
          setCachedValue(context.cache, "top_process", result);
          return result;
        }
      }
    } catch {}
  }

  setCachedValue(context.cache, "top_process", "");
  return "";
}

/**
 * Gets system uptime since last boot
 * @returns Uptime formatted as "Xd Yh Zm"
 * @example "2d 14h 23m", "0d 3h 45m"
 */
export function uptime(): string {
  const uptimeSeconds = os.uptime();
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

/**
 * Gets number of logged in users
 * Uses who command to count active user sessions (Linux/macOS only)
 * @returns User count with "users" suffix or empty string
 * @example "3 users", "1 users"
 */
export function users_logged_in(): string {
  if (!IS_LINUX && !IS_MAC) return "";

  try {
    const who = execCommand("who");
    const users = who.split("\n").filter((line) => line.trim()).length;
    if (users > 0) {
      return `${users} users`;
    }
  } catch {}
  return "";
}
