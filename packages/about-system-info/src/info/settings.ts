/**
 * Settings configuration and management
 * @module info/settings
 */

import path from "path";
import os from "os";
import fs from "fs";
import process from "process";

// Settings file paths
export const SETTINGS_FILE = path.join(
  os.homedir(),
  ".config",
  "systeminfo-settings.json",
);
export const CACHE_FILE = path.join(os.tmpdir(), "systeminfo-cache.json");

// Color codes
//
// These are deliberately darker/more saturated than a typical terminal
// palette. The original bright variants (e.g. yellow 226, cyan 51, gray 250)
// have very high luminance and are nearly unreadable on a light/white
// terminal background. `lightblue` was also mislabeled: it pointed at gold
// (220), not a blue at all. Every value below reads clearly on both light
// and dark backgrounds.
export const colors = {
  reset: "\x1b[0m",
  red: "\x1b[38;5;160m",
  orange: "\x1b[38;5;130m",
  yellow: "\x1b[38;5;58m",
  green: "\x1b[38;5;22m",
  blue: "\x1b[38;5;25m",
  cyan: "\x1b[38;5;23m",
  purple: "\x1b[38;5;91m",
  magenta: "\x1b[38;5;125m",
  gray: "\x1b[38;5;238m",
  lightblue: "\x1b[38;5;24m",
};

// Background variants, keyed the same as `colors`, used when
// `display.show_backgrounds` is enabled. Each entry sets its own background
// block plus a foreground text color chosen for contrast against it, so
// every item is legible on its own regardless of what the terminal's
// background actually is.
export const backgrounds = {
  red: "\x1b[48;5;88m\x1b[38;5;255m",
  orange: "\x1b[48;5;166m\x1b[38;5;232m",
  yellow: "\x1b[48;5;178m\x1b[38;5;232m",
  green: "\x1b[48;5;22m\x1b[38;5;255m",
  blue: "\x1b[48;5;18m\x1b[38;5;255m",
  cyan: "\x1b[48;5;23m\x1b[38;5;255m",
  purple: "\x1b[48;5;54m\x1b[38;5;255m",
  magenta: "\x1b[48;5;53m\x1b[38;5;255m",
  gray: "\x1b[48;5;236m\x1b[38;5;255m",
  lightblue: "\x1b[48;5;26m\x1b[38;5;255m",
};

// Default settings
export const DEFAULT_SETTINGS = {
  display_order: [
    ["user", "hostname", "os", "device", "kernel", "cpu", "gpu", "bench"],
    [
      "disk_used",
      "disk_size",
      "ram_used",
      "top_process",
      "uptime",
      "temperature",
      "battery",
      "load_average",
    ],
    ["ip", "iplocal", "city"],
    ["shell", "services_running", "pacman", "containers"],
  ],
  colors: {
    user: "red",
    hostname: "orange",
    disk_used: "purple",
    disk_size: "purple",
    ram_used: "yellow",
    top_process: "magenta",
    uptime: "cyan",
    ip: "green",
    iplocal: "yellow",
    city: "green",
    domain: "gray",
    isp: "lightblue",
    os: "gray",
    cpu: "orange",
    gpu: "yellow",
    bench: "red",
    device: "yellow",
    kernel: "green",
    shell: "orange",
    pacman: "multicolor",
    ports: "multicolor",
    containers: "green",
    memory_available: "blue",
    swap_used: "purple",
    load_average: "red",
    users_logged_in: "cyan",
    network_interfaces: "yellow",
    mount_points: "gray",
    services_running: "green",
    temperature: "red",
    battery: "green",
    screen_resolution: "blue",
  },
  emojis: {
    user: "👤 ",
    hostname: "🏠 ",
    ip: "🌎 ",
    iplocal: "🌐 ",
    city: "📍 ",
    domain: "🔗 ",
    isp: "👮 ",
    os: "⚡ ",
    cpu: "📈 ",
    gpu: "🎮 ",
    bench: "💪 ",
    device: "💻 ",
    kernel: "🔧 ",
    shell: "🐚 ",
    pacman: "🚀 ",
    disk_used: "📁 ",
    disk_size: "💽 ",
    ram_used: "💾 ",
    top_process: "🔝 ",
    uptime: "⏱️ ",
    ports: "🔌 ",
    containers: "📦 ",
    memory_available: "🧠 ",
    swap_used: "🔄 ",
    load_average: "⚖️ ",
    users_logged_in: "👥 ",
    network_interfaces: "🌐 ",
    mount_points: "📂 ",
    services_running: "⚙️ ",
    temperature: "🌡️ ",
    battery_charging: "🔌 ",
    battery: "🔋 ",
    screen_resolution: "🖥️ ",
  },
  labels: {
    user: "User",
    hostname: "Host",
    ip: "IP",
    iplocal: "Local IP",
    city: "City",
    domain: "Domain",
    isp: "ISP",
    os: "OS",
    cpu: "CPU",
    gpu: "GPU",
    bench: "Bench",
    device: "Device",
    kernel: "Kernel",
    shell: "Shell",
    pacman: "Packages",
    disk_used: "Disk",
    disk_size: "Disk Size",
    ram_used: "RAM",
    top_process: "Top",
    uptime: "Uptime",
    ports: "Ports",
    containers: "Containers",
    memory_available: "Memory",
    swap_used: "Swap",
    load_average: "Load",
    users_logged_in: "Users",
    network_interfaces: "Network",
    mount_points: "Mounts",
    services_running: "Services",
    temperature: "Temp",
    battery_charging: "Battery",
    battery: "Battery",
    screen_resolution: "Resolution",
  },
  display: {
    show_emojis: true,
    show_backgrounds: true,
    single_line: true,
    line_wrap_length: process?.stdout?.columns || 100,
  },
  network: {
    show_offline_message: true,
  },
  advanced: {
    debug: false,
  },
};

export interface Settings {
  display_order: string[][];
  colors: Record<string, string>;
  emojis: Record<string, string>;
  labels: Record<string, string>;
  display: {
    show_emojis: boolean;
    /** true (default): give every item its own background color block, so it stays legible regardless of the terminal's background */
    show_backgrounds: boolean;
    /** true: print one continuous line and let the terminal soft-wrap it; false: hard-wrap at line_wrap_length */
    single_line: boolean;
    line_wrap_length: number;
  };
  network: {
    show_offline_message: boolean;
  };
  advanced: {
    debug: boolean;
  };
}

/**
 * Loads settings from the configuration file
 * @returns Settings object (defaults merged with user settings)
 */
export function loadSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

/**
 * Saves settings to the configuration file
 * @param settings - The settings object to save
 * @returns True if successful, false otherwise
 */
export function saveSettings(settings: Settings): boolean {
  try {
    const configDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch {
    return false;
  }
}
