#!/usr/bin/env bun
/**
 * Measures how long each way of getting a GitHub repository onto your machine
 * takes to reach the point where you can actually run the project.
 *
 * Run it:
 *
 * ```bash
 * bun run bench                       # the default repo set
 * bun run bench facebook/react        # or whichever repos you care about
 * ```
 *
 * It talks to github.com, so the numbers move with your connection — the point
 * is the ratio between the rows of one run, not any single figure. Nothing here
 * runs in CI: it is a `.bench.ts`, which `bun test` does not collect.
 *
 * @see ./README.md for what the numbers mean and why they come out this way.
 */
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import GithubAPI from '../src/github-api.js';
import { attachGitHistory } from '../src/history.js';
import { formatTable, type Measurement } from './report.js';

const run = promisify(execFile);

/** Repositories measured when none are named on the command line. */
const DEFAULT_REPOS = ['sindresorhus/is', 'expressjs/express', 'vitejs/vite'];

/**
 * Total size of a directory tree, in bytes.
 *
 * Included because it is half the explanation: a shallow tarball and a full
 * clone of the same repository differ by however many megabytes of history the
 * project has accumulated, and that difference is what the download is not
 * waiting for.
 *
 * @param target - Directory to measure.
 * @returns Size in bytes, counting file contents only.
 */
function directorySize(target: string): number {
  let total = 0;

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) total += directorySize(full);
    else if (entry.isFile()) total += fs.statSync(full).size;
  }

  return total;
}

/**
 * Times one strategy, cleaning up after itself whether or not it worked.
 *
 * @param strategy - Label for the report.
 * @param repo - `owner/repo` being measured.
 * @param work - Receives a scratch directory; returns when the *files* are
 *   ready, and optionally a promise that settles when history is ready.
 * @returns The measurement.
 */
async function measure(
  strategy: string,
  repo: string,
  work: (workdir: string) => Promise<{ dir: string; history?: Promise<unknown> }>
): Promise<Measurement> {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-bench-'));
  const started = performance.now();

  try {
    const { dir, history } = await work(workdir);
    const timeToFiles = performance.now() - started;

    let timeToHistory: number | null = null;
    if (history) {
      await history;
      timeToHistory = performance.now() - started;
    }

    return {
      strategy,
      repo,
      timeToFiles,
      timeToHistory,
      bytesOnDisk: directorySize(dir),
    };
  } catch (error: any) {
    return { strategy, repo, timeToFiles: 0, timeToHistory: null, error: error.message };
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}

/**
 * Runs every strategy against one repository.
 *
 * The four rows are the four honest answers to "get me this repo":
 *
 * - **git clone** — the baseline, and the only other row that ends with history.
 * - **git clone --depth=1** — the usual "but you can make clone fast" reply.
 *   It is fast, and it leaves you without the history you cloned for.
 * - **git0** — tarball, extracted as it streams.
 * - **git0 --history** — tarball first, history attached afterwards. Its
 *   *time to files* is the row above; its *time to history* is where it lands
 *   relative to `git clone`.
 *
 * @param repo - `owner/repo` to measure.
 * @returns One measurement per strategy.
 */
async function benchmarkRepo(repo: string): Promise<Measurement[]> {
  const url = `https://github.com/${repo}`;
  const name = repo.split('/')[1];
  const github = new GithubAPI();

  const results: Measurement[] = [];

  results.push(
    await measure('git clone', repo, async workdir => {
      const dir = path.join(workdir, name);
      await run('git', ['clone', '--quiet', url, dir]);
      return { dir };
    })
  );

  results.push(
    await measure('git clone --depth=1', repo, async workdir => {
      const dir = path.join(workdir, name);
      await run('git', ['clone', '--quiet', '--depth=1', url, dir]);
      return { dir };
    })
  );

  results.push(
    await measure('git0', repo, async workdir => {
      process.chdir(workdir);
      const dir = await github.downloadRepo(url);
      return { dir };
    })
  );

  results.push(
    await measure('git0 --history', repo, async workdir => {
      process.chdir(workdir);
      const dir = await github.downloadRepo(url);
      // Started once the files exist, exactly as the CLI does it — the caller
      // stops the "time to files" clock before this is awaited.
      return { dir, history: attachGitHistory(dir, url) };
    })
  );

  return results;
}

/**
 * Entry point: measures every named repository and prints one table each.
 */
async function main(): Promise<void> {
  const repos = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const cwd = process.cwd();

  for (const repo of repos.length ? repos : DEFAULT_REPOS) {
    console.log(`\n### ${repo}\n`);
    const results = await benchmarkRepo(repo);
    process.chdir(cwd);
    console.log(formatTable(results));
  }
}

main();
