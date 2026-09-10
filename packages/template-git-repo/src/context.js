/**
 * Work out everything the templates need to be substituted with, from the repo
 * itself, so the common case is one command and no flags.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Walk up from `start` to the directory holding `.git`.
 *
 * Templating the wrong directory is the one failure that is annoying to undo —
 * running from `packages/foo` must not scatter a `.github/` in there — so the
 * root is found rather than assumed.
 *
 * @param {string} [start]
 * @returns {string | null}
 */
export function findRepoRoot(start = process.cwd()) {
  let dir = path.resolve(start);

  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string} trimmed stdout, or '' if git failed
 */
function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/**
 * `owner/repo` from a remote URL, in any of the shapes git remotes come in:
 * https, ssh, `git@`, with or without `.git`.
 *
 * @param {string} url
 * @returns {string | null}
 */
export function parseRepoSlug(url) {
  if (!url) return null;

  const match = url.match(/(?:github\.com[/:])([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) return null;

  return `${match[1]}/${match[2]}`;
}

/**
 * The default branch as the *remote* sees it, falling back to the current
 * branch.
 *
 * This matters more than it looks: the CI status badge takes `?branch=`, and a
 * badge pinned to the wrong branch shows a passing repo as failing (or worse,
 * the reverse) for as long as nobody checks.
 *
 * @param {string} root
 * @returns {string}
 */
export function detectDefaultBranch(root) {
  const symbolic = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], root);
  if (symbolic) return symbolic.replace(/^origin\//, '');

  const current = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  // A detached HEAD reports "HEAD", which is not a branch name.
  if (current && current !== 'HEAD') return current;

  return 'main';
}

/**
 * Which package manager the repo already uses. The workflows run its `install`,
 * so guessing wrong means CI installs with a tool the lockfile is not for.
 *
 * @param {string} root
 * @returns {'bun' | 'pnpm' | 'yarn' | 'npm'}
 */
export function detectPackageManager(root) {
  const manifest = readJson(path.join(root, 'package.json'));
  const declared = manifest?.packageManager;
  if (typeof declared === 'string') {
    const name = declared.split('@')[0];
    if (['bun', 'pnpm', 'yarn', 'npm'].includes(name)) return name;
  }

  if (fs.existsSync(path.join(root, 'bun.lock')) || fs.existsSync(path.join(root, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';

  return 'npm';
}

/**
 * @param {string} file
 * @returns {Record<string, any> | null}
 */
export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * The directory the workspace globs point at (`packages/*` -> `packages`),
 * which the publish workflow needs for `git add` and for the build order.
 *
 * @param {Record<string, any> | null} manifest
 * @returns {string}
 */
export function detectPackagesDir(manifest) {
  const globs = Array.isArray(manifest?.workspaces)
    ? manifest.workspaces
    : (manifest?.workspaces?.packages ?? []);

  const glob = globs.find((entry) => entry.endsWith('/*'));
  return glob ? glob.slice(0, -2) : 'packages';
}

/**
 * The package to advertise in the npm badges: the first non-private workspace
 * package, or the root package if it is publishable.
 *
 * @param {string} root
 * @param {string} packagesDir
 * @returns {string | undefined}
 */
export function detectNpmPackage(root, packagesDir) {
  const rootManifest = readJson(path.join(root, 'package.json'));
  if (rootManifest?.name && !rootManifest.private) return rootManifest.name;

  const dir = path.join(root, packagesDir);
  if (!fs.existsSync(dir)) return undefined;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const pkg = readJson(path.join(dir, entry.name, 'package.json'));
    if (pkg?.name && !pkg.private) return pkg.name;
  }

  return undefined;
}

/**
 * Everything the templates and badges need, detected then overridden by flags.
 *
 * @param {{ cwd?: string, overrides?: Record<string, string | undefined> }} [options]
 * @returns {Record<string, any>}
 */
export function buildContext(options = {}) {
  const { cwd = process.cwd(), overrides = {} } = options;

  const root = findRepoRoot(cwd) ?? path.resolve(cwd);
  const manifest = readJson(path.join(root, 'package.json'));
  const packagesDir = overrides.packagesDir ?? detectPackagesDir(manifest);

  const repoSlug =
    overrides.repoSlug ??
    parseRepoSlug(git(['remote', 'get-url', 'origin'], root)) ??
    undefined;

  const [owner, repo] = repoSlug ? repoSlug.split('/') : [undefined, undefined];

  const context = {
    root,
    repoSlug,
    owner,
    repo,
    defaultBranch: overrides.defaultBranch ?? detectDefaultBranch(root),
    packageManager: overrides.packageManager ?? detectPackageManager(root),
    packagesDir,
    packagesGlob: `${packagesDir}/*`,
    npmPackage: overrides.npmPackage ?? detectNpmPackage(root, packagesDir),
    workflowFile: overrides.workflowFile ?? 'tests.yml',
    // Everything below has no sensible default — a badge that needs one of
    // these is skipped until it is passed in.
    doi: overrides.doi,
    docsUrl: overrides.docsUrl,
    apiUrl: overrides.apiUrl,
    youtubeUrl: overrides.youtubeUrl,
    uptimeUrl: overrides.uptimeUrl,
    testReportUrl: overrides.testReportUrl,
    discordId: overrides.discordId,
    discordInvite: overrides.discordInvite,
    stack: overrides.stack,
    cloudflareDeploy: overrides.cloudflareDeploy,
  };

  return context;
}

/**
 * Substitute `{{TOKEN}}` placeholders in a template file's text.
 *
 * Unknown tokens are left alone rather than replaced with `undefined`: a
 * workflow with a visible `{{THING}}` in it is an obvious bug, while one that
 * runs `bun install` as `undefined install` is a confusing one.
 *
 * @param {string} text
 * @param {Record<string, any>} context
 * @returns {string}
 */
export function substitute(text, context) {
  const values = {
    DEFAULT_BRANCH: context.defaultBranch,
    PACKAGE_MANAGER: context.packageManager,
    PACKAGES_DIR: context.packagesDir,
    PACKAGES_GLOB: context.packagesGlob,
    REPO_SLUG: context.repoSlug,
    OWNER: context.owner,
    REPO: context.repo,
  };

  return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, token) =>
    values[token] === undefined ? match : String(values[token]),
  );
}
