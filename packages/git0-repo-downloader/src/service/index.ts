import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { Flags } from '../args.js';
import { parseSchemeUrl } from './assets.js';
import { ensureService, isServiceRunning, listJobs, requestInstall } from './client.js';
import { DEFAULT_PORT, startService } from './server.js';
import { installSystemService, uninstallSystemService } from './system-service.js';

export { DEFAULT_PORT, createServiceServer, startService, JobManager, TrustStore } from './server.js';
export { pickAsset, normalizeRepoSlug, parseSchemeUrl } from './assets.js';

/** The runtime and script this process was started with — what the service files re-run. */
function selfCommand(): { runtime: string; script: string } {
  const script = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : '';
  return { runtime: process.execPath, script };
}

/**
 * Handles `--service[=…]` and `git0://` links. Returns `true` when it handled
 * the invocation, so `main()` stops there.
 *
 * @example
 * // git0 --service              → run the service in the foreground
 * // git0 --service=install      → register it to start at login, and start it
 * // git0 --service=uninstall    → remove it
 * // git0 --service=status       → is it up, and what is it doing
 * // git0 git0://install/owner/repo  → what the OS runs when a git0:// link is clicked
 */
export async function runServiceCommand(positional: string[], flags: Flags, version?: string): Promise<boolean> {
  const port = flags.port ?? DEFAULT_PORT;
  const link = positional.find(p => /^git0:/i.test(p));

  if (link) {
    const repo = parseSchemeUrl(link);
    if (!repo) throw new Error(`Not a git0 install link: ${link}`);
    const self = selfCommand();
    if (!(await ensureService(self.runtime, self.script, port))) {
      throw new Error('Could not start the git0 service');
    }
    const { jobUrl } = await requestInstall(repo, port);
    console.log(chalk.green(`Install of ${repo} requested — ${jobUrl}`));
    return true;
  }

  if (!flags.service) return false;

  switch (flags.service) {
    case 'run': {
      const { port: bound } = await startService({ port, version });
      console.log(chalk.green(`git0 service listening on http://127.0.0.1:${bound}`));
      return true;
    }
    case 'install': {
      for (const line of installSystemService({ ...selfCommand(), port })) console.log(chalk.green(`✅ ${line}`));
      return true;
    }
    case 'uninstall': {
      for (const line of uninstallSystemService()) console.log(chalk.green(`✅ ${line}`));
      return true;
    }
    case 'status': {
      if (!(await isServiceRunning(port))) {
        console.log(chalk.yellow(`git0 service is not running on port ${port}`));
        process.exitCode = 1;
        return true;
      }
      console.log(chalk.green(`git0 service is running on http://127.0.0.1:${port}`));
      for (const j of await listJobs(port)) {
        const pct = `${Math.round(j.progress * 100)}%`.padStart(4);
        console.log(`  ${pct}  ${j.status.padEnd(17)} ${j.repo}${j.error ? chalk.red(`  ${j.error}`) : ''}`);
      }
      return true;
    }
  }
  return false;
}
