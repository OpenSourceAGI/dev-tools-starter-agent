/**
 * Cache configuration and constants
 * @module cache-config
 */

import os from "os";
import path from "path";

/**
 * Cache file location in system's temporary directory
 * @constant
 */
export const CACHE_FILE = path.join(os.tmpdir(), "systeminfo-cache.json");

/**
 * Cache duration configuration for different system information types
 * Values are in milliseconds
 *
 * @constant
 * @property {number} ip - IP information cache (10 minutes)
 * @property {number} cpu - CPU information cache (24 hours)
 * @property {number} gpu - GPU information cache (24 hours)
 * @property {number} os - OS information cache (24 hours)
 * @property {number} device - Device information cache (24 hours)
 * @property {number} kernel - Kernel information cache (1 hour)
 * @property {number} pacman - Package managers cache (10 minutes)
 * @property {number} ports - Open ports cache (5 minutes)
 * @property {number} containers - Docker containers cache (5 minutes)
 * @property {number} top_process - Top process cache (5 seconds)
 * @property {number} disk_used - Disk usage cache (1 minute)
 * @property {number} ram_used - RAM usage cache (10 seconds)
 * @property {number} services_running - Services cache (5 minutes)
 * @property {number} temperature - Temperature cache (30 seconds)
 * @property {number} battery - Battery status cache (1 minute)
 * @property {number} network_interfaces - Network interfaces cache (5 minutes)
 * @property {number} mount_points - Mount points cache (10 minutes)
 */
export const CACHE_DURATION = {
  ip: 10 * 60 * 1000,
  cpu: 24 * 60 * 60 * 1000,
  gpu: 24 * 60 * 60 * 1000,
  os: 24 * 60 * 60 * 1000,
  device: 24 * 60 * 60 * 1000,
  kernel: 60 * 60 * 1000,
  pacman: 10 * 60 * 1000,
  ports: 5 * 60 * 1000,
  containers: 5 * 60 * 1000,
  top_process: 5 * 1000,
  disk_used: 60 * 1000,
  ram_used: 10 * 1000,
  services_running: 5 * 60 * 1000,
  temperature: 30 * 1000,
  battery: 60 * 1000,
  network_interfaces: 5 * 60 * 1000,
  mount_points: 10 * 60 * 1000,
};

/**
 * Default IPInfo.io API token for geolocation
 * @constant
 */
export const DEFAULT_IPINFO_TOKEN = "da2d6cc4baa5d1";

/**
 * Default network request timeout in milliseconds
 * @constant
 */
export const DEFAULT_NETWORK_TIMEOUT = 5000;
