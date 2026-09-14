import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseArgs, runCli } from "../src/cli.js";
import { writeStorageState } from "../src/storage-state.js";
import { NOW_SECONDS, sampleState } from "./fixtures.js";

let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "tgl-cli-"));
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (line: string) => out.push(line), err: (line: string) => err.push(line), cwd } };
}

const text = (lines: string[]) => lines.join("\n");

describe("parseArgs", () => {
  it("reads --flag value", () => {
    expect(parseArgs(["check", "--file", "a.json"])).toEqual({ command: "check", flags: { file: "a.json" } });
  });

  it("reads --flag=value", () => {
    expect(parseArgs(["check", "--file=a.json"])).toEqual({ command: "check", flags: { file: "a.json" } });
  });

  it("treats a trailing flag as a boolean", () => {
    expect(parseArgs(["check", "--json"])).toEqual({ command: "check", flags: { json: true } });
  });

  it("does not swallow the next flag as a value", () => {
    expect(parseArgs(["check", "--json", "--file", "a.json"])).toEqual({
      command: "check",
      flags: { json: true, file: "a.json" },
    });
  });

  it("defaults to help with no arguments", () => {
    expect(parseArgs([])).toEqual({ command: "help", flags: {} });
  });
});

describe("init", () => {
  it("creates the directory, both gitignores, and prints the codegen command", async () => {
    const { out, io } = capture();

    const code = await runCli(["init"], io);

    expect(code).toBe(0);
    expect(fs.statSync(path.join(cwd, "playwright/.auth")).mode & 0o777).toBe(0o700);
    expect(fs.readFileSync(path.join(cwd, "playwright/.auth/.gitignore"), "utf8")).toMatch(/^\*$/m);
    expect(fs.readFileSync(path.join(cwd, ".gitignore"), "utf8")).toContain("playwright/.auth/");
    expect(text(out)).toContain(
      "npx playwright codegen --save-storage=playwright/.auth/google-test-user.json http://localhost:3000",
    );
  });

  it("uses the app URL it is given", async () => {
    const { out, io } = capture();

    await runCli(["init", "--url", "http://localhost:5173"], io);

    expect(text(out)).toContain("http://localhost:5173");
  });

  it("says so rather than duplicating rules on a second run", async () => {
    await runCli(["init"], capture().io);
    const { out, io } = capture();

    await runCli(["init"], io);

    expect(text(out)).toContain(".gitignore already covers");
  });

  it("tells you to sign in by hand, and why", async () => {
    const { out, io } = capture();

    await runCli(["init"], io);

    expect(text(out)).toMatch(/MFA, CAPTCHA and device checks/);
  });
});

describe("check", () => {
  it("reports a healthy session and exits 0", async () => {
    writeStorageState(path.join(cwd, "playwright/.auth/google-test-user.json"), sampleState());
    const { out, io } = capture();

    const code = await runCli(["check"], io);

    expect(code).toBe(0);
    expect(text(out)).toContain("Cookies      3 (1 session-only)");
    expect(text(out)).toContain("Google cookies present: yes");
  });

  it("never prints a cookie value", async () => {
    writeStorageState(path.join(cwd, "playwright/.auth/google-test-user.json"), sampleState());
    const { out, err, io } = capture();

    await runCli(["check"], io);

    const printed = text([...out, ...err]);
    for (const cookie of sampleState().cookies) expect(printed).not.toContain(cookie.value);
  });

  it("exits 1 and prints the codegen command when there is no session yet", async () => {
    const { err, io } = capture();

    const code = await runCli(["check"], io);

    expect(code).toBe(1);
    expect(text(err)).toContain("playwright codegen --save-storage=");
  });

  it("exits 2 for a file that exists but is not a storage state", async () => {
    const file = path.join(cwd, "playwright/.auth/google-test-user.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "<html>login page</html>");
    const { err, io } = capture();

    // Distinct from 1: a missing file means "capture one", a malformed file means
    // "something wrote the wrong thing there".
    expect(await runCli(["check"], io)).toBe(2);
    expect(text(err)).toMatch(/not valid JSON/);
  });

  it("exits 1 on an expired session and says how to refresh it", async () => {
    writeStorageState(path.join(cwd, "playwright/.auth/google-test-user.json"), {
      cookies: [{ ...sampleState().cookies[0], expires: NOW_SECONDS - 3600 }],
      origins: [],
    });
    const { err, io } = capture();

    expect(await runCli(["check"], io)).toBe(1);
    expect(text(err)).toContain("no longer usable");
    expect(text(err)).toContain("playwright codegen");
  });

  it("warns about cookies expiring inside the window", async () => {
    writeStorageState(path.join(cwd, "state.json"), {
      cookies: [{ ...sampleState().cookies[0], name: "soon", expires: Math.floor(Date.now() / 1000) + 600 }],
      origins: [],
    });
    const { out, io } = capture();

    await runCli(["check", "--file", "state.json", "--within", "30"], io);

    expect(text(out)).toContain("⚠ 1 cookie(s) expire within 30 minutes: soon");
  });

  it("emits machine-readable output for --json", async () => {
    writeStorageState(path.join(cwd, "state.json"), sampleState());
    const { out, io } = capture();

    await runCli(["check", "--file", "state.json", "--json"], io);

    const parsed = JSON.parse(text(out)) as { summary: { cookieCount: number }; expiringSoon: string[] };
    expect(parsed.summary.cookieCount).toBe(3);
    expect(JSON.stringify(parsed)).not.toContain("sess_abcdef0123456789");
  });

  it("says plainly when a session has no expiry to report", async () => {
    writeStorageState(path.join(cwd, "state.json"), { cookies: [sampleState().cookies[2]], origins: [] });
    const { out, io } = capture();

    await runCli(["check", "--file", "state.json"], io);

    expect(text(out)).toContain("dies with the browser");
  });
});

describe("redact", () => {
  it("prints a shareable copy and nothing secret", async () => {
    writeStorageState(path.join(cwd, "state.json"), sampleState());
    const { out, io } = capture();

    const code = await runCli(["redact", "--file", "state.json"], io);

    expect(code).toBe(0);
    const printed = text(out);
    expect(printed).toContain("«redacted");
    expect(printed).toContain("app_session");
    for (const cookie of sampleState().cookies) expect(printed).not.toContain(cookie.value);
    expect(() => JSON.parse(printed)).not.toThrow();
  });

  it("exits 1 with the reason when there is nothing to redact", async () => {
    const { err, io } = capture();

    expect(await runCli(["redact"], io)).toBe(1);
    expect(text(err)).toContain("Missing persisted auth state");
  });
});

describe("clear", () => {
  it("deletes the session", async () => {
    const file = path.join(cwd, "playwright/.auth/google-test-user.json");
    writeStorageState(file, sampleState());
    const { out, io } = capture();

    expect(await runCli(["clear"], io)).toBe(0);
    expect(fs.existsSync(file)).toBe(false);
    expect(text(out)).toContain("Deleted");
  });

  it("is not an error when there is nothing to delete", async () => {
    const { out, io } = capture();

    expect(await runCli(["clear"], io)).toBe(0);
    expect(text(out)).toContain("Nothing to clear");
  });
});

describe("help", () => {
  it("documents every command and restates the security boundary", async () => {
    const { out, io } = capture();

    expect(await runCli(["help"], io)).toBe(0);
    const help = text(out);
    for (const command of ["init", "check", "redact", "clear"]) expect(help).toContain(command);
    expect(help).toContain("never committed");
  });

  it("exits 1 and shows help for an unknown command", async () => {
    const { err, io } = capture();

    expect(await runCli(["frobnicate"], io)).toBe(1);
    expect(text(err)).toContain("Unknown command: frobnicate");
  });
});
