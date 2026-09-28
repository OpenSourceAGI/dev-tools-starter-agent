/**
 * Network utilities for IP information fetching
 * @module network
 */

import https from "https";
import {
  DEFAULT_IPINFO_TOKEN,
  DEFAULT_NETWORK_TIMEOUT,
} from "../cache/cache-config";

/**
 * IP information from ipinfo.io API
 * @interface IPInfo
 */
export interface IPInfo {
  /** Public IP address */
  ip?: string;
  /** City location */
  city?: string;
  /** Reverse DNS hostname */
  hostname?: string;
  /** ISP organization string (includes AS number) */
  org?: string;
}

/**
 * IP information from ip-api.com (fallback)
 * @interface IPAPIInfo
 */
interface IPAPIInfo {
  query?: string;
  city?: string;
  isp?: string;
  org?: string;
  as?: string;
}

/**
 * Fetches IP geolocation information from ipinfo.io lite API
 * @param {string} token - IPInfo.io API token
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<IPInfo>} IP information object or empty object on error
 */
async function fetchFromIPInfo(
  token: string = DEFAULT_IPINFO_TOKEN,
  timeout: number = DEFAULT_NETWORK_TIMEOUT
): Promise<IPInfo> {
  return new Promise((resolve) => {
    const url = `https://api.ipinfo.io/lite/8.8.8.8?token=${token}`;

    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          // ipinfo lite returns: { ip, city, region, country, org }
          // Map to our standard IPInfo format
          resolve({
            ip: parsed.ip,
            city: parsed.city,
            hostname: parsed.hostname,
            org: parsed.org,
          });
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
 * Fetches IP geolocation information from ip-api.com (fallback)
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<IPInfo>} IP information object or empty object on error
 */
async function fetchFromIPAPI(
  timeout: number = DEFAULT_NETWORK_TIMEOUT
): Promise<IPInfo> {
  return new Promise((resolve) => {
    const url = "http://ip-api.com/json/?fields=status,message,query,city,isp,org,as";

    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed: IPAPIInfo = JSON.parse(data);
          if (parsed.status === "success") {
            // Map ip-api response to our standard IPInfo format
            resolve({
              ip: parsed.query,
              city: parsed.city,
              hostname: undefined,
              org: parsed.org || parsed.isp || parsed.as,
            });
          } else {
            resolve({});
          }
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
 * Fetches IP geolocation information using race between ipinfo.io and ip-api.com
 * Uses ipinfo.io lite endpoint first, falls back to ip-api.com if slower or fails
 * @param {string} token - IPInfo.io API token
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<IPInfo>} IP information object or empty object on error
 */
export async function fetchIPInfo(
  token: string = DEFAULT_IPINFO_TOKEN,
  timeout: number = DEFAULT_NETWORK_TIMEOUT
): Promise<IPInfo> {
  // Race both services, use whichever responds first
  const [ipinfoResult, ipapiResult] = await Promise.allSettled([
    fetchFromIPInfo(token, timeout),
    fetchFromIPAPI(timeout),
  ]);

  // Prefer ipinfo.io result if successful and has data
  if (ipinfoResult.status === "fulfilled" && ipinfoResult.value && ipinfoResult.value.ip) {
    return ipinfoResult.value;
  }

  // Fall back to ip-api.com result if successful and has data
  if (ipapiResult.status === "fulfilled" && ipapiResult.value && ipapiResult.value.ip) {
    return ipapiResult.value;
  }

  // Return whichever has data, or empty object
  if (ipinfoResult.status === "fulfilled" && ipinfoResult.value) {
    return ipinfoResult.value;
  }
  if (ipapiResult.status === "fulfilled" && ipapiResult.value) {
    return ipapiResult.value;
  }

  return {};
}