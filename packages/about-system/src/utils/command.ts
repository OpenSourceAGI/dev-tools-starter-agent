/**
 * Command execution utilities
 * @module command
 */

import { execSync } from "child_process";
import { IS_WINDOWS } from "./platform";

/**
 * Executes a shell command safely with timeout
 * @param {string} command - Command to execute
 * @param {object} options - Additional options for execSync
 * @returns {string} Command output or empty string on error
 */
export function execCommand(command: string, options = {}): string {
  try {
    const cmd = IS_WINDOWS ? `cmd /c ${command}` : command;
    return execSync(cmd, {
      encoding: "utf8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "ignore"],
      ...options,
    })
      .toString()
      .trim();
  } catch (error) {
    return "";
  }
}

/**
 * Checks if a command exists in the system PATH
 * @param {string} command - Command name to check
 * @returns {boolean} True if command exists
 */
export function commandExists(command: string): boolean {
  try {
    if (IS_WINDOWS) {
      execSync(`where ${command}`, { stdio: "ignore" });
    } else {
      execSync(`which ${command}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}
