import chalk from 'chalk';
import { execSync } from 'child_process';

/** Set once the logo has been printed, so repeat calls are no-ops. */
let logoPrinted = false;

/**
 * Prints the git0 ASCII-art logo in cyan to stdout — **at most once per
 * process**.
 *
 * Several entry points want to guarantee the branding is on screen: `main()`
 * prints it before parsing arguments, and each download path prints it before
 * it starts work, because a download can be reached without going through
 * `main()`. Left unguarded that renders the logo twice for the most common
 * invocation of all, `git0 owner/repo`, which reads as a bug. The guard lets
 * every call site keep saying "show the branding here" while the user sees it
 * exactly once.
 *
 * @example
 * printLogo();
 * printLogo(); // no-op — the banner is already on screen
 */
export function printLogo(): void {
  if (logoPrinted) return;
  logoPrinted = true;

  console.log(chalk.cyan(`                ___
    __ _(_)‾|_ / _ \\
   / _  | | __| | | |
  | (_| | | |_| |_| |
   \\__, |_|\\__|\\___/
   |___/`));
}

/**
 * Forgets that the logo was printed, so the next {@link printLogo} call
 * renders it again.
 *
 * Only useful to tests, which drive several CLI flows through one process and
 * would otherwise see the banner once for the whole suite.
 *
 * @internal
 */
export function resetLogo(): void {
  logoPrinted = false;
}

/**
 * Runs a shell command synchronously, inheriting the parent's stdio so output
 * streams directly to the terminal.
 *
 * Errors are swallowed silently by default because many install commands (e.g.
 * `bun run dev`) exit non-zero when a script is not defined, which should not
 * abort the overall setup flow.
 *
 * @param cmd       - Shell command string to execute.
 * @param showError - When `true`, prints a red failure message on non-zero exit.
 *
 * @example
 * exec('npm install');
 * exec('npm run build', true); // prints error if build fails
 */
export function exec(cmd: string, showError = false): void {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    if (showError) console.error(chalk.red(`❌ Failed: ${cmd}`));
  }
}
