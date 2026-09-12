/**
 * `test-google-login` — the four things you do to a state file from a terminal.
 *
 * `init` is the one that matters: it creates `playwright/.auth/` owner-only, makes
 * git ignore it two ways, and prints the `codegen` command with the right path
 * already in it. The rest exist so that inspecting a session never requires
 * opening it — `check` tells you whether it is still good, `redact` gives you
 * something safe to paste into an issue, `clear` removes it.
 */
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_AUTH_FILE,
  GITIGNORE_LINES,
  codegenCommand,
  ensureAuthDir,
  ensureGitignored,
  resolveAuthFile,
  writeAuthDirGitignore,
} from "./auth-file.js";
import {
  MissingStorageStateError,
  findExpiringCookies,
  readStorageState,
  redactStorageState,
  summarizeStorageState,
} from "./storage-state.js";

const HELP = `test-google-login — persist a Google test session for Playwright, safely

Usage
  test-google-login init [--file <path>] [--url <baseUrl>]
      Create the auth directory (0700), add the gitignore rules, and print the
      playwright codegen command that captures a session.

  test-google-login check [--file <path>] [--within <minutes>]
      Report what the stored session holds and whether it is still usable.
      Exits 1 when it is missing or expired, so CI can fail early and clearly.

  test-google-login redact [--file <path>]
      Print the state with every cookie and localStorage value replaced by its
      length. This is the only form that is safe to share.

  test-google-login clear [--file <path>]
      Delete the stored session.

Options
  --file <path>     State file. Default: ${DEFAULT_AUTH_FILE}
                    (or $TEST_GOOGLE_LOGIN_STATE)
  --url <baseUrl>   App URL used in the codegen command. Default: http://localhost:3000
  --within <mins>   'check' warns about cookies expiring within this window. Default: 60
  --json            Machine-readable output for 'check'.

The state file contains live cookies and tokens. Treat it exactly like the
password that produced it: dedicated Google test account only, never committed,
never a public CI artifact, never pasted into a log.
`;

/** Parse `--flag value` and `--flag=value`, collecting the rest positionally. */
export function parseArgs(argv: string[]): { command: string; flags: Record<string, string | true> } {
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [name, inline] = arg.slice(2).split("=", 2);
    if (inline !== undefined) {
      flags[name] = inline;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      flags[name] = next;
      i += 1;
    } else {
      flags[name] = true;
    }
  }

  return { command: positional[0] ?? "help", flags };
}

type Writer = (line: string) => void;

export interface CliIo {
  out?: Writer;
  err?: Writer;
  cwd?: string;
}

/**
 * Run the CLI.
 *
 * Returns an exit code rather than calling `process.exit`, and takes its writers
 * as arguments, so the whole surface is testable without spawning anything.
 */
export async function runCli(argv: string[], io: CliIo = {}): Promise<number> {
  const out = io.out ?? ((line: string) => console.log(line));
  const err = io.err ?? ((line: string) => console.error(line));
  const cwd = io.cwd ?? process.cwd();

  const { command, flags } = parseArgs(argv);
  const file = resolveAuthFile({ cwd, file: typeof flags.file === "string" ? flags.file : undefined });
  const baseUrl = typeof flags.url === "string" ? flags.url : undefined;

  switch (command) {
    case "init":
      return init({ cwd, file, baseUrl, out });

    case "check":
      return check({ cwd, file, baseUrl, flags, out, err });

    case "redact":
      return redact({ file, out, err });

    case "clear":
      return clear({ cwd, file, out });

    case "help":
    case "--help":
    case "-h":
      out(HELP);
      return 0;

    default:
      err(`Unknown command: ${command}\n`);
      err(HELP);
      return 1;
  }
}

function init(options: { cwd: string; file: string; baseUrl?: string; out: Writer }): number {
  const { cwd, file, baseUrl, out } = options;

  const dir = ensureAuthDir(file);
  const nested = writeAuthDirGitignore(file);
  const gitignore = ensureGitignored({ cwd });

  out(`Created ${path.relative(cwd, dir) || dir}/ (mode 0700)`);
  out(`Wrote   ${path.relative(cwd, nested)} — ignores everything in that directory`);

  if (gitignore.added.length > 0) {
    out(`Added to .gitignore: ${gitignore.added.join(", ")}`);
  } else {
    out(`.gitignore already covers: ${GITIGNORE_LINES.join(", ")}`);
  }

  out("");
  out("Now capture a session by hand — this avoids automating Google's password form,");
  out("which is what MFA, CAPTCHA and device checks all break:");
  out("");
  out(`  ${codegenCommand({ cwd, file, baseUrl })}`);
  out("");
  out("In the window that opens: click your app's 'Sign in with Google', sign in with");
  out("the dedicated test account, finish the redirect back to your app, confirm you");
  out("are on an authenticated page, then close the window. Playwright writes the");
  out("state file on exit.");

  return 0;
}

function check(options: {
  cwd: string;
  file: string;
  baseUrl?: string;
  flags: Record<string, string | true>;
  out: Writer;
  err: Writer;
}): number {
  const { cwd, file, baseUrl, flags, out, err } = options;

  let state;
  try {
    state = readStorageState(file, { cwd, baseUrl });
  } catch (error) {
    err((error as Error).message);
    return error instanceof MissingStorageStateError ? 1 : 2;
  }

  const summary = summarizeStorageState(state);
  const withinMinutes = Number.parseFloat(String(flags.within ?? "60"));
  const expiring = findExpiringCookies(state, { withinMs: withinMinutes * 60_000 });

  if (flags.json) {
    out(JSON.stringify({ file, summary, expiringSoon: expiring.map((cookie) => cookie.name) }, null, 2));
  } else {
    out(`State file   ${path.relative(cwd, file) || file}`);
    out(`Cookies      ${summary.cookieCount} (${summary.sessionCookies} session-only)`);
    out(`Domains      ${summary.domains.join(", ") || "none"}`);
    out(`Origins      ${summary.originCount}`);
    out(`Google cookies present: ${summary.hasGoogleCookies ? "yes" : "no"}`);

    if (summary.expiresInSeconds === null) {
      out("Expiry       no cookie carries one — this session dies with the browser");
    } else {
      const minutes = Math.round(summary.expiresInSeconds / 60);
      out(
        summary.expiresInSeconds > 0
          ? `Expiry       earliest in ${minutes} minutes`
          : `Expiry       lapsed ${Math.abs(minutes)} minutes ago`,
      );
    }

    if (expiring.length > 0 && summary.usable) {
      out("");
      out(
        `⚠ ${expiring.length} cookie(s) expire within ${withinMinutes} minutes: ` +
          `${expiring.map((cookie) => cookie.name).join(", ")}`,
      );
      out(`  Re-capture before a long run: ${codegenCommand({ cwd, file, baseUrl })}`);
    }
  }

  if (!summary.usable || summary.expired) {
    err("");
    err("This session is no longer usable. Re-capture it:");
    err(`  ${codegenCommand({ cwd, file, baseUrl })}`);
    return 1;
  }

  return 0;
}

function redact(options: { file: string; out: Writer; err: Writer }): number {
  try {
    const state = readStorageState(options.file);
    options.out(JSON.stringify(redactStorageState(state), null, 2));
    return 0;
  } catch (error) {
    options.err((error as Error).message);
    return 1;
  }
}

function clear(options: { cwd: string; file: string; out: Writer }): number {
  const { cwd, file, out } = options;

  if (!fs.existsSync(file)) {
    out(`Nothing to clear — ${path.relative(cwd, file) || file} does not exist.`);
    return 0;
  }

  fs.rmSync(file);
  out(`Deleted ${path.relative(cwd, file) || file}`);
  return 0;
}
