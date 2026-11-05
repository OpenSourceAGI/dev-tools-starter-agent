/**
 * System status and health information functions
 * @module info/system-status
 */

import fs from "fs";
import os from "os";
import type { InfoContext } from "../types/internal-types";
import { IS_LINUX, IS_MAC } from "../utils/platform";
import { execCommand, commandExists } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";

/**
 * Gets system load averages
 * Reads 1, 5, and 15 minute load averages from /proc/loadavg (Linux) or
 * os.loadavg() (macOS)
 * @returns Space-separated load averages (1m 5m 15m) or empty string
 * @example "0.52 0.58 0.59", "2.10 1.95 1.88"
 */
export function load_average(context: InfoContext): string {
  if (IS_MAC) {
    return os
      .loadavg()
      .map((n) => n.toFixed(2))
      .join(" ");
  }

  if (!IS_LINUX) return "";

  try {
    const loadavg = fs.readFileSync("/proc/loadavg", "utf8");
    const loads = loadavg.split(" ").slice(0, 3);
    return loads.join(" ");
  } catch {}
  return "";
}

/**
 * Gets battery charge level and charging status
 * Reads from /sys/class/power_supply/BAT0 (Linux laptops only)
 * @param context - Info context with cache
 * @returns Battery percentage with optional + for charging, or empty string
 * @example "85%", "42%+", "100%"
 */
export function battery(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "battery");
  if (cached !== null) return cached;

  if (IS_MAC) {
    try {
      const batt = execCommand("pmset -g batt");
      const percentMatch = batt.match(/(\d+)%/);
      if (percentMatch) {
        const isCharging = /;\s*(charging|charged);/i.test(batt);
        const result = `${percentMatch[1]}%${isCharging ? "+" : ""}`;
        setCachedValue(context.cache, "battery", result);
        return result;
      }
    } catch {}

    setCachedValue(context.cache, "battery", "");
    return "";
  }

  if (!IS_LINUX) {
    setCachedValue(context.cache, "battery", "");
    return "";
  }

  try {
    const batteryPath = "/sys/class/power_supply/BAT0";
    const capacityPath = `${batteryPath}/capacity`;
    const statusPath = `${batteryPath}/status`;

    if (fs.existsSync(capacityPath)) {
      const capacity = fs.readFileSync(capacityPath, "utf8").trim();
      const status = fs.existsSync(statusPath)
        ? fs.readFileSync(statusPath, "utf8").trim()
        : "Unknown";

      const batteryPercent = parseInt(capacity);
      const isCharging = status === "Charging";
      const result = `${batteryPercent}%${isCharging ? "+" : ""}`;
      setCachedValue(context.cache, "battery", result);
      return result;
    }
  } catch {}

  setCachedValue(context.cache, "battery", "");
  return "";
}

/**
 * Gets system temperature in Celsius
 * Reads from thermal zone or hwmon sensors (Linux), or from the
 * `osx-cpu-temp` CLI (macOS, if installed via `brew install osx-cpu-temp`) -
 * macOS has no unprivileged API for this, so nothing is reported without it
 * @param context - Info context with cache
 * @returns Temperature with °C suffix or empty string
 * @example "45°C", "62°C"
 */
export function temperature(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "temperature");
  if (cached !== null) return cached;

  if (IS_MAC) {
    if (commandExists("osx-cpu-temp")) {
      try {
        const output = execCommand("osx-cpu-temp");
        const match = output.match(/([\d.]+)\s*°?C/);
        if (match) {
          const tempC = Math.round(parseFloat(match[1]));
          if (tempC > 0 && tempC < 150) {
            const result = `${tempC}°C`;
            setCachedValue(context.cache, "temperature", result);
            return result;
          }
        }
      } catch {}
    }

    setCachedValue(context.cache, "temperature", "");
    return "";
  }

  if (!IS_LINUX) {
    setCachedValue(context.cache, "temperature", "");
    return "";
  }

  try {
    const tempSources = [
      "/sys/class/thermal/thermal_zone0/temp",
      "/sys/class/hwmon/hwmon0/temp1_input",
      "/sys/class/hwmon/hwmon1/temp1_input",
    ];

    for (const source of tempSources) {
      if (fs.existsSync(source)) {
        const temp = fs.readFileSync(source, "utf8").trim();
        const tempC = Math.round(parseInt(temp) / 1000);

        if (tempC > 0 && tempC < 150) {
          const result = `${tempC}°C`;
          setCachedValue(context.cache, "temperature", result);
          return result;
        }
      }
    }
  } catch {}

  setCachedValue(context.cache, "temperature", "");
  return "";
}

/**
 * Gets count of running system services
 * Uses systemctl or service command (Linux only)
 * @param context - Info context with cache
 * @returns Service count with "services" suffix or empty string
 * @example "125 services", "89 services"
 */
export function services_running(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "services_running");
  if (cached !== null) return cached;

  if (IS_MAC) {
    try {
      const services = execCommand("launchctl list");
      const serviceCount = services
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("PID")).length;

      if (serviceCount > 0) {
        const result = `${serviceCount} services`;
        setCachedValue(context.cache, "services_running", result);
        return result;
      }
    } catch {}

    setCachedValue(context.cache, "services_running", "");
    return "";
  }

  if (!IS_LINUX) {
    setCachedValue(context.cache, "services_running", "");
    return "";
  }

  try {
    let serviceCount = 0;

    if (commandExists("systemctl")) {
      const services = execCommand(
        "systemctl list-units --type=service --state=running --no-pager"
      );
      serviceCount = services
        .split("\n")
        .filter((line) => line.includes(".service")).length;
    } else if (commandExists("service")) {
      const services = execCommand("service --status-all");
      serviceCount = services
        .split("\n")
        .filter((line) => line.includes("+")).length;
    }

    if (serviceCount > 0) {
      const result = `${serviceCount} services`;
      setCachedValue(context.cache, "services_running", result);
      return result;
    }
  } catch {}

  setCachedValue(context.cache, "services_running", "");
  return "";
}
