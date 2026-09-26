#!/usr/bin/env node

/**
 * @fileoverview CLI tool that spawns a dev server command, monitors its log
 * output for a "ready" signal, and automatically opens the local URL in the
 * browser. If an error is detected first, it opens an AI assistant with the
 * error context for troubleshooting.
 *
 * When portless (npm: portless) is installed, the
 * command is run through it by default so the app gets a stable named URL
 * such as https://myapp.localhost, and that URL is the one opened.
 */

import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import opener from "opener";
import minimist from "minimist";
import waitOn from "wait-on";

const rawArgs = process.argv.slice(2);
const argv = minimist(rawArgs, { string: ["name"], boolean: ["portless"] });
const cmdArgs = argv._;
const aiBase = argv["ai-base"] || "https://perplexity.ai?q=";
const noAi = argv.noAi || argv.noai || argv.ai === false;
const noOpen = argv.noOpen || argv.noopen || false;
const maxErrorContextChars = 1000;
const pollDelay = argv.pollDelay || 1200;
// minimist defaults booleans to false, so read the explicit flags from argv.
const noPortless =
  argv.noPortless || argv.noportless || rawArgs.includes("--no-portless");
const forcePortless = rawArgs.includes("--portless");

const nextDir = path.join(".", ".next");
const logPath = fs.existsSync(nextDir)
  ? path.join(".next", "port.log")
  : "open-when-ready.log";


/**
 * Scans log output for error lines and extracts surrounding context
 * as a URL-encoded string suitable for an AI search query.
 * @param {string} log - Raw log output from the dev server
 * @returns {string} URL-encoded error context, or empty string if no error found
 */
function getErrorContext(log) {
  const lines = log.split(/\n/);
  const errorRegex = /⨯|[Ss]yntax[Ee]rror|error|failed|exception/i;
  for (let i = 0; i < lines.length; i++) {
    if (errorRegex.test(lines[i])) {
      const context = lines
        .slice(Math.max(0, i - 5), i + 16)
        .slice(0, 25)
        .join(" ")
        .replace(/[^\w\s:./\\-]/g, "")
        .trim()
        .replace(/\s{2,}/g, " ")
        .slice(0, maxErrorContextChars)
        .replace(/ /g, "%20");
      return context;
    }
  }
  return "";
}

/**
 * Parses log output to find the local dev server URL (e.g. http://localhost:3000).
 * @param {string} log - Raw log output from the dev server
 * @returns {string|null} The localhost URL, or null if not found
 */
function extractUrl(log) {
  // Better regex for Local: line
  const localMatch = log.match(/Local:\s+(http:\/\/localhost:\d+)/i);
  if (localMatch) return localMatch[1];

  // Fallback port
  const portMatch = log.match(/localhost:(\d+)/);
  if (portMatch) return `http://localhost:${portMatch[1]}`;

  return null;
}

/**
 * Derives a portless-safe app name (a single DNS label) from a package name or
 * directory name: drops an npm scope, lowercases, and collapses anything that
 * isn't a letter, digit or hyphen.
 * @param {string} raw - Package or directory name
 * @returns {string} Sanitized name, or empty string if nothing usable remains
 */
function sanitizeAppName(raw) {
  return String(raw || "")
    .replace(/^@[^/]+\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/, "");
}

/**
 * Infers the app name for portless: package.json "name" in `cwd`, falling back
 * to the directory name, then "app".
 * @param {string} [cwd=process.cwd()] - Directory to infer from
 * @returns {string} App name
 */
function inferAppName(cwd = process.cwd()) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    );
    const fromPkg = sanitizeAppName(pkg.name);
    if (fromPkg) return fromPkg;
  } catch {}
  return sanitizeAppName(path.basename(path.resolve(cwd))) || "app";
}

/**
 * Locates the portless binary: a local node_modules/.bin (walking up from
 * `cwd`), then the PATH.
 * @param {string} [cwd=process.cwd()] - Directory to start searching from
 * @param {string} [envPath=process.env.PATH] - PATH to search
 * @returns {string|null} Absolute path to the binary, or null if not installed
 */
function findPortless(cwd = process.cwd(), envPath = process.env.PATH || "") {
  const names =
    process.platform === "win32"
      ? ["portless.cmd", "portless.exe", "portless"]
      : ["portless"];
  const dirs = [];
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    dirs.push(path.join(dir, "node_modules", ".bin"));
    if (path.dirname(dir) === dir) break;
  }
  dirs.push(...envPath.split(path.delimiter).filter(Boolean));
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {}
    }
  }
  return null;
}

/**
 * Builds the shell command to spawn. With a portless binary, the command is
 * wrapped as `portless run --name <app> <command>`; otherwise it runs as-is.
 * @param {string[]} args - The wrapped command and its arguments
 * @param {{portlessBin?: string|null, appName?: string}} [opts]
 * @returns {string} Shell command line
 */
function buildCommand(args, { portlessBin = null, appName = "" } = {}) {
  const command = args.join(" ");
  if (!portlessBin) return command;
  return `"${portlessBin}" run --name ${appName} ${command}`;
}

/**
 * Parses log output for the URL portless prints when it registers the app
 * (a line like `-> https://myapp.localhost`).
 * @param {string} log - Raw log output
 * @returns {string|null} The portless URL, or null if not found
 */
function extractPortlessUrl(log) {
  const clean = log.replace(/\x1b\[[0-9;]*m/g, "");
  const match = clean.match(/^\s*->\s+(https?:\/\/\S+)/m);
  return match ? match[1].replace(/\/+$/, "") : null;
}

/**
 * Makes sure the portless proxy is running before the dev command is spawned.
 * The wrapped command runs with piped, detached stdio, so portless cannot
 * prompt for sudo (to bind 443 and trust its CA) from inside it. Starting the
 * proxy here, attached to the terminal, lets that one-time prompt happen.
 * @param {string} portlessBin - Path to the portless binary
 * @returns {boolean} True if the proxy is (now) running
 */
function ensurePortlessProxy(portlessBin) {
  const result = spawnSync(`"${portlessBin}" proxy start`, {
    stdio: "inherit",
    shell: true,
  });
  return !result.error && result.status === 0;
}

/**
 * Decides whether to run through portless and prepares it.
 * @returns {{portlessBin: string|null, appName: string}}
 */
function resolvePortless() {
  const appName = sanitizeAppName(argv.name) || inferAppName();
  if (noPortless) return { portlessBin: null, appName };
  const interactive = !!process.stdin.isTTY && !process.env.CI;
  if (!interactive && !forcePortless) return { portlessBin: null, appName };
  const portlessBin = findPortless();
  if (!portlessBin) {
    if (forcePortless) {
      console.error(
        "[open-ready] --portless given but portless is not installed (npm install -g portless). Running without it.",
      );
    }
    return { portlessBin: null, appName };
  }
  if (interactive && !ensurePortlessProxy(portlessBin)) {
    console.error(
      "[open-ready] Could not start the portless proxy. Running without it.",
    );
    return { portlessBin: null, appName };
  }
  return { portlessBin, appName };
}

/**
 * Main entry point. Spawns the dev server command, pipes its output to a log
 * file, and polls the log for ready/error signals to open the browser or AI helper.
 */
async function run() {
  try {
    await fsPromises.rm(logPath, { force: true });
  } catch {}

  const { portlessBin, appName } = resolvePortless();
  const proc = spawn(buildCommand(cmdArgs, { portlessBin, appName }), [], {
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    shell: true,
    detached: true,
  });

  const logStream = fs.createWriteStream(logPath);
  proc.stdout?.pipe(process.stdout);
  proc.stdout?.pipe(logStream);
  proc.stderr?.pipe(process.stderr);
  proc.stderr?.pipe(logStream);

  let opened = false;
  let errorOpened = false;
  let lastReadySeen = false;
  let lastLogSize = 0;
  let stableCount = 0;

  const poll = setInterval(async () => {
    try {
      const stats = fs.statSync(logPath);
      const currentLog = await fsPromises.readFile(logPath, "utf8");

      // Stability check LAST - check ready first!
      const logChanged = stats.size !== lastLogSize;
      if (logChanged && stats.size > 100) {
        stableCount = 0;
        lastLogSize = stats.size;
      } else if (stats.size > 100) {
        stableCount++;
        if (stableCount >= 5) {
          clearInterval(poll);
          return;
        }
      }

      // Error first
      const errorRegex = /⨯|[Ss]yntax[Ee]rror|error|failed|exception/i;
      if (errorRegex.test(currentLog) && !noAi && !errorOpened) {
        const err = getErrorContext(currentLog);
        const customPrompt = "Explain what the error is, how to fix it, then give a shell script with the best recommended solution.";
        const prompt = encodeURIComponent(customPrompt + " ");
        opener(`${aiBase}${prompt}next.js+${err}`);
        errorOpened = true;
        return;
      }

      // Ready check BEFORE stability stops us - with transition guard
      const readyRegex = /(?:ready[\s-]*started server|Ready in \d+ms)/i;
      const isReadyNow = readyRegex.test(currentLog);
      if (isReadyNow && !lastReadySeen && !opened) {
        opened = true;
        lastReadySeen = true;
        const url = extractUrl(currentLog);
        const portlessUrl = portlessBin ? extractPortlessUrl(currentLog) : null;
        if ((url || portlessUrl) && !noOpen) {
          // Wait on the app's own port; the portless URL sits behind a proxy
          // with a locally-trusted CA that Node itself may not trust.
          if (url) {
            try {
              await waitOn(url, { timeout: 10000, http: true });
            } catch {}
          }
          opener(portlessUrl || url);
        }
        clearInterval(poll);
        return;
      }
      lastReadySeen = isReadyNow;
    } catch {}
  }, pollDelay);

  process.on("SIGINT", () => {
    clearInterval(poll);
    process.exit(0);
  });
}

export {
  sanitizeAppName,
  inferAppName,
  findPortless,
  buildCommand,
  extractPortlessUrl,
  extractUrl,
  getErrorContext,
};

function isMain() {
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isMain()) run().catch(console.error);
