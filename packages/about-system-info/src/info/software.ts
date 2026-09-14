/**
 * Software and package-related system information functions
 * @module info/software
 */

import os from "os";
import process from "process";
import type { InfoContext } from "../types/internal-types";
import { IS_WINDOWS } from "../utils/platform";
import { execCommand, commandExists } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";

/**
 * Gets the current shell name
 * Uses the user's login shell (macOS/Linux), falls back to ps for the
 * parent process shell
 * @returns Shell name or empty string on Windows
 * @example "bash", "zsh", "fish", "nu"
 */
export function shell(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "shell");
  if (cached !== null) return cached;

  if (!IS_WINDOWS) {
    try {
      const loginShell = os.userInfo().shell;
      if (loginShell) {
        const shellName = loginShell.split("/").pop() as string;
        setCachedValue(context.cache, "shell", shellName);
        return shellName;
      }
    } catch {}

    try {
      const ppid = process.ppid;
      const shellName = execCommand(`ps -p ${ppid} -o comm=`).split("/").pop();
      if (shellName) {
        setCachedValue(context.cache, "shell", shellName);
        return shellName;
      }
    } catch {}
  }

  setCachedValue(context.cache, "shell", "");
  return "";
}

/**
 * Gets available package managers and development tools
 * Checks for package managers (apt, yum, npm, etc.) and editors (nvim, hx)
 * @param context - Info context with cache
 * @returns Space-separated list of available commands
 * @example "apt npm docker nvim", "yay pacman bun hx"
 */
export function packages(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "packages");
  if (cached !== null) return cached;

  const commands = [
    "apt",
    "brew",
    "npm",
    "uv",
    "docker",
    "hx",
    "nvim",
    "bun",
    "yay",
    "pacman",
    "yum",
    "dnf",
    "zypper",
    "emerge",
    "apk",
    "snap",
    "flatpak",
  ];
  const available = commands.filter((cmd) => commandExists(cmd));

  const result = available.join(" ");
  setCachedValue(context.cache, "packages", result);
  return result;
}

/**
 * Gets versions of common software tools
 * @param context - Info context with cache
 * @returns Formatted string of tool versions
 * @example "node:20.1.0 git:2.34.1"
 */
export function common_versions(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "common_versions");
  if (cached !== null) return cached;

  const tools = [
    {
      cmd: "node",
      args: "--version",
      clean: (v: string) => v.replace(/^v/, ""),
    },
    {
      cmd: "git",
      args: "--version",
      clean: (v: string) => v.replace("git version ", ""),
    },
    {
      cmd: "docker",
      args: "--version",
      clean: (v: string) => v.replace(/Docker version ([^,]+),.*/, "$1"),
    },
    {
      cmd: "python3",
      args: "--version",
      clean: (v: string) => v.replace("Python ", ""),
    },
    {
      cmd: "go",
      args: "version",
      clean: (v: string) => v.replace("go version go", "").split(" ")[0],
    },
    {
      cmd: "rustc",
      args: "--version",
      clean: (v: string) => v.replace("rustc ", "").split(" ")[0],
    },
  ];

  const versions: string[] = [];

  for (const tool of tools) {
    if (commandExists(tool.cmd)) {
      try {
        const output = execCommand(`${tool.cmd} ${tool.args}`);
        const version = tool.clean(output).trim();
        if (version) {
          versions.push(`${tool.cmd}:${version}`);
        }
      } catch {}
    }
  }

  const result = versions.join(" ");
  setCachedValue(context.cache, "common_versions", result);
  return result;
}
/**
 * Gets running Docker container names
 * Lists active Docker containers with their names
 * @param context - Info context with cache
 * @returns Space-separated container names or empty string
 * @example "nginx redis postgres", "web-app db-server"
 */
export function containers(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "containers");
  if (cached !== null) return cached;

  if (!commandExists("docker")) {
    setCachedValue(context.cache, "containers", "");
    return "";
  }

  try {
    const containerCount = execCommand("docker ps -q")
      .split("\n")
      .filter((line) => line.trim()).length;
    if (containerCount === 0) {
      setCachedValue(context.cache, "containers", "");
      return "";
    }

    const containers = execCommand(
      'docker ps --format "{{.Names}}\t{{.Ports}}"'
    );
    const lines = containers.split("\n").filter((line) => line.trim());

    const containerInfo: string[] = [];

    lines.forEach((line) => {
      const [name, ports] = line.split("\t");
      if (name) {
        containerInfo.push(name);

        if (ports) {
          const portMatches = ports.match(/->(\d+(-\d+)?)\//g);
          if (portMatches) {
            const uniquePorts = [
              ...new Set(
                portMatches.map((p) => p.replace(/->\d+(-\d+)?\//, ""))
              ),
            ];
            containerInfo.push(...uniquePorts);
          }
        }
      }
    });

    const result = containerInfo.join(" ");
    setCachedValue(context.cache, "containers", result);
    return result;
  } catch {}

  setCachedValue(context.cache, "containers", "");
  return "";
}
