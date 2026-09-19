#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import GithubAPI, { type RepoTarget } from './github-api.js';
import { openInIDE } from './ide.js';
import { installDependencies } from './install.js';
import { showPackageMenu } from './package-menu.js';
import { attachGitHistoryLazily, cloneHistoryOnly } from './history.js';
import { parseArgs, type Flags } from './args.js';
import { getAvailableDirectoryName } from './download.js';
import { printLogo } from './utils.js';
import type { SearchResult } from './types.js';

const Github = new GithubAPI({ debug: false });

/**
 * Downloads a GitHub repository tarball, then immediately opens the project in
 * an IDE and installs its dependencies.
 *
 * The IDE launch is deferred 500 ms so the extraction can finish writing files
 * before the editor tries to index them.
 *
 * With `--history`, the `.git` directory is fetched *after* extraction and runs
 * alongside the IDE launch and the dependency install rather than in front of
 * them — see {@link attachGitHistoryLazily} for why that ordering is the whole
 * point.
 *
 * @param target     - Parsed repository reference, including any sub-path.
 * @param folderPath - Optional name for the extraction directory; defaults to
 *   the repository name, or the sub-path's name when one is given.
 * @param flags      - Parsed CLI flags.
 *
 * @example
 * await downloadRepoAndSetup(parseTarget('vitejs/vite') as RepoTarget);
 * // Downloads vite/, opens it in the first available IDE, runs bun install
 */
async function downloadRepoAndSetup(
  target: RepoTarget,
  folderPath: string | null = null,
  flags: Flags = { history: false, historyOnly: false, mirror: false }
): Promise<void> {
  printLogo();

  const ref = flags.branch || target.ref;
  const extractPath = await Github.downloadRepo(target.href, folderPath, {
    subPath: flags.path ?? target.subPath,
    subPathType: flags.path ? '' : target.subPathType,
    ref,
  });

  // Started here, not awaited here: the files are on disk, so everything below
  // can proceed while the history downloads.
  const history = flags.history
    ? attachGitHistoryLazily(extractPath, target.href, { mirror: flags.mirror, ref })
    : Promise.resolve();

  setTimeout(() => openInIDE(extractPath), 500);
  await installDependencies(extractPath);
  await history;
}

/**
 * Handles `--history-only`: clones the repository's history into `<name>.git`
 * and downloads no working files at all.
 *
 * @param target - Parsed repository reference.
 * @param flags  - Parsed CLI flags.
 *
 * @internal
 */
async function downloadHistoryOnly(target: RepoTarget, flags: Flags): Promise<void> {
  printLogo();

  const targetDir = getAvailableDirectoryName(path.resolve(process.cwd(), `${target.name}.git`));
  console.log(chalk.blue(`📦 Cloning ${target.name} history into ${path.basename(targetDir)}...`));

  try {
    await cloneHistoryOnly(target.href, targetDir, { bare: !flags.mirror });
    console.log(chalk.green(`✅ History-only clone at ${targetDir}`));
    console.log(chalk.white('  Read the log without checking anything out:'));
    console.log(chalk.gray(`  git --git-dir="${targetDir}" log --all --oneline`));
    console.log(chalk.white('  Or restore a working copy from it:'));
    console.log(chalk.gray(`  git clone "${targetDir}" ${target.name}`));
  } catch (error: any) {
    console.error(chalk.red('❌ History clone failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Builds the display label shown in the repository selection list.
 *
 * Shows the full `owner/name` slug, description, star count, language, and a
 * colored badge when release packages are available for the current platform.
 *
 * @param repo - Enriched search result from `searchRepositories`.
 * @returns Multi-line string suitable for an `inquirer` list choice label.
 *
 * @internal
 */
function formatRepoChoice(repo: SearchResult): string {
  const packageInfo = repo.hasCompatibleReleases
    ? chalk.green(' 📦 Packages available')
    : repo.hasReleases
      ? chalk.yellow(' 📦 Packages (other platforms)')
      : '';

  return (
    `${chalk.bold(repo.full_name)} - ${chalk.gray(repo.description || 'No description')}\n` +
    `      ${chalk.yellow(`★ ${repo.stargazers_count}`)} | ${chalk.blue(repo.language || 'Unknown')}${packageInfo}`
  );
}

/**
 * Prompts the user to choose between downloading the binary package, the
 * source code, or both when a repository has release assets.
 *
 * @param selectedRepo - The repository the user chose in the search results.
 * @param flags        - Parsed CLI flags, forwarded to the source download.
 *
 * @internal
 */
async function handleRepoDownload(selectedRepo: SearchResult, flags: Flags): Promise<void> {
  const target = Github.parseTarget(selectedRepo.url);
  if (!target) {
    console.log(chalk.yellow(`Could not parse repository URL: ${selectedRepo.url}`));
    return;
  }

  if (!selectedRepo.hasReleases && !selectedRepo.hasCompatibleReleases) {
    await downloadRepoAndSetup(target, null, flags);
    return;
  }

  const { downloadChoice } = await inquirer.prompt({
    type: 'list',
    name: 'downloadChoice',
    message: 'This repository has downloadable packages. What would you like to do?',
    choices: [
      { name: '📦 Download package/binary', value: 'package' },
      { name: '📂 Download source code',    value: 'source'  },
      { name: '📦📂 Download both',          value: 'both'    },
    ],
  });

  if (downloadChoice === 'package' || downloadChoice === 'both') {
    await showPackageMenu(
      selectedRepo,
      Github.downloadPackage.bind(Github),
      Github.getCurrentPlatform()
    );
  }
  if (downloadChoice === 'source' || downloadChoice === 'both') {
    await downloadRepoAndSetup(target, null, flags);
  }
}

/**
 * CLI entry point for the `git0` / `g` / `gg` commands.
 *
 * **Flow:**
 * 1. Parse `process.argv` into flags and a search query or direct repo URL.
 * 2. If the argument looks like a GitHub URL or `owner/repo`, download it
 *    directly — optionally into a custom folder (second positional argument),
 *    limited to a sub-path, and optionally with `.git` history.
 * 3. Otherwise, search GitHub and present an interactive list.
 * 4. After the user picks a repo, offer package vs. source download when
 *    releases are available.
 *
 * Exits with code `1` on missing arguments or an empty search result.
 *
 * @example
 * // Direct download:
 * //   git0 facebook/react
 * //   git0 https://github.com/vitejs/vite my-vite-copy
 *
 * // Just one folder of it:
 * //   git0 https://github.com/facebook/react/tree/main/packages/react-dom
 * //   git0 facebook/react --path=packages/react-dom
 *
 * // With git history, fetched after the source is already on disk:
 * //   git0 facebook/react --history
 * //   git0 facebook/react --history-only
 *
 * // Search:
 * //   git0 react template starter
 */
async function main(): Promise<void> {
  printLogo();

  const { positional, flags } = parseArgs(process.argv.slice(2));
  if (!positional.length) {
    console.log(chalk.yellow('Usage: git0 <github-url | owner/repo[/path] | search-query>'));
    console.log(chalk.gray('  --path=<path>   download only that folder or file'));
    console.log(chalk.gray('  --branch=<ref>  download a branch, tag or commit'));
    console.log(chalk.gray('  --history       also fetch .git history, in the background'));
    console.log(chalk.gray('  --history-only  clone only the history, no working files'));
    console.log(chalk.gray('  --mirror        keep every ref when cloning history'));
    process.exit(1);
  }

  const query = positional.join(' ');
  const target = Github.parseTarget(query);

  if (target) {
    if (flags.historyOnly) {
      await downloadHistoryOnly(target, flags);
      return;
    }
    await downloadRepoAndSetup(target, positional[1] ?? null, flags);
    return;
  }

  const results = await Github.searchRepositories(query);
  if (!results?.length) {
    console.log(chalk.yellow('No repositories found'));
    process.exit(1);
  }

  const { selectedRepo } = await inquirer.prompt({
    type: 'list',
    name: 'selectedRepo',
    message: 'Select a repository to download:',
    choices: results.map(repo => ({ name: formatRepoChoice(repo), value: repo })),
  });

  await handleRepoDownload(selectedRepo, flags);
}

main().catch((error: any) => {
  console.error(chalk.red(`❌ ${error.message}`));
  process.exit(1);
});
