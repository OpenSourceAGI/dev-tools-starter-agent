#!/usr/bin/env node
import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSystemInfo } from "./system-info-api";
import type { SystemInfo, SystemInfoOptions } from "./systeminfo-types";

const __filename = fileURLToPath(import.meta.url);

import {
  Settings,
  DEFAULT_SETTINGS,
  colors,
  backgrounds,
  SETTINGS_FILE,
  CACHE_FILE,
  loadSettings,
  saveSettings,
} from "./info/settings";

// Platform detection
const IS_WINDOWS = os.platform() === "win32";

// Foreground code -> [background code, contrasting text code] for the
// legacy 8-color multicolor rotation (ports/pacman rainbow mode).
const MULTICOLOR_BG: Record<number, [number, number]> = {
  31: [41, 97], // red
  32: [42, 30], // green
  33: [43, 30], // yellow
  34: [44, 97], // blue
  35: [45, 97], // magenta
  36: [46, 30], // cyan
};

function formatValue(key: string, value: string, settings: Settings): string {
  if (!value || value.trim() === "") return "";

  const showBackgrounds = settings.display.show_backgrounds !== false;
  const colorName = settings.colors[key] as keyof typeof colors;
  const bg = backgrounds[colorName as keyof typeof backgrounds];
  const style = (showBackgrounds && bg) || colors[colorName] || colors.reset;
  const suffix = showBackgrounds ? colors.reset : "";
  const emoji = settings.display.show_emojis ? settings.emojis[key] || "" : "";

  // Special handling for battery emoji
  if (key === "battery" && settings.display.show_emojis) {
    const batteryEmoji = value.includes("+")
      ? settings.emojis.battery_charging
      : settings.emojis.battery;
    return `${style}${batteryEmoji}${value}${suffix}`;
  }

  // Multicolor handling for ports
  if (key === "ports" && settings.colors[key] === "multicolor" && value) {
    const emoji = settings.display.show_emojis ? settings.emojis.ports : "";
    let output = ` ${emoji}`;
    const ports = value.split(" ");
    const colorCodes = [31, 32, 33, 34, 35, 36];
    ports.forEach((port, index) => {
      const colorCode = colorCodes[index % colorCodes.length];
      if (showBackgrounds) {
        const [bgCode, textCode] = MULTICOLOR_BG[colorCode];
        output += `\x1b[${bgCode}m\x1b[${textCode}m${port}\x1b[0m `;
      } else {
        output += `\x1b[${colorCode}m${port}\x1b[0m `;
      }
    });
    return output.trim();
  }

  // Multicolor handling for pacman
  if (key === "pacman" && settings.colors[key] === "multicolor" && value) {
    const emoji = settings.display.show_emojis ? settings.emojis.pacman : "";
    return `${style}${emoji}${value}${suffix}`;
  }

  return `${style}${emoji}${value}${suffix}`;
}

/**
 * Wraps text to a maximum visible width, filling each line completely with
 * characters before moving on. Unlike block-boundary wrapping, this breaks in
 * the middle of an info block when it doesn't fit, so no visible space is left
 * unused at the end of a line.
 *
 * ANSI color codes are copied verbatim and never counted toward the width, and
 * the active color is re-applied at the start of each wrapped line so colors
 * survive a mid-block break. Emoji surrogate pairs are kept intact.
 *
 * @param text - The text to wrap (may contain ANSI escape sequences)
 * @param maxLength - Maximum visible characters per line
 * @returns Array of wrapped lines
 */
function wrapAnsiText(text: string, maxLength: number): string[] {
  if (maxLength <= 0) return text ? [text] : [];

  const lines: string[] = [];
  let currentLine = "";
  let visibleCount = 0;
  let activeAnsi = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Copy ANSI escape sequences verbatim without counting them.
    if (char === "\x1b" && text[i + 1] === "[") {
      let seq = char;
      let j = i + 1;
      while (j < text.length && text[j] !== "m") {
        seq += text[j];
        j++;
      }
      if (j < text.length) seq += text[j]; // include the trailing "m"
      currentLine += seq;
      // Track the active color so wrapped lines keep it; a reset clears it.
      activeAnsi = /\x1b\[0m/.test(seq) ? "" : seq;
      i = j;
      continue;
    }

    // Keep an emoji (surrogate pair) together and count it as width 2.
    let unit = char;
    let width = 1;
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      unit = char + text[i + 1];
      width = 2;
      i++;
    }

    // Line is full: break here, even in the middle of an info block.
    if (visibleCount >= maxLength) {
      lines.push(currentLine);
      currentLine = activeAnsi;
      visibleCount = 0;
    }

    currentLine += unit;
    visibleCount += width;
  }

  if (currentLine) lines.push(currentLine);

  return lines;
}

async function displaySystemInfo(
  customDisplayOrder: string[][] | null = null
): Promise<void> {
  const settings = loadSettings();
  const displayOrder = customDisplayOrder || settings.display_order;

  // Get system info
  const info = await getSystemInfo();

  // Single line mode
  if (settings.display.single_line) {
    const allItems: string[] = [];

    for (const group of displayOrder) {
      for (const key of group) {
        const value = info[key as keyof SystemInfo] as string;
        const formatted = formatValue(key, value, settings);
        if (formatted && formatted.trim()) {
          allItems.push(formatted);
        }
      }
    }

    if (allItems.length > 0) {
      console.log(allItems.join(" ") + colors.reset);
    }
    return;
  }

  // Multi-line mode: fill each line completely with characters, wrapping in
  // the middle of an info block when it no longer fits.
  const maxLineLength = settings.display.line_wrap_length;
  const allItems: string[] = [];

  for (const group of displayOrder) {
    for (const key of group) {
      const value = info[key as keyof SystemInfo] as string;
      const formatted = formatValue(key, value, settings);

      if (formatted && formatted.trim()) {
        allItems.push(formatted);
      }
    }
  }

  const lines = wrapAnsiText(allItems.join(" "), maxLineLength);

  // Output
  if (lines.length > 0) {
    lines.forEach((line) => {
      console.log(line + colors.reset);
    });
  } else if (settings.advanced.debug) {
    console.log("No system information could be displayed");
  }
}

function handleSettingsCommand(args: string[]): boolean {
  const settings = loadSettings();

  if (args.includes("--settings-init")) {
    if (saveSettings(DEFAULT_SETTINGS)) {
      console.log("Settings initialized with defaults");
    } else {
      console.log("Failed to initialize settings");
    }
    return true;
  }

  if (args.includes("--settings-show")) {
    console.log("Current settings:");
    console.log(JSON.stringify(settings, null, 2));
    return true;
  }

  if (args.includes("--settings-reset")) {
    if (saveSettings(DEFAULT_SETTINGS)) {
      console.log("Settings reset to defaults");
    } else {
      console.log("Failed to reset settings");
    }
    return true;
  }

  if (args.includes("--refresh")) {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
        console.log("Cache cleared");
      }
    } catch (error) {
      console.error("Error clearing cache:", (error as Error).message);
    }
    return true;
  }

  const setIndex = args.indexOf("--set");
  if (setIndex !== -1 && args[setIndex + 1] && args[setIndex + 2]) {
    const key = args[setIndex + 1];
    const value = args[setIndex + 2];

    try {
      const parsedValue =
        value.startsWith("{") || value.startsWith("[")
          ? JSON.parse(value)
          : value === "true"
          ? true
          : value === "false"
          ? false
          : value;

      const keys = key.split(".");
      let current: any = settings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = parsedValue;

      if (saveSettings(settings)) {
        console.log(`Setting ${key} = ${value}`);
      } else {
        console.log("Failed to save settings");
      }
    } catch (error) {
      console.error("Error setting value:", (error as Error).message);
    }
    return true;
  }

  return false;
}

function installShellGreeting(): void {
  const homeDir = os.homedir();

  let configDir: string, scriptPath: string;
  if (IS_WINDOWS) {
    configDir = path.join(homeDir, "AppData", "Local");
    scriptPath = path.join(configDir, "systeminfo");
  } else {
    configDir = path.join(homeDir, ".config");
    scriptPath = path.join(configDir, "systeminfo");
  }

  const currentScript = path.resolve(__filename);

  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.copyFileSync(currentScript, scriptPath);
    if (!IS_WINDOWS) {
      fs.chmodSync(scriptPath, "755");
    }

    if (IS_WINDOWS) {
      console.log("Windows installation:");
      console.log("1. Script copied to:", scriptPath);
      console.log("2. To add to PowerShell profile, run:");
      console.log(`   Add-Content $PROFILE "node '${scriptPath}'"`);
      console.log(
        "3. To add to Command Prompt, create a batch file in your startup folder"
      );

      const startupBat = path.join(configDir, "systeminfo-startup.bat");
      fs.writeFileSync(startupBat, `@echo off\nnode "${scriptPath}"\n`);
      console.log("4. Batch file created:", startupBat);
    } else {
      try {
        const hushLoginPath = path.join(homeDir, ".hushlogin");
        fs.writeFileSync(hushLoginPath, "");
      } catch {}

      const bashrcPath = path.join(homeDir, ".bashrc");
      const bashLine = `node ${scriptPath}`;

      if (fs.existsSync(bashrcPath)) {
        const bashrc = fs.readFileSync(bashrcPath, "utf8");
        if (!bashrc.includes("systeminfo")) {
          fs.appendFileSync(bashrcPath, `\n${bashLine}\n`);
        }
      } else {
        fs.writeFileSync(bashrcPath, `${bashLine}\n`);
      }

      const zshrcPath = path.join(homeDir, ".zshrc");
      if (fs.existsSync(zshrcPath)) {
        const zshrc = fs.readFileSync(zshrcPath, "utf8");
        if (!zshrc.includes("systeminfo")) {
          fs.appendFileSync(zshrcPath, `\n${bashLine}\n`);
        }
      }

      const fishConfigPath = path.join(
        homeDir,
        ".config",
        "fish",
        "config.fish"
      );
      if (fs.existsSync(fishConfigPath)) {
        const fishConfig = fs.readFileSync(fishConfigPath, "utf8");
        if (!fishConfig.includes("systeminfo")) {
          fs.appendFileSync(
            fishConfigPath,
            `\nset -U fish_greeting ""\n${bashLine}\n`
          );
        }
      }

      const nushellConfigPath = path.join(
        homeDir,
        ".config",
        "nushell",
        "config.nu"
      );
      if (fs.existsSync(nushellConfigPath)) {
        const nushellConfig = fs.readFileSync(nushellConfigPath, "utf8");
        if (!nushellConfig.includes("systeminfo")) {
          fs.appendFileSync(
            nushellConfigPath,
            `\n$env.config.show_banner = false\n${bashLine}\n`
          );
        }
      }
    }

    console.log("Shell greeting installation completed!");
  } catch (error) {
    console.error("Error installing shell greeting:", (error as Error).message);
    process.exit(1);
  }
}

function parseCLIMode(args: string[]): string[] | null {
  for (const arg of args) {
    if (!arg.startsWith("--") && arg.includes(",")) {
      return arg
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    }
  }

  for (const arg of args) {
    if (!arg.startsWith("--") && !arg.includes("=") && arg.length > 0) {
      return [arg.trim()];
    }
  }

  return null;
}

async function showHelp(): Promise<void> {
  console.log(`
System Info Script - TypeScript Version

Usage:
  about-system [options]
  about-system <part1,part2,...>    # CLI mode: show specific parts only

Options:
  --help, -h           Show this help message
  --install            Install as shell greeting
  --settings-init      Initialize settings file with defaults
  --settings-show      Display current settings
  --settings-reset     Reset settings to defaults
  --refresh            Clear the cache file
  --set <key> <value>  Set a configuration value (use dot notation)
  --json               Output as JSON

Examples:
  about-system                      # Show all info (default)
  about-system cpu,os               # Show only CPU and OS info
  about-system user,hostname,ip     # Show user, hostname, and IP
  about-system disk_used            # Show only disk usage
  about-system --install
  about-system --set display.show_emojis false
  about-system --set display.show_backgrounds false
  about-system --set colors.user blue
  about-system --set emojis.cpu "🚀 "
  about-system --set labels.cpu "Processor"
  about-system --json

Settings file: ${SETTINGS_FILE}
Cache file: ${CACHE_FILE}

Platform: ${
    IS_WINDOWS
      ? "Windows"
      : os.platform() === "darwin"
      ? "macOS"
      : os.platform() === "linux"
      ? "Linux"
      : "Unknown"
  }

Available display blocks:
  Basic: user, hostname, uptime, shell, os, kernel, device
  Resources: disk_used, ram_used, memory_available, swap_used, top_process
  Network: ip, iplocal, city, domain, isp, network_interfaces
  Hardware: cpu, gpu, temperature, battery, screen_resolution
  System: load_average, users_logged_in, mount_points, services_running
  Tools: pacman, ports, containers
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (handleSettingsCommand(args)) {
    return;
  }

  if (args.includes("--help") || args.includes("-h")) {
    await showHelp();
    return;
  }

  if (args.includes("--install")) {
    installShellGreeting();
    return;
  }

  if (args.includes("--json")) {
    const info = await getSystemInfo();
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  const cliParts = parseCLIMode(args);
  if (cliParts) {
    const customDisplayOrder = [cliParts];
    await displaySystemInfo(customDisplayOrder);
    return;
  }

  await displaySystemInfo();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

export { displaySystemInfo, installShellGreeting };
