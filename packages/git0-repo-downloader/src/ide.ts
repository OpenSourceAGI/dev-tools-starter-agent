import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { shell } from './utils.js';
import type { IdeInfo } from './types.js';

/**
 * Ordered list of editors to probe. The first one found on `PATH` wins.
 * Add new entries at the top to give them higher priority.
 *
 * @internal
 */
const SUPPORTED_IDES: IdeInfo[] = [
  { name: 'Antigravity', cmd: 'antigravity' },
  { name: 'Cursor',      cmd: 'cursor'      },
  { name: 'Windsurf',    cmd: 'windsurf'    },
  { name: 'VSCode',      cmd: 'code'        },
  { name: 'Code Server', cmd: 'code-server' },
  { name: 'Neovim',      cmd: 'nvim'        },
  { name: 'Webstorm',    cmd: 'webstorm'    },
];

/**
 * Probes `PATH` for the first IDE in {@link SUPPORTED_IDES} that is installed.
 *
 * Uses `where` on Windows and `command -v` on Unix. The check is intentionally
 * silent (`stdio: 'ignore'`) so no output leaks into the CLI.
 *
 * @returns The first installed {@link IdeInfo}, or `null` when none are found.
 *
 * @example
 * const ide = getInstalledIde();
 * if (ide) console.log(`Found: ${ide.name}`);
 */
export function getInstalledIde(): IdeInfo | null {
  const probe = process.platform === 'win32'
    ? (cmd: string) => `where ${cmd}`
    : (cmd: string) => `command -v ${cmd}`;

  for (const ide of SUPPORTED_IDES) {
    try {
      shell.execSync(probe(ide.cmd), { stdio: 'ignore' });
      return ide;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Builds the argument list for spawning an editor process.
 *
 * `code-server` requires a `--open` flag to actually open the browser;
 * all other editors accept a bare path.
 *
 * @param ide  - The IDE to build args for.
 * @param target - Path to open (directory or file).
 * @returns Argument array suitable for `spawn(ide.cmd, args)`.
 *
 * @internal
 */
function buildIdeArgs(ide: IdeInfo, target: string): string[] {
  return ide.cmd === 'code-server' ? [target, '--open'] : [target];
}

/**
 * Locates the entry-point document to open after the IDE loads the project
 * folder. Checks for README files first (case-insensitive), then falls back
 * to `package.json`.
 *
 * @param dir - Directory to search inside (defaults to `process.cwd()`).
 * @returns Relative path of the first match, or `null` if nothing is found.
 *
 * @internal
 */
function findEntryDocument(dir = '.'): string | null {
  const candidates = [
    `${dir}/readme.md`,
    `${dir}/Readme.md`,
    `${dir}/README.md`,
    `${dir}/package.json`,
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

/**
 * Spawns an IDE process in a detached, fire-and-forget manner.
 *
 * The process is detached and unreffed so it outlives the parent CLI process.
 * Shell mode is enabled on Windows to handle PATH resolution correctly.
 *
 * @param ide  - IDE to launch.
 * @param args - Arguments to pass (e.g. path to open).
 *
 * @internal
 */
function spawnDetached(ide: IdeInfo, args: string[]): void {
  shell.spawn(ide.cmd, args, {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  }).unref();
}

/**
 * Opens a project directory in the first available IDE and, after a short
 * delay, also opens the project's entry document (README or `package.json`).
 *
 * The 3-second delay gives the IDE time to finish loading the workspace before
 * it receives the file-open command — opening too early can cause some editors
 * to ignore the second argument.
 *
 * Does nothing and prints a warning when no supported IDE is installed.
 *
 * @param targetDir - Absolute path to the project directory to open.
 *
 * @example
 * openInIDE('/home/user/projects/my-app');
 * // Logs: 🚀 Opening my-app in Cursor
 */
export function openInIDE(targetDir: string): void {
  const ide = getInstalledIde();
  if (!ide) {
    console.log(chalk.yellow('⚠️  No supported IDE found'));
    return;
  }

  try {
    spawnDetached(ide, buildIdeArgs(ide, targetDir));

    setTimeout(() => {
      const doc = findEntryDocument(targetDir);
      if (doc) spawnDetached(ide, buildIdeArgs(ide, doc));
    }, 3000);

    console.log(chalk.green(`🚀 Opening ${path.basename(targetDir)} in ${ide.name}`));
  } catch {
    // Swallow — IDE launch errors are non-fatal for the download workflow.
  }
}
