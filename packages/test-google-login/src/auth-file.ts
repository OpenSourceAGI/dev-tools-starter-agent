/**
 * Where the persisted session lives, and keeping it out of git.
 *
 * Playwright's documented location is `playwright/.auth/`, ignored in git and
 * read back from a setup project. This module owns that path and the `.gitignore`
 * edit, because "the password is in .env so we're fine" is the mistake this
 * package exists to prevent: the state file is the credential, not the password.
 */
import fs from "node:fs";
import path from "node:path";

/** Playwright's documented directory for persisted auth state. */
export const DEFAULT_AUTH_DIR = "playwright/.auth";

/** The state file this package reads and writes unless told otherwise. */
export const DEFAULT_AUTH_FILE = `${DEFAULT_AUTH_DIR}/google-test-user.json`;

/** Env var that overrides the state file path, for CI layouts that differ. */
export const STATE_PATH_ENV = "TEST_GOOGLE_LOGIN_STATE";

/**
 * The lines `init` adds to `.gitignore`.
 *
 * `.env` is here too. Not scope creep: the same bootstrap that produces a state
 * file is the one that puts `GOOGLE_TEST_PASSWORD` in a local `.env`, and a repo
 * that ignores one but not the other is still one `git add -A` from a leak.
 */
export const GITIGNORE_LINES = [
  "playwright/.auth/",
  ".env",
  ".env.*",
  "!.env.example",
] as const;

export interface AuthFileOptions {
  /** Project root. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit path, absolute or relative to `cwd`. */
  file?: string;
  /** Environment to read `TEST_GOOGLE_LOGIN_STATE` from. Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
}

/**
 * The absolute path of the state file, resolving explicit argument → env var →
 * default, in that order.
 *
 * @example
 * resolveAuthFile()                                  // <cwd>/playwright/.auth/google-test-user.json
 * resolveAuthFile({ file: "ci/state.json" })         // <cwd>/ci/state.json
 */
export function resolveAuthFile(options: AuthFileOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const file = options.file || env[STATE_PATH_ENV] || DEFAULT_AUTH_FILE;

  return path.isAbsolute(file) ? file : path.resolve(cwd, file);
}

/**
 * Create the directory a state file goes in, owner-only.
 *
 * `0o700` rather than the default `0o755`: on a shared CI box or a multi-user
 * machine, a world-readable directory holding session cookies is the leak, and
 * nobody notices because the file itself looks fine.
 *
 * @returns the absolute directory path
 */
export function ensureAuthDir(file: string): string {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  // `mkdirSync` applies `mode` only to directories it creates, and umask can trim
  // it. Re-assert so an already-existing `playwright/.auth` is tightened too.
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Windows and some mounts do not implement chmod. The directory exists, which
    // is the part the caller needs; permissions are best-effort there.
  }

  return dir;
}

/**
 * A second line of defence inside the auth directory itself: `playwright/.auth/.gitignore`
 * containing `*`.
 *
 * The root `.gitignore` can be reverted, reformatted or replaced wholesale by a
 * tool; a `.gitignore` living in the directory travels with it and keeps the
 * state file ignored even if someone adds `!playwright/**` upstream of it.
 */
export function writeAuthDirGitignore(file: string): string {
  const dir = ensureAuthDir(file);
  const target = path.join(dir, ".gitignore");

  fs.writeFileSync(
    target,
    [
      "# Everything in this directory is a live browser session.",
      "# Nothing here is ever committed — see test-google-login's README.",
      "*",
      "",
    ].join("\n"),
  );

  return target;
}

/**
 * Does `.gitignore` already cover this pattern?
 *
 * Compares ignore *lines*, not paths: a real match check would mean
 * reimplementing gitignore globbing, and being over-eager here means wrongly
 * concluding a repo is safe. So `playwright/.auth/` counts as covered by
 * `playwright/.auth`, `playwright/.auth/`, `/playwright/.auth/` or `playwright/`,
 * and nothing cleverer. A pattern we fail to recognise costs a duplicate line,
 * which is harmless.
 */
export function isIgnored(gitignore: string, pattern: string): boolean {
  const normalize = (line: string) => line.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const wanted = normalize(pattern);
  if (!wanted) return true;

  for (const raw of gitignore.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const candidate = normalize(line);
    if (candidate === wanted) return true;

    // A negation of exactly this pattern un-ignores it — treat as not covered.
    if (line.startsWith("!")) continue;

    // A parent directory entry (`playwright/`) covers everything under it.
    if (!candidate.includes("*") && wanted.startsWith(`${candidate}/`)) return true;
  }

  return false;
}

export interface GitignoreResult {
  /** Absolute path of the `.gitignore` written. */
  file: string;
  /** Patterns appended by this call. */
  added: string[];
  /** Patterns some existing line already covered. */
  alreadyIgnored: string[];
}

/**
 * Append whichever of {@link GITIGNORE_LINES} the repo does not already ignore.
 *
 * Idempotent, and never rewrites or reorders what is already there — a
 * `.gitignore` is hand-maintained and a tool that reformats it gets turned off.
 */
export function ensureGitignored(options: { cwd?: string; patterns?: readonly string[] } = {}): GitignoreResult {
  const cwd = options.cwd ?? process.cwd();
  const patterns = options.patterns ?? GITIGNORE_LINES;
  const file = path.join(cwd, ".gitignore");

  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

  const added: string[] = [];
  const alreadyIgnored: string[] = [];

  for (const pattern of patterns) {
    // A negation (`!.env.example`) is only meaningful next to the rule it negates,
    // so it is added whenever anything else in this batch is, and otherwise only
    // if absent verbatim.
    const covered = pattern.startsWith("!")
      ? existing.split(/\r?\n/).some((line) => line.trim() === pattern)
      : isIgnored(existing, pattern);

    (covered ? alreadyIgnored : added).push(pattern);
  }

  if (added.length > 0) {
    const parts: string[] = [];

    if (existing.length > 0) {
      parts.push(existing.endsWith("\n") ? existing : `${existing}\n`);
      parts.push("\n");
    }

    parts.push("# test-google-login: persisted browser sessions are credentials\n");
    for (const pattern of added) parts.push(`${pattern}\n`);

    fs.writeFileSync(file, parts.join(""));
  }

  return { file, added, alreadyIgnored };
}

/**
 * The `playwright codegen` command that captures a session by hand.
 *
 * Generated rather than pasted into prose, because it carries the state path —
 * and a README telling you to save state to a path the suite does not read is a
 * half-hour of confusion every time.
 */
export function codegenCommand(options: { file?: string; baseUrl?: string; cwd?: string } = {}): string {
  const cwd = options.cwd ?? process.cwd();
  const absolute = resolveAuthFile({ cwd, file: options.file });
  const relative = path.relative(cwd, absolute) || absolute;
  const baseUrl = options.baseUrl || "http://localhost:3000";

  return `npx playwright codegen --save-storage=${relative} ${baseUrl}`;
}
