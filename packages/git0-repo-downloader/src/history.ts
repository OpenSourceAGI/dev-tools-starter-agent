import chalk from 'chalk';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const run = promisify(execFile);

/**
 * Runs `git` with an argument array — never a shell string, so a repository URL
 * can never be read as extra arguments or as shell syntax.
 *
 * @param args - Arguments passed straight to `git`.
 * @param cwd - Working directory for the command.
 * @returns The command's stdout, trimmed.
 * @throws Whatever `execFile` throws on a non-zero exit.
 *
 * @internal
 */
async function git(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await run('git', args, { cwd, maxBuffer: 1024 * 1024 * 64 });
  return stdout.trim();
}

/**
 * Returns true when a usable `git` binary is on `PATH`.
 *
 * git0's whole point is working without one, so every history feature is gated
 * on this rather than assuming it.
 *
 * @example
 * if (!(await gitAvailable())) console.log('install git first');
 */
export async function gitAvailable(): Promise<boolean> {
  try {
    await git(['--version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rejects anything that is not a plain scheme-qualified remote.
 *
 * The URLs git0 builds are assembled from a parsed owner and repo name, so this
 * is belt-and-braces — but a value that reaches `git clone` decides what gets
 * executed and where it is written, and `ext::<command>`, a bare local path or
 * a leading `-` are the classic ways to turn a clone into something else.
 * `file://` is allowed because it is an ordinary remote and it is what the
 * tests clone from; the schemes that hand git a command to run are not.
 *
 * @param url - Remote URL to check.
 * @returns The URL, unchanged.
 * @throws When the URL is not an http(s), git or file remote.
 *
 * @internal
 */
function assertSafeRemote(url: string): string {
  if (!/^(https?|git|file):\/\/[^\s]+$/.test(url)) {
    throw new Error(`Refusing to clone from "${url}" — expected an https:// repository URL.`);
  }
  return url;
}

/**
 * Attaches a repository's full Git history to an already-extracted source
 * folder, turning it into a normal working clone.
 *
 * **Why this is not just `git clone`.** A clone is one serial operation: the
 * remote counts and packs every object in the repository's history, sends the
 * pack, and only then writes a working tree you can run. Nothing can start
 * until all of it finishes. git0 splits that in two — the codeload tarball is a
 * pre-made, already-compressed snapshot of one commit that extracts *while it
 * downloads*, so files exist and `bun install` can start almost immediately;
 * the history is then fetched into `.git` alongside the install, which is
 * mostly waiting on the network and on npm anyway. The end state is identical
 * to a clone. The difference is that the thing you were trying to do started at
 * the beginning rather than at the end. See `benchmark/` for the numbers.
 *
 * The clone lands in a temporary directory first and is renamed into place only
 * once it succeeds, so an interrupted download leaves no half-written `.git`
 * for the next command to trip over.
 *
 * @param extractPath - Directory holding the already-extracted source.
 * @param repoUrl - `https://github.com/owner/repo` to fetch history from.
 * @param options.mirror - Use `--mirror` instead of `--bare`, keeping every ref
 *   (notes, remote-tracking refs, pull refs) rather than branches and tags.
 * @param options.ref - Branch or tag the source snapshot came from, so the
 *   working tree is matched against the right commit.
 * @returns Path to the created `.git` directory.
 * @throws When `git` is missing, the clone fails, or `.git` already exists.
 *
 * @example
 * await attachGitHistory('/work/react', 'https://github.com/facebook/react');
 * // /work/react is now a normal git repo: `git log` works, `git status` is clean
 */
export async function attachGitHistory(
  extractPath: string,
  repoUrl: string,
  options: { mirror?: boolean; ref?: string } = {}
): Promise<string> {
  assertSafeRemote(repoUrl);

  const gitDir = path.join(extractPath, '.git');
  if (fs.existsSync(gitDir)) {
    throw new Error(`${gitDir} already exists — not overwriting it.`);
  }
  if (!(await gitAvailable())) {
    throw new Error('git is not installed, so the history cannot be downloaded.');
  }

  const staging = fs.mkdtempSync(path.join(path.dirname(extractPath), '.git0-history-'));
  const cloned = path.join(staging, 'repo.git');

  try {
    await git(['clone', options.mirror ? '--mirror' : '--bare', '--quiet', repoUrl, cloned]);
    fs.renameSync(cloned, gitDir);
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  fs.rmSync(staging, { recursive: true, force: true });

  // A bare clone has no working tree and no remote-tracking refs. Both are
  // needed for the extracted files to read as a normal checkout.
  await git(['config', '--local', '--bool', 'core.bare', 'false'], extractPath);
  await git(['config', '--local', '--bool', 'core.logallrefupdates', 'true'], extractPath);
  await git(
    ['config', '--local', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'],
    extractPath
  );
  await git(['fetch', '--quiet', 'origin'], extractPath).catch(() => {});

  if (options.ref) {
    // The tarball came from this ref, so HEAD has to agree with what is on disk.
    await git(['symbolic-ref', 'HEAD', `refs/heads/${options.ref}`], extractPath).catch(() => {});
  }

  // Populates the index from HEAD without touching the files the tarball wrote,
  // which is what makes `git status` come back clean instead of showing the
  // whole repository as deleted.
  await git(['reset', '--mixed', '--quiet', 'HEAD'], extractPath).catch(() => {});

  return gitDir;
}

/**
 * Clones only a repository's history — no working files — into `<name>.git`.
 *
 * This is the `git clone --mirror` shape: the directory holds what would
 * normally live inside `.git`, placed at its root. `--mirror` is the default
 * here rather than `--bare` because the reason to want history without files is
 * almost always to keep or move it, and `--bare` quietly leaves out notes and
 * remote-tracking refs.
 *
 * @param repoUrl - `https://github.com/owner/repo` to mirror.
 * @param targetDir - Directory to create; must not already exist.
 * @param options.bare - Use `--bare` (branches and tags only) instead.
 * @returns The created directory's path.
 * @throws When `git` is missing, the target exists, or the clone fails.
 *
 * @example
 * await cloneHistoryOnly('https://github.com/facebook/react', '/work/react.git');
 * // → '/work/react.git' — inspect it with:
 * //   git --git-dir=/work/react.git log --all --oneline
 */
export async function cloneHistoryOnly(
  repoUrl: string,
  targetDir: string,
  options: { bare?: boolean } = {}
): Promise<string> {
  assertSafeRemote(repoUrl);

  if (fs.existsSync(targetDir)) {
    throw new Error(`${targetDir} already exists — not overwriting it.`);
  }
  if (!(await gitAvailable())) {
    throw new Error('git is not installed, so the history cannot be downloaded.');
  }

  await git(['clone', options.bare ? '--bare' : '--mirror', '--quiet', repoUrl, targetDir]);
  return targetDir;
}

/**
 * Kicks off {@link attachGitHistory} without blocking the caller, and reports
 * how it went when it lands.
 *
 * This is the lazy half of the feature. It is started *after* extraction has
 * finished — the files are on disk, so the IDE can open them and the installer
 * can run — and then left to overlap with those. History is the one part of a
 * clone nothing is waiting on: nobody needs `git log` to run `bun install`.
 *
 * Failures are reported and swallowed. A missing `git`, a private repository or
 * a dropped connection should cost the user their history, not the project they
 * just downloaded and are already working in.
 *
 * @param extractPath - Directory holding the extracted source.
 * @param repoUrl - Repository to fetch history from.
 * @param options - Forwarded to {@link attachGitHistory}.
 * @returns A promise the caller can await at the very end, which never rejects.
 *
 * @example
 * const history = attachGitHistoryLazily(dir, url); // returns immediately
 * await installDependencies(dir);                   // runs alongside it
 * await history;                                    // settle before exiting
 */
export function attachGitHistoryLazily(
  extractPath: string,
  repoUrl: string,
  options: { mirror?: boolean; ref?: string } = {}
): Promise<void> {
  console.log(chalk.blue('⏳ Fetching .git history in the background...'));

  return attachGitHistory(extractPath, repoUrl, options).then(
    () => {
      console.log(chalk.green('✅ Git history attached — `git log` is ready.'));
    },
    (error: any) => {
      console.log(chalk.yellow(`⚠️  Could not attach git history: ${error.message}`));
      console.log(chalk.gray('   The downloaded source is unaffected.'));
    }
  );
}
