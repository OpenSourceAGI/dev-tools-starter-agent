/**
 * Hardware-related system information functions
 * @module info/hardware
 */

import os from "os";
import fs from "fs";
import type { InfoContext } from "../types/internal-types";
import { IS_WINDOWS, IS_MAC, IS_LINUX } from "../utils/platform";
import { execCommand } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";
import Fuse from "fuse.js";

/**
 * Gets CPU model name and specifications
 * Uses platform-specific commands (wmic/lscpu/cpuinfo)
 * Automatically strips "with Radeon Graphics" and similar suffixes
 * @param context - Info context with cache
 * @returns CPU model string or empty string
 * @example "Intel Core i7-12700K", "AMD Ryzen 9 5900HX", "Apple M2 Pro"
 */
export function cpu(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "cpu");
  if (cached) return cached;

  let cpuName = "";

  if (IS_WINDOWS) {
    try {
      const wmic = execCommand("wmic cpu get name /format:list");
      const nameMatch = wmic.match(/Name=(.+)/);
      if (nameMatch) {
        cpuName = nameMatch[1].trim();
      }
    } catch {}

    if (!cpuName) {
      try {
        const ps = execCommand(
          'powershell.exe -Command "Get-WmiObject -Class Win32_Processor | Select-Object -ExpandProperty Name"'
        );
        if (ps.trim()) {
          cpuName = ps.trim();
        }
      } catch {}
    }
  } else if (IS_LINUX) {
    try {
      const lscpu = execCommand("lscpu");
      const modelMatch = lscpu.match(/Model name:\s*([^\n,]+)/);
      if (modelMatch) {
        cpuName = modelMatch[1].trim();
      }
    } catch {}

    if (!cpuName) {
      try {
        const cpuInfo = fs.readFileSync("/proc/cpuinfo", "utf8");
        const modelMatch = cpuInfo.match(/model name\s*:\s*([^\n]+)/);
        const hardwareMatch = cpuInfo.match(/Hardware\s*:\s*([^\n]+)/);

        if (modelMatch) {
          cpuName = modelMatch[1].trim();
        } else if (hardwareMatch) {
          cpuName = hardwareMatch[1].trim();
        }
      } catch {}
    }
  } else {
    const cpus = os.cpus();
    if (cpus.length > 0) {
      cpuName = cpus[0].model.trim().replace(/[\r\n]+/g, " ");
    }
  }

  if (!cpuName) {
    setCachedValue(context.cache, "cpu", "");
    return "";
  }

  cpuName = cpuName.trim().replace(/with .*/, "");

  setCachedValue(context.cache, "cpu", cpuName);
  return cpuName;
}

/**
 * Gets graphics card model name
 * Extracts GPU info from lspci (Linux) or WMI (Windows)
 * Filters out basic/generic display adapters
 * @param context - Info context with cache
 * @returns GPU model string or empty string
 * @example "NVIDIA GeForce RTX 4070", "AMD Radeon RX 6800 XT"
 */
export function gpu(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "gpu");
  if (cached !== null) return cached;

  if (IS_WINDOWS) {
    const gpus: string[] = [];

    try {
      const wmic = execCommand(
        "wmic path win32_VideoController get name /format:list"
      );
      const nameMatches = wmic.matchAll(/Name=(.+)/g);
      for (const match of nameMatches) {
        const name = match[1].trim();
        if (name && !name.includes("Microsoft Basic")) {
          gpus.push(name);
        }
      }
    } catch {}

    if (gpus.length === 0) {
      try {
        const ps = execCommand(
          "powershell.exe -Command \"Get-WmiObject -Class Win32_VideoController | Where-Object {$_.Name -notlike '*Microsoft Basic*'} | Select-Object -ExpandProperty Name\""
        );
        if (ps.trim()) {
          for (const line of ps.trim().split(/\r?\n/)) {
            const name = line.trim();
            if (name && !name.includes("Microsoft Basic")) {
              gpus.push(name);
            }
          }
        }
      } catch {}
    }

    if (gpus.length > 0) {
      const result = gpus.join(", ");
      setCachedValue(context.cache, "gpu", result);
      return result;
    }
  } else if (IS_MAC) {
    try {
      const profile = execCommand("system_profiler SPDisplaysDataType");
      const gpus = Array.from(profile.matchAll(/Chipset Model:\s*(.+)/g)).map(
        (match) => match[1].trim()
      );

      if (gpus.length > 0) {
        const result = gpus.join(", ");
        setCachedValue(context.cache, "gpu", result);
        return result;
      }
    } catch {}
  } else if (IS_LINUX) {
    try {
      const lspci = execCommand("lspci");
      const gpus: string[] = [];
      const classPattern = /(?:VGA compatible controller|3D controller|Display controller)/i;
      const gpuPattern = /(?:NVIDIA|GeForce|RTX|GTX|Quadro|Tesla|AMD|ATI|Radeon|Navi|Vega|RX|Intel.*(?:Arc|UHD|Iris|HD Graphics))/i;

      for (const line of lspci.split("\n")) {
        if (!classPattern.test(line) || !gpuPattern.test(line)) continue;

        let name: string;
        const allBrackets = line.match(/\[([^\]]+)\]/g);
        if (allBrackets && allBrackets.length > 0) {
          const last = allBrackets[allBrackets.length - 1];
          name = last.replace(/^\[|\]$/g, "");
        } else {
          name = line
            .replace(/^.*(?:VGA compatible controller|3D controller|Display controller):\s*/i, "")
            .replace(/\s*\(rev [a-f0-9]+\)\s*$/i, "")
            .trim();
        }

        if (name && !gpus.includes(name)) {
          gpus.push(name);
        }
      }

      if (gpus.length > 0) {
        const result = gpus.join(", ");
        setCachedValue(context.cache, "gpu", result);
        return result;
      }
    } catch {}
  }

  setCachedValue(context.cache, "gpu", "");
  return "";
}

/**
 * Gets screen resolution
 * Uses xrandr on Linux (X11/Xorg only) or system_profiler on macOS
 * @returns Resolution in WIDTHxHEIGHT format or empty string
 * @example "1920x1080", "2560x1440", "3840x2160"
 */
export function screen_resolution(): string {
  if (IS_MAC) {
    try {
      const profile = execCommand("system_profiler SPDisplaysDataType");
      const resolutionMatch = profile.match(/Resolution:\s*(\d+) x (\d+)/);
      if (resolutionMatch) {
        return `${resolutionMatch[1]}x${resolutionMatch[2]}`;
      }
    } catch {}
    return "";
  }

  if (!IS_LINUX) return "";

  try {
    if (process.env.DISPLAY) {
      const xrandr = execCommand("xrandr");
      const resolutionMatch = xrandr.match(/(\d+x\d+)\+\d+\+\d+/);
      if (resolutionMatch) {
        return resolutionMatch[1];
      }
    }
  } catch {}
  return "";
}

/**
 * Gets CPU benchmark score and rank from Geekbench 6 data
 * Uses fuzzy matching to find similar CPU models
 * @param context - Info context with cache
 * @returns Benchmark info with score and rank, or empty string
 * @example "37.9k #1", "20.5k #68"
 */
export function bench(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "bench");
  if (cached) return cached;

  const cpuName = cpu(context);
  if (!cpuName) {
    setCachedValue(context.cache, "bench", "");
    return "";
  }

  try {
    let benchmarkPath: string;
    const benchmarkFile = "cpu-geekbench.json";

    // Try multiple resolution strategies
    if (fs.existsSync(benchmarkFile)) {
      benchmarkPath = benchmarkFile;
    } else if (fs.existsSync(`src/bench/${benchmarkFile}`)) {
      benchmarkPath = `src/bench/${benchmarkFile}`;
    } else if (fs.existsSync(`./bench/${benchmarkFile}`)) {
      benchmarkPath = `./bench/${benchmarkFile}`;
    } else {
      // Last resort: construct path from import.meta.url
      try {
        const url = new URL(`./${benchmarkFile}`, import.meta.url);
        benchmarkPath = url.pathname;
        if (!fs.existsSync(benchmarkPath)) {
          const distPath = url.pathname.substring(0, url.pathname.lastIndexOf('/'));
          benchmarkPath = distPath + `/${benchmarkFile}`;
        }
      } catch {
        benchmarkPath = benchmarkFile;
      }
    }

    const benchmarkData = fs.readFileSync(benchmarkPath, "utf8");
    const parsed = JSON.parse(benchmarkData);
    const scores = parsed.scores as [string, number, number][];

    const cpuList = scores.map((item) => ({ name: item[0], score: item[1], rank: item[2] }));

    const fuse = new Fuse(cpuList, {
      keys: ["name"],
      threshold: 0.6,
      minMatchCharLength: 3,
    });

    const results = fuse.search(cpuName);
    if (results.length > 0) {
      const match = results[0].item;
      const score = Math.round(match.score / 100) / 10;
      const rank = match.rank;
      const result = `${score}k #${rank}`;
      setCachedValue(context.cache, "bench", result);
      return result;
    }
  } catch (e) {
    // Silently fail
  }

  setCachedValue(context.cache, "bench", "");
  return "";
}

/**
 * Gets detailed CPU benchmark information from Geekbench 6 data
 * Includes score, rank, and architecture type (ARM/Intel/AMD)
 * @param context - Info context with cache
 * @returns Detailed benchmark info with architecture, or empty string
 * @example "Geekbench 6: 37.9k (Rank #1) - ARM", "Geekbench 6: 20.5k (Rank #68) - Intel"
 */
export function cpu_bench_info(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "cpu_bench_info");
  if (cached) return cached;

  const cpuName = cpu(context);
  if (!cpuName) {
    setCachedValue(context.cache, "cpu_bench_info", "");
    return "";
  }

  try {
    let benchmarkPath: string;
    const benchmarkFile = "cpu-geekbench.json";

    // Try multiple resolution strategies
    if (fs.existsSync(benchmarkFile)) {
      benchmarkPath = benchmarkFile;
    } else if (fs.existsSync(`src/bench/${benchmarkFile}`)) {
      benchmarkPath = `src/bench/${benchmarkFile}`;
    } else if (fs.existsSync(`./bench/${benchmarkFile}`)) {
      benchmarkPath = `./bench/${benchmarkFile}`;
    } else {
      // Last resort: construct path from import.meta.url
      try {
        const url = new URL(`./${benchmarkFile}`, import.meta.url);
        benchmarkPath = url.pathname;
        if (!fs.existsSync(benchmarkPath)) {
          const distPath = url.pathname.substring(0, url.pathname.lastIndexOf('/'));
          benchmarkPath = distPath + `/${benchmarkFile}`;
        }
      } catch {
        benchmarkPath = benchmarkFile;
      }
    }

    const benchmarkData = fs.readFileSync(benchmarkPath, "utf8");
    const parsed = JSON.parse(benchmarkData);
    const scores = parsed.scores as [string, number, number][];

    const cpuList = scores.map((item) => ({
      name: item[0],
      score: item[1],
      rank: item[2],
    }));

    const fuse = new Fuse(cpuList, {
      keys: ["name"],
      threshold: 0.6,
      minMatchCharLength: 3,
    });

    const results = fuse.search(cpuName);
    if (results.length > 0) {
      const match = results[0].item;
      const score = Math.round(match.score / 100) / 10;
      const rank = match.rank;

      // Detect architecture type
      let arch = "Unknown";
      if (match.name.includes("Apple") || match.name.includes("ARM")) {
        arch = "ARM";
      } else if (match.name.includes("Intel")) {
        arch = "Intel";
      } else if (match.name.includes("AMD") || match.name.includes("Ryzen") || match.name.includes("EPYC")) {
        arch = "AMD";
      } else if (match.name.includes("Qualcomm")) {
        arch = "ARM";
      }

      const result = `Geekbench 6: ${score}k (Rank #${rank}) - ${arch}`;
      setCachedValue(context.cache, "cpu_bench_info", result);
      return result;
    }
  } catch (e) {
    // Silently fail
  }

  setCachedValue(context.cache, "cpu_bench_info", "");
  return "";
}

/**
 * Gets GPU benchmark score and rank from Geekbench 6 data
 * Uses fuzzy matching to find similar GPU models
 * @param context - Info context with cache
 * @returns Benchmark info with score and rank, or empty string
 * @example "37.9k #1", "20.5k #68"
 */
export function gpu_bench(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "gpu_bench");
  if (cached) return cached;

  const gpuName = gpu(context);
  if (!gpuName) {
    setCachedValue(context.cache, "gpu_bench", "");
    return "";
  }

  try {
    let benchmarkPath: string;
    const benchmarkFile = "gpu-geekbench.json";

    // Try multiple resolution strategies
    if (fs.existsSync(benchmarkFile)) {
      benchmarkPath = benchmarkFile;
    } else if (fs.existsSync(`src/bench/${benchmarkFile}`)) {
      benchmarkPath = `src/bench/${benchmarkFile}`;
    } else if (fs.existsSync(`./bench/${benchmarkFile}`)) {
      benchmarkPath = `./bench/${benchmarkFile}`;
    } else {
      // Last resort: construct path from import.meta.url
      try {
        const url = new URL(`./${benchmarkFile}`, import.meta.url);
        benchmarkPath = url.pathname;
        if (!fs.existsSync(benchmarkPath)) {
          const distPath = url.pathname.substring(0, url.pathname.lastIndexOf('/'));
          benchmarkPath = distPath + `/${benchmarkFile}`;
        }
      } catch {
        benchmarkPath = benchmarkFile;
      }
    }

    const benchmarkData = fs.readFileSync(benchmarkPath, "utf8");
    const parsed = JSON.parse(benchmarkData);
    const scores = parsed.scores as [string, number, number][];

    const gpuList = scores.map((item) => ({ name: item[0], score: item[1], rank: item[2] }));

    const fuse = new Fuse(gpuList, {
      keys: ["name"],
      threshold: 0.6,
      minMatchCharLength: 3,
    });

    const results = fuse.search(gpuName);
    if (results.length > 0) {
      const match = results[0].item;
      const score = Math.round(match.score / 100) / 10;
      const rank = match.rank;
      const result = `${score}k #${rank}`;
      setCachedValue(context.cache, "gpu_bench", result);
      return result;
    }
  } catch (e) {
    // Silently fail
  }

  setCachedValue(context.cache, "gpu_bench", "");
  return "";
}

/**
 * Gets detailed GPU benchmark information from Geekbench 6 data
 * Includes score, rank, and vendor detection
 * @param context - Info context with cache
 * @returns Detailed benchmark info with vendor, or empty string
 * @example "Geekbench 6: 37.9k (Rank #1) - NVIDIA", "Geekbench 6: 20.5k (Rank #68) - AMD"
 */
export function gpu_bench_info(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "gpu_bench_info");
  if (cached) return cached;

  const gpuName = gpu(context);
  if (!gpuName) {
    setCachedValue(context.cache, "gpu_bench_info", "");
    return "";
  }

  try {
    let benchmarkPath: string;
    const benchmarkFile = "gpu-geekbench.json";

    // Try multiple resolution strategies
    if (fs.existsSync(benchmarkFile)) {
      benchmarkPath = benchmarkFile;
    } else if (fs.existsSync(`src/bench/${benchmarkFile}`)) {
      benchmarkPath = `src/bench/${benchmarkFile}`;
    } else if (fs.existsSync(`./bench/${benchmarkFile}`)) {
      benchmarkPath = `./bench/${benchmarkFile}`;
    } else {
      // Last resort: construct path from import.meta.url
      try {
        const url = new URL(`./${benchmarkFile}`, import.meta.url);
        benchmarkPath = url.pathname;
        if (!fs.existsSync(benchmarkPath)) {
          const distPath = url.pathname.substring(0, url.pathname.lastIndexOf('/'));
          benchmarkPath = distPath + `/${benchmarkFile}`;
        }
      } catch {
        benchmarkPath = benchmarkFile;
      }
    }

    const benchmarkData = fs.readFileSync(benchmarkPath, "utf8");
    const parsed = JSON.parse(benchmarkData);
    const scores = parsed.scores as [string, number, number][];

    const gpuList = scores.map((item) => ({
      name: item[0],
      score: item[1],
      rank: item[2],
    }));

    const fuse = new Fuse(gpuList, {
      keys: ["name"],
      threshold: 0.6,
      minMatchCharLength: 3,
    });

    const results = fuse.search(gpuName);
    if (results.length > 0) {
      const match = results[0].item;
      const score = Math.round(match.score / 100) / 10;
      const rank = match.rank;

      // Detect vendor from GPU name
      let vendor = "Unknown";
      const upperName = match.name.toUpperCase();
      if (upperName.includes("NVIDIA") || upperName.includes("GEFORCE") ||
          upperName.includes("RTX") || upperName.includes("GTX") ||
          upperName.includes("QUADRO") || upperName.includes("TESL") ||
          upperName.includes("B200") || upperName.includes("H100") ||
          upperName.includes("A100") || upperName.includes("A40") ||
          upperName.includes("L40") || upperName.includes("L20")) {
        vendor = "NVIDIA";
      } else if (upperName.includes("AMD") || upperName.includes("RADEON") ||
                 upperName.includes("RX ") || upperName.includes("HD") ||
                 upperName.includes("EPYC") || upperName.includes("INSTINCT") ||
                 upperName.includes("NAVI") || upperName.includes("VEGA")) {
        vendor = "AMD";
      } else if (upperName.includes("INTEL") || upperName.includes("ARC") ||
                 upperName.includes("UHD") || upperName.includes("IRIS") ||
                 upperName.includes("HD GRAPHICS")) {
        vendor = "Intel";
      }

      const result = `Geekbench 6: ${score}k (Rank #${rank}) - ${vendor}`;
      setCachedValue(context.cache, "gpu_bench_info", result);
      return result;
    }
  } catch (e) {
    // Silently fail
  }

  setCachedValue(context.cache, "gpu_bench_info", "");
  return "";
}
