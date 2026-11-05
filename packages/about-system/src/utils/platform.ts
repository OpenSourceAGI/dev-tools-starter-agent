/**
 * Platform detection utilities
 * @module platform
 */

import os from "os";

/**
 * Platform detection constants
 */
export const IS_WINDOWS = os.platform() === "win32";
export const IS_MAC = os.platform() === "darwin";
export const IS_LINUX = os.platform() === "linux";
