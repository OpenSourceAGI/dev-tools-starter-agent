import chalk from 'chalk';
import gitUrlParse from 'git-url-parse';
import fs from 'fs';
import * as tar from 'tar';
import path from 'path';
import { getCurrentPlatform } from './platform.js';

/**
 * Returns `basePath` unchanged when the path does not yet exist on disk.
 * When it does exist, appends `-2`, `-3`, … until an unused path is found.
 *
 * Used so that downloading the same repo twice never silently overwrites the
 * first copy.
 *
 * @param basePath - Desired extraction directory path.
 * @returns An available directory path guaranteed not to exist yet.
 *
 * @example
 * // ./react already exists, ./react-2 does not
 * getAvailableDirectoryName('./react'); // → './react-2'
 */
export function getAvailableDirectoryName(basePath: string): string {
  if (!fs.existsSync(basePath)) return basePath;
  let counter = 2;
  while (true) {
    const candidate = `${basePath}-${counter}`;
    if (!fs.existsSync(candidate)) return candidate;
    counter++;
  }
}

/**
 * Cleans a repository-relative sub-path into the form the tarball uses:
 * forward slashes, no leading or trailing separator, no `.` segments.
 *
 * Every sub-path eventually becomes a prefix match against archive entry names
 * and then a path joined onto the extraction directory, so this is also the
 * gate that keeps a crafted path from escaping that directory: a `..` segment
 * is rejected outright rather than normalized away, because the only honest
 * reading of `packages/../../etc` in a "download this folder" argument is that
 * something is wrong with it.
 *
 * @param raw - Sub-path as typed or parsed out of a URL; `null`/empty means
 *   "the whole repository".
 * @returns The normalized sub-path, or `''` for the whole repository.
 * @throws When the path contains a `..` segment.
 *
 * @example
 * normalizeSubPath('/.continue/agents/'); // → '.continue/agents'
 * normalizeSubPath(null);                 // → ''
 * normalizeSubPath('../../etc');          // throws
 */
export function normalizeSubPath(raw?: string | null): string {
  if (!raw) return '';

  const segments = raw
    .replace(/\\/g, '/')
    .split('/')
    .filter(segment => segment.length > 0 && segment !== '.');

  if (segments.includes('..')) {
    throw new Error(`Invalid path "${raw}" — ".." segments are not allowed.`);
  }

  return segments.join('/');
}

/**
 * Builds the `tar` entry filter that keeps only a sub-path of the archive.
 *
 * GitHub wraps every tarball in one top-level directory named after the commit
 * (`owner-repo-abc1234/`), so the first segment of each entry name is dropped
 * before comparing. The filter runs in tar's *parser*, ahead of the unpacker's
 * `strip`, which is what makes filtering by the repository-relative path
 * possible at all — and what makes it cheap: a filtered-out entry is skipped in
 * the stream and never reaches the disk, so downloading one folder of a large
 * repository writes one folder.
 *
 * @param subPath - Normalized sub-path; `''` keeps everything.
 * @returns A predicate suitable for `tar.x({ filter })`.
 *
 * @example
 * const keep = subPathFilter('src/lib');
 * keep('react-abc123/src/lib/index.ts'); // → true
 * keep('react-abc123/src/library.ts');   // → false — prefix, not a path segment
 */
export function subPathFilter(subPath: string): (entryPath: string) => boolean {
  if (!subPath) return () => true;

  const prefix = `${subPath}/`;

  return (entryPath: string) => {
    const relative = entryPath
      .replace(/\\/g, '/')
      .split('/')
      .slice(1)
      .join('/')
      .replace(/\/+$/, '');

    return relative === subPath || relative.startsWith(prefix);
  };
}

/**
 * Moves an extracted sub-path up to the root of the extraction directory, so
 * `git0 owner/repo/tree/main/packages/ui` leaves the contents of `ui/` in the
 * target folder rather than `packages/ui/` nested inside it.
 *
 * Done after extraction rather than with a larger `tar` `strip` on purpose: the
 * right strip depth depends on whether the sub-path names a file or a folder,
 * which a `owner/repo/some/path` shorthand does not say. Hoisting reads that
 * off the disk instead of guessing, and costs one rename — the files never move
 * across a filesystem, because the staging directory is a sibling of the target.
 *
 * @param extractPath - Directory the tarball was extracted into.
 * @param subPath - Normalized sub-path that was extracted.
 * @throws When the sub-path is not present in the repository.
 *
 * @example
 * // extractPath/packages/ui/{package.json,src} → extractPath/{package.json,src}
 * hoistSubPath(extractPath, 'packages/ui');
 */
export function hoistSubPath(extractPath: string, subPath: string): void {
  if (!subPath) return;

  const landed = path.join(extractPath, subPath);
  if (!fs.existsSync(landed)) {
    throw new Error(
      `"${subPath}" was not found in this repository — check the path and the branch.`
    );
  }

  // Park the payload outside the target before clearing the wrapper directories,
  // otherwise removing `packages/` would take `packages/ui` with it.
  const staging = fs.mkdtempSync(path.join(path.dirname(extractPath), '.git0-hoist-'));
  const parked = path.join(staging, 'payload');

  try {
    fs.renameSync(landed, parked);
    fs.rmSync(path.join(extractPath, subPath.split('/')[0]), { recursive: true, force: true });

    if (fs.statSync(parked).isDirectory()) {
      for (const child of fs.readdirSync(parked)) {
        fs.renameSync(path.join(parked, child), path.join(extractPath, child));
      }
    } else {
      fs.renameSync(parked, path.join(extractPath, path.basename(subPath)));
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/**
 * The folder name a sub-path download should default to.
 *
 * The repository name is the wrong default here — downloading
 * `debate-ai.com/.continue/agents` into a folder called `debate-ai.com` claims
 * to hold a site and holds two config files. The last segment of the path is
 * what the user asked for, except when the path names a *file*, where the
 * enclosing folder is the meaningful name and the file keeps its own.
 *
 * @param subPath - Normalized sub-path.
 * @param type - `'blob'` or `'tree'` when a GitHub URL said which; omitted for
 *   the `owner/repo/some/path` shorthand, which is treated as a folder.
 * @returns The folder name, or `undefined` to fall back to the repository name.
 *
 * @example
 * subPathDirName('packages/ui', 'tree');              // → 'ui'
 * subPathDirName('.continue/agents/x.yaml', 'blob');  // → 'agents'
 * subPathDirName('readme.md', 'blob');                // → undefined (repo name)
 */
export function subPathDirName(subPath: string, type?: string): string | undefined {
  if (!subPath) return undefined;

  const segments = subPath.split('/');
  if (type === 'blob') segments.pop();

  return segments.pop();
}

/**
 * Streams a GitHub tarball response directly into a `tar` extractor.
 *
 * `strip: 1` removes the top-level directory that GitHub adds to every
 * tarball (e.g. `owner-repo-abc1234/`) so files land directly in
 * `extractPath`.
 *
 * When `subPath` is set, entries outside it are dropped as they are parsed —
 * they are never written, so a partial download really is partial.
 *
 * @param res - The `ReadableStream` body from the GitHub API response.
 * @param extractPath - Absolute directory to extract into (must already exist).
 * @param subPath - Normalized repository-relative path to limit extraction to;
 *   `''` extracts the whole repository.
 * @returns Promise that resolves when extraction is complete.
 *
 * @internal
 */
async function streamTarball(
  res: ReadableStream,
  extractPath: string,
  subPath = ''
): Promise<void> {
  const { Readable } = await import('stream');
  const nodeStream = Readable.fromWeb(res);
  await new Promise<void>((resolve, reject) => {
    nodeStream
      .pipe(tar.x({ C: extractPath, strip: 1, filter: subPathFilter(subPath) }))
      .on('finish', resolve)
      .on('error', reject);
  });
}

/**
 * Streams a GitHub API response body directly to a file on disk.
 *
 * @param res - The `ReadableStream` body from the GitHub API response.
 * @param dest - Absolute path of the file to create/overwrite.
 * @returns Promise that resolves when the file is fully written.
 *
 * @internal
 */
async function streamToFile(res: ReadableStream, dest: string): Promise<void> {
  const { Readable } = await import('stream');
  const nodeStream = Readable.fromWeb(res);
  await new Promise<void>((resolve, reject) => {
    nodeStream
      .pipe(fs.createWriteStream(dest))
      .on('finish', resolve)
      .on('error', reject);
  });
}

/**
 * Downloads a GitHub repository tarball and extracts it into a local directory.
 *
 * The function first attempts to download the `master` branch; if that request
 * returns an error it retries with `main`. A `ref` from a deep GitHub URL
 * (`/tree/<branch>/…`) is used as-is and skips that fallback. The extracted
 * directory name is derived from the repository — or from the sub-path, when
 * one is given — with a numeric suffix appended when the target already exists
 * (see {@link getAvailableDirectoryName}).
 *
 * `subPath` limits the download to one folder or file of the repository. GitHub
 * serves the whole tarball either way, but the entries outside the sub-path are
 * discarded in the stream rather than written, and what is kept is hoisted to
 * the root of the target folder (see {@link hoistSubPath}).
 *
 * @param callGithub - Pre-configured `grab` instance bound to the GitHub API.
 * @param repo - GitHub URL (`https://github.com/owner/repo`) or `owner/repo`.
 * @param targetDir - Optional custom folder name; defaults to the repo name, or
 *   to the sub-path's own name when `subPath` is set.
 * @param options.subPath - Repository-relative folder or file to limit the
 *   download to.
 * @param options.subPathType - `'blob'` or `'tree'` when the URL said which.
 * @param options.ref - Branch, tag or commit to download.
 * @returns Absolute path of the directory the repo was extracted into.
 *
 * @example
 * const dir = await downloadRepo(callGithub, 'https://github.com/facebook/react');
 * // → '/current/working/dir/react'
 *
 * @example
 * // Just one folder of a large repo:
 * const dir = await downloadRepo(callGithub, 'facebook/react', null, {
 *   subPath: 'packages/react-dom',
 *   subPathType: 'tree',
 * });
 * // → '/current/working/dir/react-dom'
 */
export async function downloadRepo(
  callGithub: Function,
  repo: string,
  targetDir: string | null = null,
  options: { subPath?: string | null; subPathType?: string; ref?: string } = {}
): Promise<string> {
  const parsed = gitUrlParse(repo);

  // GitHub tarballs for forks include the fork chain in `owner`, e.g. "upstream/fork".
  // We only want the last segment.
  if (parsed.owner.includes('/')) {
    parsed.owner = parsed.owner.split('/').slice(-1)[0];
  }

  const subPath = normalizeSubPath(options.subPath);
  const defaultName =
    (targetDir?.length ? targetDir : undefined) ??
    subPathDirName(subPath, options.subPathType) ??
    parsed.name;

  const defaultDir = path.resolve(process.cwd(), defaultName);
  const extractPath = getAvailableDirectoryName(defaultDir);

  fs.mkdirSync(extractPath, { recursive: true });

  const what = subPath ? `${parsed.name}/${subPath}` : parsed.name;
  console.log(chalk.blue(`📦 Downloading ${what} into ${path.basename(extractPath)}...`));

  const requestedRef = options.ref || (parsed as any).ref || '';
  const defaultBranch = requestedRef || (parsed as any).default_branch || 'master';
  const tarballUrl = `/repos/${parsed.owner}/${parsed.name}/tarball/${defaultBranch}`;
  const params = { onStream: (res: ReadableStream) => streamTarball(res, extractPath, subPath) };

  let response = await callGithub(tarballUrl, params);
  // Only guess at the branch when the caller did not name one.
  if (response.error && !requestedRef) {
    response = await callGithub(tarballUrl.replace(/\/master$/, '/main'), params);
  }

  // A failed request leaves an empty directory behind. Saying so beats letting
  // the next step report a missing sub-path, or the install step report a
  // project with no files in it.
  if (response.error) {
    fs.rmSync(extractPath, { recursive: true, force: true });
    throw new Error(
      `Could not download ${parsed.owner}/${parsed.name}` +
        `${requestedRef ? ` at ${requestedRef}` : ''}: ${response.error}`
    );
  }

  hoistSubPath(extractPath, subPath);

  return extractPath;
}

/**
 * Downloads a single release asset binary from GitHub to a local file.
 *
 * After a successful download:
 * - On non-Windows, extension-less files are made executable (`chmod 755`).
 * - Platform-specific install instructions are printed via
 *   {@link printInstallInstructions}.
 *
 * @param callGithub - Pre-configured `grab` instance bound to the GitHub API.
 * @param packageURL - Direct HTTPS download URL for the asset.
 * @param downloadPath - Absolute local file path to write the asset to.
 * @returns The `downloadPath` on success.
 * @throws When the download request fails.
 *
 * @example
 * await downloadPackage(callGithub,
 *   'https://github.com/user/repo/releases/download/v1.0/app-linux-x64',
 *   '/tmp/app-linux-x64'
 * );
 */
export async function downloadPackage(
  callGithub: Function,
  packageURL: string,
  downloadPath: string
): Promise<string> {
  const fileName = path.basename(downloadPath);

  console.log(chalk.blue(`📦 Downloading ${fileName}...`));

  try {
    await callGithub(packageURL, {
      onStream: (res: ReadableStream) => streamToFile(res, downloadPath),
    });

    console.log(chalk.green(`✅ Downloaded ${fileName} to ${downloadPath}`));

    if (process.platform !== 'win32' && !fileName.includes('.')) {
      try {
        fs.chmodSync(downloadPath, '755');
        console.log(chalk.green(`✅ Made ${fileName} executable`));
      } catch {
        console.log(chalk.yellow(`⚠️  Could not make ${fileName} executable`));
      }
    }

    printInstallInstructions(downloadPath, fileName);
    return downloadPath;
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to download ${fileName}:`), error.message);
    throw error;
  }
}

/**
 * Prints platform-specific shell commands for installing or running a
 * downloaded asset.
 *
 * The output adapts to the current OS and the file's extension:
 * - **Windows**: `.exe` run command, `.msi` installer command.
 * - **macOS**: `.dmg` open command, `.pkg` installer command.
 * - **Linux**: `.deb` dpkg, `.rpm` rpm, `.AppImage` run command,
 *   extension-less binaries get a `mv` to `/usr/local/bin` suggestion.
 *
 * @param filePath - Absolute path of the downloaded file.
 * @param fileName - Basename of the downloaded file (used for extension checks).
 *
 * @example
 * printInstallInstructions('/tmp/myapp', 'myapp');
 * // Prints:
 * //   Binary is ready to use:
 * //   "/tmp/myapp"
 * //   Consider moving to PATH:
 * //   sudo mv "/tmp/myapp" /usr/local/bin/
 */
export function printInstallInstructions(filePath: string, fileName: string): void {
  const platform = getCurrentPlatform();

  if (platform.platform === 'win32') {
    if (fileName.endsWith('.exe')) {
      console.log(chalk.white('  Run the executable:'));
      console.log(chalk.gray(`  ${filePath}`));
    } else if (fileName.endsWith('.msi')) {
      console.log(chalk.white('  Install the MSI package:'));
      console.log(chalk.gray(`  msiexec /i "${filePath}"`));
    }
    return;
  }

  if (platform.platform === 'darwin') {
    if (fileName.endsWith('.dmg')) {
      console.log(chalk.white('  Mount and install the DMG:'));
      console.log(chalk.gray(`  open "${filePath}"`));
    } else if (fileName.endsWith('.pkg')) {
      console.log(chalk.white('  Install the package:'));
      console.log(chalk.gray(`  sudo installer -pkg "${filePath}" -target /`));
    }
    return;
  }

  // Linux / other Unix
  if (fileName.endsWith('.deb')) {
    console.log(chalk.white('  Install the DEB package:'));
    console.log(chalk.gray(`  sudo dpkg -i "${filePath}"`));
  } else if (fileName.endsWith('.rpm')) {
    console.log(chalk.white('  Install the RPM package:'));
    console.log(chalk.gray(`  sudo rpm -i "${filePath}"`));
  } else if (fileName.endsWith('.AppImage')) {
    console.log(chalk.white('  Run the AppImage:'));
    console.log(chalk.gray(`  chmod +x "${filePath}" && "${filePath}"`));
  } else if (!fileName.includes('.')) {
    console.log(chalk.white('  Binary is ready to use:'));
    console.log(chalk.gray(`  "${filePath}"`));
    console.log(chalk.white('  Consider moving to PATH:'));
    console.log(chalk.gray(`  sudo mv "${filePath}" /usr/local/bin/`));
  }
}
