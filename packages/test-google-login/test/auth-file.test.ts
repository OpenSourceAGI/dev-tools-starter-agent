import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_AUTH_FILE,
  GITIGNORE_LINES,
  codegenCommand,
  ensureAuthDir,
  ensureGitignored,
  isIgnored,
  resolveAuthFile,
  writeAuthDirGitignore,
} from "../src/auth-file.js";

let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "tgl-auth-"));
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

describe("resolveAuthFile", () => {
  it("defaults to Playwright's documented location", () => {
    expect(resolveAuthFile({ cwd, env: {} })).toBe(path.join(cwd, DEFAULT_AUTH_FILE));
  });

  it("prefers an explicit file over the env var", () => {
    const resolved = resolveAuthFile({ cwd, file: "ci/state.json", env: { TEST_GOOGLE_LOGIN_STATE: "env.json" } });
    expect(resolved).toBe(path.join(cwd, "ci/state.json"));
  });

  it("falls back to the env var when no file is given", () => {
    const resolved = resolveAuthFile({ cwd, env: { TEST_GOOGLE_LOGIN_STATE: "env/state.json" } });
    expect(resolved).toBe(path.join(cwd, "env/state.json"));
  });

  it("leaves an absolute path alone", () => {
    const absolute = path.join(os.tmpdir(), "elsewhere", "state.json");
    expect(resolveAuthFile({ cwd, file: absolute, env: {} })).toBe(absolute);
  });
});

describe("ensureAuthDir", () => {
  it("creates the directory owner-only", () => {
    const file = path.join(cwd, "playwright/.auth/google-test-user.json");
    const dir = ensureAuthDir(file);

    expect(fs.existsSync(dir)).toBe(true);
    // The whole point: a directory holding live session cookies must not be
    // group- or world-readable on a shared machine.
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
  });

  it("tightens a directory that already existed with loose permissions", () => {
    const dir = path.join(cwd, "playwright/.auth");
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    fs.chmodSync(dir, 0o755);

    ensureAuthDir(path.join(dir, "state.json"));

    expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
  });
});

describe("writeAuthDirGitignore", () => {
  it("ignores everything inside the auth directory", () => {
    const written = writeAuthDirGitignore(path.join(cwd, "playwright/.auth/state.json"));
    expect(fs.readFileSync(written, "utf8")).toMatch(/^\*$/m);
  });
});

describe("isIgnored", () => {
  it.each([
    ["playwright/.auth/", "playwright/.auth/"],
    ["playwright/.auth", "playwright/.auth/"],
    ["/playwright/.auth/", "playwright/.auth/"],
    ["playwright/", "playwright/.auth/"],
  ])("treats %j as covering %j", (line, pattern) => {
    expect(isIgnored(line, pattern)).toBe(true);
  });

  it("ignores comments and blank lines", () => {
    expect(isIgnored("# playwright/.auth/\n\n", "playwright/.auth/")).toBe(false);
  });

  it("does not accept a negation as coverage", () => {
    expect(isIgnored("!playwright/.auth/", "playwright/.auth/")).toBe(false);
  });

  it("does not treat a sibling directory as coverage", () => {
    expect(isIgnored("playwright-report/", "playwright/.auth/")).toBe(false);
  });
});

describe("ensureGitignored", () => {
  it("creates .gitignore with every rule when there is none", () => {
    const result = ensureGitignored({ cwd });

    expect(result.added).toEqual([...GITIGNORE_LINES]);
    const written = fs.readFileSync(result.file, "utf8");
    for (const line of GITIGNORE_LINES) expect(written).toContain(line);
  });

  it("is idempotent — a second run adds nothing", () => {
    ensureGitignored({ cwd });
    const before = fs.readFileSync(path.join(cwd, ".gitignore"), "utf8");

    const second = ensureGitignored({ cwd });

    expect(second.added).toEqual([]);
    expect(second.alreadyIgnored).toEqual([...GITIGNORE_LINES]);
    expect(fs.readFileSync(path.join(cwd, ".gitignore"), "utf8")).toBe(before);
  });

  it("appends without disturbing what is already there", () => {
    fs.writeFileSync(path.join(cwd, ".gitignore"), "node_modules\ndist\n");

    ensureGitignored({ cwd });

    const written = fs.readFileSync(path.join(cwd, ".gitignore"), "utf8");
    expect(written.startsWith("node_modules\ndist\n")).toBe(true);
    expect(written).toContain("playwright/.auth/");
  });

  it("adds a separating newline to a file that did not end with one", () => {
    fs.writeFileSync(path.join(cwd, ".gitignore"), "node_modules");

    ensureGitignored({ cwd });

    const lines = fs.readFileSync(path.join(cwd, ".gitignore"), "utf8").split("\n");
    expect(lines[0]).toBe("node_modules");
    expect(lines).toContain("playwright/.auth/");
  });

  it("recognises a broader existing rule rather than duplicating it", () => {
    fs.writeFileSync(path.join(cwd, ".gitignore"), "playwright/\n.env\n.env.*\n!.env.example\n");

    const result = ensureGitignored({ cwd });

    expect(result.added).toEqual([]);
  });
});

describe("codegenCommand", () => {
  it("carries the state path the suite actually reads", () => {
    const command = codegenCommand({ cwd, file: "playwright/.auth/google-test-user.json" });

    expect(command).toBe(
      "npx playwright codegen --save-storage=playwright/.auth/google-test-user.json http://localhost:3000",
    );
  });

  it("uses the given base URL", () => {
    expect(codegenCommand({ cwd, baseUrl: "https://staging.example.test" })).toContain(
      "https://staging.example.test",
    );
  });
});
