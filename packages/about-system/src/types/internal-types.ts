/**
 * Internal type definitions
 * @module internal-types
 */

import type { Cache, CacheEntry } from "../cache/cache";
import type { IPInfo } from "../utils/network";

/**
 * Context object passed to info collection functions
 * @interface InfoContext
 */
export interface InfoContext {
  /** Cache storage */
  cache: Cache;
  /** IP information from external API */
  ipInfo?: IPInfo;
}

// Re-export cache types for convenience
export type { Cache, CacheEntry };
