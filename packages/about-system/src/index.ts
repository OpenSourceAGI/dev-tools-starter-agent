/**
 * @fileoverview Main entry point for about-system package
 *
 * Exports the system information API for programmatic use.
 * For CLI usage, use the 'about-system' command directly.
 *
 * @example
 * ```typescript
 * import { getSystemInfo, infoFunctions } from 'about-system';
 *
 * const info = await getSystemInfo();
 * console.log(info.cpu);
 * console.log(info.ram_used);
 * ```
 */

export { getSystemInfo, infoFunctions, loadCache, saveCache } from './system-info-api.js';
export type { SystemInfo, SystemInfoOptions, Platform, InfoContext, GetSystemInfoFunction, DisplaySystemInfoFunction, PlatformAvailability } from './systeminfo-types.js';
