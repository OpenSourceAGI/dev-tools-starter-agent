/**
 * Cache management utilities
 * @module cache
 */

import fs from "fs";
import { CACHE_FILE, CACHE_DURATION } from "./cache-config";

/**
 * Represents a cached value with timestamp
 * @interface CacheEntry
 */
export interface CacheEntry {
  /** The cached value */
  value: any;
  /** Unix timestamp when the value was cached */
  timestamp: number;
}

/**
 * Cache storage structure
 * @interface Cache
 */
export interface Cache {
  [key: string]: CacheEntry;
}

/**
 * Loads cache from disk
 * @returns {Cache} Cached data or empty object if cache doesn't exist or is corrupted
 */
export function loadCache(): Cache {
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
 * @param {Cache} cache - Cache object to save
 */
export function saveCache(cache: Cache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    // Silently fail if can't write cache
  }
}

/**
 * Checks if a cache entry is still valid based on configured duration
 * @param {CacheEntry} cacheEntry - The cache entry to validate
 * @param {string} key - The key name to determine cache duration
 * @returns {boolean} True if cache is still valid
 */
export function isCacheValid(cacheEntry: CacheEntry, key: string): boolean {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  const age = Date.now() - cacheEntry.timestamp;
  const maxAge = CACHE_DURATION[key as keyof typeof CACHE_DURATION] || 60000;
  return age < maxAge;
}

/**
 * Retrieves a value from cache if valid
 * @param {Cache} cache - Cache object
 * @param {string} key - Key to retrieve
 * @returns {any} Cached value or null if not found/expired
 */
export function getCachedValue(cache: Cache, key: string): any {
  if (!cache[key]) return null;
  const cacheEntry = cache[key];
  if (!isCacheValid(cacheEntry, key)) {
    delete cache[key];
    return null;
  }
  return cacheEntry.value;
}

/**
 * Stores a value in cache with current timestamp
 * @param {Cache} cache - Cache object
 * @param {string} key - Key to store under
 * @param {any} value - Value to cache
 */
export function setCachedValue(cache: Cache, key: string, value: any): void {
  cache[key] = {
    value,
    timestamp: Date.now(),
  };
}
