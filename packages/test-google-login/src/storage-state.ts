/**
 * Reading, writing, inspecting and redacting a persisted browser session.
 *
 * Three things here are the point of the module:
 *
 * 1. **Writes are 0600.** A state file is a live credential; the default 0644 is
 *    not an acceptable mode for one.
 * 2. **Expiry is reported, not guessed at.** A suite that fails with "element not
 *    found" because the session lapsed overnight is the single most expensive
 *    failure mode of this approach, so {@link summarizeStorageState} answers
 *    "is this still good?" directly.
 * 3. **Nothing ever prints a value.** {@link redactStorageState} exists so there
 *    is an obvious safe thing to paste into an issue, and so the CLI has
 *    something to print that is not the cookies themselves.
 */
import fs from "node:fs";
import path from "node:path";

import { ensureAuthDir, codegenCommand } from "./auth-file.js";
import { parseStorageState, summarizeStorageState } from "./state-core.js";
import type { StorageState, StorageStateSummary } from "./types.js";

// Re-exported so the Node side has one place to import from; the Worker side
// imports `./state-core.js` directly and never reaches this module.
export * from "./state-core.js";

/** Thrown when a state file is absent — carries the command that creates one. */
export class MissingStorageStateError extends Error {
  readonly file: string;

  constructor(file: string, hint: string) {
    super(
      [
        `Missing persisted auth state: ${file}`,
        "",
        "Create it locally with:",
        `  ${hint}`,
        "",
        "Then complete Google sign-in manually with the dedicated test account and",
        "close the browser window — Playwright writes the state file on exit.",
      ].join("\n"),
    );
    this.name = "MissingStorageStateError";
    this.file = file;
  }
}

/**
 * Read a state file from disk.
 *
 * @throws {MissingStorageStateError} when the file is absent, with the codegen
 *   command that creates it — the message is the whole fix, so it belongs in the
 *   error rather than in documentation the reader has to go find.
 */
export function readStorageState(file: string, options: { baseUrl?: string; cwd?: string } = {}): StorageState {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new MissingStorageStateError(file, codegenCommand({ file, ...options }));
    }
    throw error;
  }
  return parseStorageState(text);
}

/**
 * Write a state file, owner-read-write only.
 *
 * The `chmod` after the write is not redundant: `writeFileSync`'s `mode` applies
 * only when it creates the file, so re-saving over an existing 0644 state file
 * would otherwise keep the loose mode it already had.
 */
export function writeStorageState(file: string, state: StorageState): string {
  ensureAuthDir(file);
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Windows has no POSIX mode. The file is written, which is what matters.
  }

  return path.resolve(file);
}

/**
 * Tighten an existing state file to 0600 and confirm it parses.
 *
 * For the files Playwright writes itself. `context.storageState({ path })` keeps
 * shapes this package has no type for — `indexedDB: true` adds one — so
 * round-tripping such a file through {@link writeStorageState} would quietly drop
 * data the app needs. This validates and chmods in place instead.
 *
 * @returns a summary of what the file holds, safe to log
 * @throws {InvalidStorageStateError} if the file is not a storage state after all
 */
export function hardenStorageStateFile(file: string): StorageStateSummary {
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Windows has no POSIX mode; the validation below is still worth doing.
  }

  return summarizeStorageState(parseStorageState(fs.readFileSync(file, "utf8")));
}

/**
 * Throw unless the state is still usable, with a message that says what to do.
 *
 * This is what a Playwright setup project calls: it turns "the dashboard heading
 * never appeared" into "the session expired 6 hours ago, re-capture it like this".
 */
export function assertStorageStateUsable(
  state: StorageState,
  options: { now?: number; file?: string; baseUrl?: string; cwd?: string } = {},
): StorageStateSummary {
  const summary = summarizeStorageState(state, options);
  if (summary.usable && !summary.expired) return summary;

  const ago =
    summary.expiresInSeconds === null
      ? "it carries no usable cookie"
      : `it expired ${Math.abs(Math.round(summary.expiresInSeconds / 60))} minutes ago`;

  throw new Error(
    [
      `The persisted session is no longer usable — ${ago}.`,
      "",
      "Re-capture it:",
      `  ${codegenCommand(options)}`,
    ].join("\n"),
  );
}
