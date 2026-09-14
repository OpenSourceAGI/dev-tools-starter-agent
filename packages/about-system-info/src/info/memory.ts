/**
 * Memory and disk-related system information functions
 * @module info/memory
 */

import os from "os";
import fs from "fs";
import type { InfoContext } from "../types/internal-types";
import { IS_LINUX, IS_MAC } from "../utils/platform";
import { execCommand } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";

/**
 * Gets memory usage in gigabytes
 * Reads from /proc/meminfo on Linux, falls back to os.totalmem()
 * @param context - Info context with cache
 * @returns Memory usage as "used/total GB"
 * @example "12/32GB", "6/16GB"
 */
export function ram_used(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "ram_used");
  if (cached) return cached;

  if (IS_LINUX) {
    try {
      const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
      const totalMatch = meminfo.match(/MemTotal:\s+(\d+) kB/);
      const freeMatch = meminfo.match(/MemFree:\s+(\d+) kB/);

      if (totalMatch && freeMatch) {
        const totalMB = Math.round(parseInt(totalMatch[1]) / 1024);
        const freeMB = Math.round(parseInt(freeMatch[1]) / 1024);
        const usedMB = totalMB - freeMB;

        const totalGB = Math.round(totalMB / 1024);
        const usedGB = Math.round(usedMB / 1024);

        const result = `${usedGB}/${totalGB}GB`;
        setCachedValue(context.cache, "ram_used", result);
        return result;
      }
    } catch {}
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const totalGB = Math.round(totalMem / (1024 * 1024 * 1024));
  const usedGB = Math.round(usedMem / (1024 * 1024 * 1024));

  const result = `${usedGB}/${totalGB}GB`;
  setCachedValue(context.cache, "ram_used", result);
  return result;
}

/**
 * Gets available memory in gigabytes
 * Reads MemAvailable from /proc/meminfo (Linux) or derives it from
 * vm_stat's free+inactive pages (macOS)
 * @returns Available memory with "GB available" suffix or empty string
 * @example "12GB available", "4GB available"
 */
export function memory_available(): string {
  if (IS_LINUX) {
    try {
      const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
      const availableMatch = meminfo.match(/MemAvailable:\s+(\d+) kB/);
      if (availableMatch) {
        const availableGB = Math.round(parseInt(availableMatch[1]) / 1024 / 1024);
        return `${availableGB}GB available`;
      }
    } catch {}
    return "";
  }

  if (IS_MAC) {
    try {
      const vmStat = execCommand("vm_stat");
      const pageSizeMatch = vmStat.match(/page size of (\d+) bytes/);
      const freeMatch = vmStat.match(/Pages free:\s+(\d+)\./);
      const inactiveMatch = vmStat.match(/Pages inactive:\s+(\d+)\./);

      if (pageSizeMatch && freeMatch && inactiveMatch) {
        const pageSize = parseInt(pageSizeMatch[1]);
        const availablePages = parseInt(freeMatch[1]) + parseInt(inactiveMatch[1]);
        const availableGB = Math.round((availablePages * pageSize) / (1024 * 1024 * 1024));
        return `${availableGB}GB available`;
      }
    } catch {}
    return "";
  }

  return "";
}

/**
 * Gets swap memory usage
 * Calculates swap usage from /proc/meminfo (Linux) or `sysctl vm.swapusage`
 * (macOS)
 * @returns Swap usage as "percentage (size MB) swap" or empty string
 * @example "15% (512MB) swap", "0% (0MB) swap"
 */
export function swap_used(): string {
  if (IS_LINUX) {
    try {
      const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
      const swapTotalMatch = meminfo.match(/SwapTotal:\s+(\d+) kB/);
      const swapFreeMatch = meminfo.match(/SwapFree:\s+(\d+) kB/);

      if (swapTotalMatch && swapFreeMatch) {
        const swapTotal = parseInt(swapTotalMatch[1]);
        const swapFree = parseInt(swapFreeMatch[1]);
        const swapUsed = swapTotal - swapFree;

        if (swapTotal > 0) {
          const swapUsedPercent = Math.round((swapUsed / swapTotal) * 100);
          const swapUsedMB = Math.round(swapUsed / 1024);
          return `${swapUsedPercent}% (${swapUsedMB}MB) swap`;
        }
      }
    } catch {}
    return "";
  }

  if (IS_MAC) {
    try {
      const swapusage = execCommand("sysctl -n vm.swapusage");
      const match = swapusage.match(
        /total\s*=\s*([\d.]+)M\s+used\s*=\s*([\d.]+)M\s+free\s*=\s*([\d.]+)M/
      );

      if (match) {
        const swapTotal = parseFloat(match[1]);
        const swapUsedMB = parseFloat(match[2]);

        if (swapTotal > 0) {
          const swapUsedPercent = Math.round((swapUsedMB / swapTotal) * 100);
          return `${swapUsedPercent}% (${Math.round(swapUsedMB)}MB) swap`;
        }

        return "0% (0MB) swap";
      }
    } catch {}
    return "";
  }

  return "";
}

/**
 * Gets root filesystem disk usage percentage
 * Uses df command on Linux/Android/macOS
 * @param context - Info context with cache
 * @returns Percentage string or empty string
 * @example "45%", "78%"
 */
export function disk_used(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "disk_used");
  if (cached !== null) return cached;

  if (IS_LINUX || IS_MAC) {
    try {
      const df = execCommand("df -h");
      let diskUsage = "";

      if (df.includes("/storage/emulated")) {
        const match = df.match(/\s+(\d+%)\s+\/storage\/emulated/);
        diskUsage = match ? match[1] : "";
      } else {
        const lines = df.split("\n");
        for (const line of lines) {
          if (line.trim().endsWith(" /")) {
            const parts = line.trim().split(/\s+/);
            const percentIndex = parts.findIndex((part) => part.includes("%"));
            if (percentIndex !== -1) {
              diskUsage = parts[percentIndex];
              break;
            }
          }
        }

        if (!diskUsage) {
          const rootMatch = df.match(/(\d+%)\s+\/\s*$/m);
          diskUsage = rootMatch ? rootMatch[1] : "";
        }
      }

      setCachedValue(context.cache, "disk_used", diskUsage);
      return diskUsage;
    } catch {}
  }

  setCachedValue(context.cache, "disk_used", "");
  return "";
}

/**
 * Minimum total size (in KB) for a partition to be considered a real disk
 * rather than a small system/boot partition
 */
const MIN_REAL_DISK_KB = 10 * 1024 * 1024; // 10GB

/**
 * Gets disk size (used/total) for each real disk
 * Uses `df -k` on Linux/macOS, filtering out pseudo filesystems, system/boot
 * partitions (e.g. /boot, /System/Volumes/*), and anything under 10GB, since
 * those aren't disks a user would care about. When exactly one real disk is
 * found (the common case) the result omits the mount point; when multiple
 * real disks are found (e.g. a data drive or external volume), each is
 * labeled by its mount point.
 * @param context - Info context with cache
 * @returns Disk size as "used/total GB" or "mount(used/total GB) ..." or empty string
 * @example "256/512GB", "/(100/500GB) /Volumes/Backup(900/2000GB)"
 */
export function disk_size(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "disk_size");
  if (cached !== null) return cached;

  if (!IS_LINUX && !IS_MAC) {
    setCachedValue(context.cache, "disk_size", "");
    return "";
  }

  try {
    const df = execCommand("df -k");
    const lines = df.trim().split("\n").slice(1);
    const disks: { mount: string; usedGB: number; totalGB: number }[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;

      const filesystem = parts[0];
      const totalKB = parseInt(parts[1]);
      const usedKB = parseInt(parts[2]);
      const mount = parts[parts.length - 1];

      if (isNaN(totalKB) || isNaN(usedKB) || totalKB < MIN_REAL_DISK_KB) continue;

      if (IS_MAC) {
        // Only the boot disk ("/") and externally mounted real disks count.
        // APFS internal system volumes (Data, VM, Preboot, Update, ...) all
        // live under /System/Volumes and aren't separate physical disks.
        if (mount !== "/" && !mount.startsWith("/Volumes/")) continue;
      } else {
        if (
          filesystem.startsWith("devtmpfs") ||
          filesystem.startsWith("tmpfs") ||
          filesystem === "overlay" ||
          mount.startsWith("/boot") ||
          mount.startsWith("/dev") ||
          mount.startsWith("/proc") ||
          mount.startsWith("/sys") ||
          mount.startsWith("/run")
        ) {
          continue;
        }
      }

      disks.push({
        mount,
        usedGB: Math.round(usedKB / (1024 * 1024)),
        totalGB: Math.round(totalKB / (1024 * 1024)),
      });
    }

    let result = "";
    if (disks.length === 1) {
      result = `${disks[0].usedGB}/${disks[0].totalGB}GB`;
    } else if (disks.length > 1) {
      result = disks
        .map((d) => `${d.mount}(${d.usedGB}/${d.totalGB}GB)`)
        .join(" ");
    }

    setCachedValue(context.cache, "disk_size", result);
    return result;
  } catch {}

  setCachedValue(context.cache, "disk_size", "");
  return "";
}

/**
 * Gets mounted filesystem information
 * Lists non-system mount points with usage from df (Linux/macOS)
 * On Linux, excludes /, /dev, /proc, /sys and internal /System/Volumes mounts.
 * On macOS, APFS internal volumes (Data, VM, Preboot, Update, ...) all live
 * under /System/Volumes and are not user-relevant, so only /Volumes (external
 * disks, network shares, disk images) are reported.
 * @param context - Info context with cache
 * @returns Space-separated mount points with usage or empty string
 * @example "/home(45%) /mnt/data(78%)", "/Volumes/Backup(78%)"
 */
export function mount_points(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "mount_points");
  if (cached !== null) return cached;

  if (!IS_LINUX && !IS_MAC) {
    setCachedValue(context.cache, "mount_points", "");
    return "";
  }

  try {
    const df = execCommand("df -h");
    const lines = df.split("\n").slice(1);
    const mountPoints: string[] = [];

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return;

      const mountPoint = parts[parts.length - 1];
      const usage = parts.find((part) => /^\d+%$/.test(part)) || "";

      if (!usage) return;

      if (IS_MAC) {
        // Skip the "Macintosh HD" self-symlink and any other symlink back to /
        if (mountPoint.startsWith("/Volumes/") && mountPoint !== "/") {
          mountPoints.push(`${mountPoint}(${usage})`);
        }
        return;
      }

      if (
        !mountPoint.startsWith("/dev") &&
        !mountPoint.startsWith("/proc") &&
        !mountPoint.startsWith("/sys") &&
        !mountPoint.startsWith("/System/Volumes") &&
        mountPoint !== "/"
      ) {
        mountPoints.push(`${mountPoint}(${usage})`);
      }
    });

    const result = mountPoints.slice(0, 3).join(" ");
    setCachedValue(context.cache, "mount_points", result);
    return result;
  } catch {}

  setCachedValue(context.cache, "mount_points", "");
  return "";
}
