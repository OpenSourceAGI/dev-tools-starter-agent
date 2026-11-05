/**
 * Network utilities for IP information fetching
 * @module network
 */

import http from "http";
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
  status?: string;
  query?: string;
  city?: string;
  isp?: string;
  org?: string;
  as?: string;
}

/**
 * GETs a URL and parses the body as JSON. Never rejects: resolves `null` on
 * any error, on abort, or once `timeout` ms have passed in total — a hard
 * deadline for the whole request, not a socket-idle timeout.
 */
function getJSON(
  url: string,
  timeout: number,
  signal?: AbortSignal
): Promise<any> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(null);

    let settled = false;
    let req: http.ClientRequest | undefined;
    const finish = (value: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const onAbort = () => {
      req?.destroy();
      finish(null);
    };
    const timer = setTimeout(onAbort, timeout);
    signal?.addEventListener("abort", onAbort);

    try {
      const get = url.startsWith("https:") ? https.get : http.get;
      req = get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            finish(JSON.parse(data));
          } catch {
            finish(null);
          }
        });
        res.on("error", () => finish(null));
      });
      req.on("error", () => finish(null));
    } catch {
      finish(null);
    }
  });
}

/**
 * Fetches IP information for this machine from the ipinfo.io lite API
 * @param {string} token - IPInfo.io API token
 * @param {number} timeout - Total request deadline in milliseconds
 * @param {AbortSignal} signal - Abandons the request when aborted
 * @returns {Promise<IPInfo>} IP information object or empty object on error
 */
export async function fetchFromIPInfo(
  token: string = DEFAULT_IPINFO_TOKEN,
  timeout: number = DEFAULT_NETWORK_TIMEOUT,
  signal?: AbortSignal
): Promise<IPInfo> {
  const parsed = await getJSON(
    `https://api.ipinfo.io/lite/me?token=${token}`,
    timeout,
    signal
  );
  if (!parsed || typeof parsed !== "object") return {};
  // ipinfo lite returns { ip, asn, as_name, country, ... } — no city.
  const org =
    parsed.org ?? (parsed.asn && parsed.as_name ? `${parsed.asn} ${parsed.as_name}` : undefined);
  return {
    ip: parsed.ip,
    city: parsed.city,
    hostname: parsed.hostname,
    org,
  };
}

/**
 * Fetches IP geolocation information from ip-api.com (fallback). The free
 * tier is plain HTTP only.
 * @param {number} timeout - Total request deadline in milliseconds
 * @param {AbortSignal} signal - Abandons the request when aborted
 * @returns {Promise<IPInfo>} IP information object or empty object on error
 */
export async function fetchFromIPAPI(
  timeout: number = DEFAULT_NETWORK_TIMEOUT,
  signal?: AbortSignal
): Promise<IPInfo> {
  const parsed: IPAPIInfo | null = await getJSON(
    "http://ip-api.com/json/?fields=status,message,query,city,isp,org,as",
    timeout,
    signal
  );
  if (!parsed || parsed.status !== "success") return {};
  return {
    ip: parsed.query,
    city: parsed.city,
    hostname: undefined,
    org: parsed.org || parsed.isp || parsed.as,
  };
}

/**
 * Fetches IP information from ipinfo.io and ip-api.com in parallel and merges
 * them: ipinfo.io wins per field, ip-api.com fills the gaps (ipinfo lite has
 * no city). Both requests share the same deadline, so this never takes longer
 * than `timeout`.
 * @param {string} token - IPInfo.io API token
 * @param {number} timeout - Total deadline in milliseconds
 * @param {AbortSignal} signal - Abandons both requests when aborted
 * @returns {Promise<IPInfo>} IP information object or empty object on error
 */
export async function fetchIPInfo(
  token: string = DEFAULT_IPINFO_TOKEN,
  timeout: number = DEFAULT_NETWORK_TIMEOUT,
  signal?: AbortSignal
): Promise<IPInfo> {
  const [ipinfo, ipapi] = await Promise.all([
    fetchFromIPInfo(token, timeout, signal),
    fetchFromIPAPI(timeout, signal),
  ]);

  const merged: IPInfo = {};
  for (const source of [ipapi, ipinfo]) {
    for (const [key, value] of Object.entries(source)) {
      if (value) merged[key as keyof IPInfo] = value;
    }
  }
  // ipinfo answers over IPv6 when the machine has it; the short IPv4 address
  // reads better in a one-line greeting, so keep ip-api's when it has one.
  if (merged.ip?.includes(":") && ipapi.ip && !ipapi.ip.includes(":")) {
    merged.ip = ipapi.ip;
  }
  return merged;
}
