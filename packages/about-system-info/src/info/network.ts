/**
 * Network-related system information functions
 * @module info/network
 */

import os from "os";
import type { InfoContext } from "../types/internal-types";
import { IS_LINUX, IS_MAC } from "../utils/platform";
import { execCommand } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";

/**
 * Gets public IP address from ipinfo.io
 * @param context - Info context with cache and IP info
 * @returns Public IPv4 address or empty string
 * @example "203.0.113.42"
 */
export async function ip(context: InfoContext): Promise<string> {
  const cached = getCachedValue(context.cache, "ip");
  if (cached) return cached;

  if (!context.ipInfo) {
    setCachedValue(context.cache, "ip", "");
    return "";
  }
  const ip = context.ipInfo.ip || "";
  setCachedValue(context.cache, "ip", ip);
  return ip;
}

/**
 * Gets local/private IP address(es)
 * Tries ifconfig and ip commands on Linux, falls back to Node.js API
 * @returns Space-separated local IP addresses (RFC 1918 ranges)
 * @example "192.168.1.100" or "10.0.0.50 192.168.1.100"
 */
export function iplocal(): string {
  if (IS_LINUX) {
    try {
      const ifconfig = execCommand("ifconfig 2>/dev/null");
      const wlanMatch = ifconfig.match(
        /wlan0[\s\S]*?inet (\d+\.\d+\.\d+\.\d+)/
      );
      if (wlanMatch) {
        return wlanMatch[1];
      }
    } catch {}

    try {
      const ipAddr = execCommand("ip addr show 2>/dev/null");
      const addresses: string[] = [];
      const matches = ipAddr.matchAll(/inet (\d+\.\d+\.\d+\.\d+)\/\d+/g);
      for (const match of matches) {
        if (!match[1].startsWith("127.")) {
          addresses.push(match[1]);
        }
      }
      if (addresses.length > 0) {
        return addresses.join(" ");
      }
    } catch {}
  }

  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const device of interfaces[name] || []) {
      if (device.family === "IPv4" && !device.internal) {
        addresses.push(device.address);
      }
    }
  }

  return addresses.join(" ");
}

/**
 * Gets geographic city based on public IP
 * @param context - Info context with IP geolocation data
 * @returns City name or empty string
 * @example "San Francisco", "New York", "London"
 */
export async function city(context: InfoContext): Promise<string> {
  const cached = getCachedValue(context.cache, "city");
  if (cached !== null) return cached;

  if (!context.ipInfo || !context.ipInfo.city) {
    setCachedValue(context.cache, "city", "");
    return "";
  }
  const city = context.ipInfo.city;
  setCachedValue(context.cache, "city", city);
  return city;
}

/**
 * Gets reverse DNS hostname with HTTP prefix
 * @param context - Info context with IP info
 * @returns Domain with http:// prefix or empty string
 * @example "http://example.com", "http://host-203-0-113-42.example.net"
 */
export async function domain(context: InfoContext): Promise<string> {
  const cached = getCachedValue(context.cache, "domain");
  if (cached !== null) return cached;

  if (!context.ipInfo || !context.ipInfo.hostname) {
    setCachedValue(context.cache, "domain", "");
    return "";
  }
  const domain = `http://${context.ipInfo.hostname}`;
  setCachedValue(context.cache, "domain", domain);
  return domain;
}

/**
 * Gets Internet Service Provider name
 * Strips AS number prefix from organization string
 * @param context - Info context with IP info
 * @returns ISP name or empty string
 * @example "Comcast Cable", "Verizon Business", "Cloudflare Inc"
 */
export async function isp(context: InfoContext): Promise<string> {
  const cached = getCachedValue(context.cache, "isp");
  if (cached !== null) return cached;

  if (!context.ipInfo || !context.ipInfo.org) {
    setCachedValue(context.cache, "isp", "");
    return "";
  }
  const isp = context.ipInfo.org.split(" ").slice(1).join(" ");
  setCachedValue(context.cache, "isp", isp);
  return isp;
}

/**
 * Gets active network interface names
 * Lists non-loopback interfaces with IPv4 addresses (Linux/macOS only)
 * @param context - Info context with cache
 * @returns Space-separated interface names or empty string
 * @example "eth0 wlan0", "en0 en1"
 */
export function network_interfaces(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "network_interfaces");
  if (cached !== null) return cached;

  if (!IS_LINUX && !IS_MAC) {
    setCachedValue(context.cache, "network_interfaces", "");
    return "";
  }

  try {
    const interfaces = os.networkInterfaces();
    const activeInterfaces: string[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (name !== "lo") {
        const ipv4Addr = addrs?.find(
          (addr) => addr.family === "IPv4" && !addr.internal
        );
        if (ipv4Addr) {
          activeInterfaces.push(name);
        }
      }
    }

    const result = activeInterfaces.join(" ");
    setCachedValue(context.cache, "network_interfaces", result);
    return result;
  } catch {}

  setCachedValue(context.cache, "network_interfaces", "");
  return "";
}
/**
 * Gets open TCP ports with service names
 * Uses lsof to find listening TCP ports (Linux/macOS only)
 * @param context - Info context with cache
 * @returns Space-separated port+process pairs or empty string
 * @example "80http 443http 22ssh", "3000node 5432post"
 */
export function ports(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "ports");
  if (cached !== null) return cached;

  if (IS_LINUX || IS_MAC) {
    try {
      const lsof = execCommand("lsof -nP -iTCP -sTCP:LISTEN");
      const lines = lsof.split("\n").slice(1);
      const ports = new Set<string>();

      lines.forEach((line) => {
        const parts = line.split(/\s+/);
        if (parts.length >= 9) {
          const address = parts[8];
          const portMatch = address.match(/:(\d+)$/);
          if (portMatch) {
            const port = portMatch[1];
            const process = parts[0].substring(0, 4);
            ports.add(`${port}${process}`);
          }
        }
      });

      const result = Array.from(ports).join(" ");
      setCachedValue(context.cache, "ports", result);
      return result;
    } catch {}
  }

  setCachedValue(context.cache, "ports", "");
  return "";
}
