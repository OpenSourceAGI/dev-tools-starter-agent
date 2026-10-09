import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  execSync: vi.fn(),
  answers: [],
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("child_process", () => ({ execSync: h.execSync, default: { execSync: h.execSync } }));
vi.mock("readline", () => {
  const createInterface = () => ({
    question: (_q, cb) => cb(h.answers.shift() ?? ""),
    close: () => {},
  });
  return { createInterface, default: { createInterface } };
});
vi.mock("fs", () => {
  const api = {
    existsSync: h.existsSync,
    readFileSync: h.readFileSync,
    writeFileSync: h.writeFileSync,
  };
  return { ...api, default: api };
});

class ExitSignal extends Error {}

let exitCalls;
let logs;
let throwOnExit;

/** Run the CLI (it executes `main()` on import) and wait for it to settle. */
async function runCli(argv = []) {
  vi.resetModules();
  process.argv = ["node", "create-cloud-db.js", ...argv];
  await import("../create-cloud-db.js");
  await new Promise((r) => setTimeout(r, 20));
}

/** Script `turso` responses by command prefix. */
function turso(map) {
  h.execSync.mockImplementation((cmd) => {
    for (const [prefix, out] of Object.entries(map)) {
      if (cmd.startsWith(prefix)) {
        if (out instanceof Error) throw out;
        return out;
      }
    }
    return "";
  });
}

beforeEach(() => {
  exitCalls = [];
  logs = [];
  throwOnExit = true;
  h.answers.length = 0;
  h.execSync.mockReset();
  h.existsSync.mockReset().mockReturnValue(false);
  h.readFileSync.mockReset();
  h.writeFileSync.mockReset();
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  vi.spyOn(process, "exit").mockImplementation((code) => {
    exitCalls.push(code);
    // First exit halts the flow; main()'s catch-handler exit is a no-op.
    if (throwOnExit && exitCalls.length === 1) throw new ExitSignal(`exit ${code}`);
  });
  for (const m of ["log", "warn", "error"]) {
    vi.spyOn(console, m).mockImplementation((...a) => logs.push(a.join(" ")));
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("create-cloud-db", () => {
  it("creates the database and writes TURSO_* values to a new .env", async () => {
    turso({
      "turso auth token": "tok_logged_in",
      "turso db create": "created",
      "turso db show": "libsql://mydb.turso.io\n",
      "turso db tokens create": "secret-token\n",
    });

    await runCli(["mydb"]);

    expect(exitCalls).toEqual([]);
    expect(h.execSync).toHaveBeenCalledWith(
      "turso db create mydb",
      expect.any(Object),
    );
    expect(h.writeFileSync).toHaveBeenCalledTimes(1);
    const [file, body] = h.writeFileSync.mock.calls[0];
    expect(file.endsWith(".env")).toBe(true);
    expect(body).toBe(
      "TURSO_DATABASE_URL=libsql://mydb.turso.io\nTURSO_AUTH_TOKEN=secret-token\n",
    );
    expect(process.env.TURSO_DATABASE_URL).toBe("libsql://mydb.turso.io");
    expect(process.env.TURSO_AUTH_TOKEN).toBe("secret-token");
  });

  it("prompts for the db name when argv has none", async () => {
    h.answers.push("promptdb");
    turso({
      "turso auth token": "tok",
      "turso db show": "libsql://promptdb",
      "turso db tokens create": "t",
    });

    await runCli();

    expect(h.execSync).toHaveBeenCalledWith(
      "turso db create promptdb",
      expect.any(Object),
    );
  });

  it("exits 1 when no database name is given", async () => {
    h.answers.push("");
    turso({ "turso auth token": "tok" });

    await runCli();

    expect(exitCalls[0]).toBe(1);
    expect(logs.join("\n")).toContain("Database name is required");
    expect(h.writeFileSync).not.toHaveBeenCalled();
  });

  it("exits 1 when not logged in and the user declines to log in", async () => {
    h.answers.push("n");
    turso({
      "turso auth token": "You are not logged in, please login with turso auth login",
    });

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(1);
    expect(logs.join("\n")).toContain("You are not logged in");
  });

  it("treats an empty token response as logged out", async () => {
    h.answers.push("no");
    turso({ "turso auth token": "" });

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(1);
  });

  it("logs in on request and then continues", async () => {
    h.answers.push("y");
    let tokenCalls = 0;
    h.execSync.mockImplementation((cmd) => {
      if (cmd === "turso auth token") {
        tokenCalls += 1;
        return tokenCalls === 1 ? "" : "tok";
      }
      if (cmd.startsWith("turso db show")) return "libsql://x";
      if (cmd.startsWith("turso db tokens create")) return "tk";
      return "";
    });

    await runCli(["db"]);

    expect(h.execSync).toHaveBeenCalledWith("turso auth login", expect.any(Object));
    expect(exitCalls).toEqual([]);
    expect(h.writeFileSync).toHaveBeenCalled();
  });

  it("exits 1 when `turso auth login` throws", async () => {
    h.answers.push("yes");
    h.execSync.mockImplementation((cmd) => {
      if (cmd === "turso auth token") return "";
      if (cmd === "turso auth login") throw new Error("boom");
      return "";
    });

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(1);
    expect(logs.join("\n")).toContain("Login failed");
  });

  it("exits 1 when still logged out after login", async () => {
    h.answers.push("y");
    h.execSync.mockImplementation(() => "");

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(1);
    expect(logs.join("\n")).toContain("Still not logged in");
  });

  it("keeps existing values and exits 0 when overwrite is declined", async () => {
    h.answers.push("n");
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockReturnValue(
      "TURSO_DATABASE_URL=libsql://old\nTURSO_AUTH_TOKEN=oldtoken\n",
    );
    turso({ "turso auth token": "tok" });

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(0);
    expect(h.writeFileSync).not.toHaveBeenCalled();
    expect(logs.join("\n")).toContain("libsql://old");
  });

  it("notices existing values from process.env too", async () => {
    process.env.TURSO_AUTH_TOKEN = "envtoken";
    h.answers.push("n");
    turso({ "turso auth token": "tok" });

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(0);
    expect(logs.join("\n")).toContain("TURSO_AUTH_TOKEN: envtoken");
  });

  it("preserves comments and unrelated keys while overwriting on confirm", async () => {
    h.answers.push("yes");
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockReturnValue(
      [
        "# my config",
        "",
        'TURSO_DATABASE_URL="libsql://old"',
        "KEEP_ME='yes'",
        "not a pair",
        "TURSO_AUTH_TOKEN=old",
      ].join("\r\n"),
    );
    turso({
      "turso auth token": "tok",
      "turso db show": "libsql://new",
      "turso db tokens create": "newtok",
    });

    await runCli(["db"]);

    const body = h.writeFileSync.mock.calls[0][1];
    expect(body).toBe(
      [
        "# my config",
        "",
        "TURSO_DATABASE_URL=libsql://new",
        // Every parsed key is rewritten, so surrounding quotes are dropped.
        "KEEP_ME=yes",
        "not a pair",
        "TURSO_AUTH_TOKEN=newtok",
        "",
      ].join("\n"),
    );
  });

  it("warns and continues when `turso db create` fails (db exists)", async () => {
    h.execSync.mockImplementation((cmd) => {
      if (cmd === "turso auth token") return "tok";
      if (cmd.startsWith("turso db create")) throw new Error("already exists");
      if (cmd.startsWith("turso db show")) return "libsql://exists";
      if (cmd.startsWith("turso db tokens create")) return "t";
      return "";
    });

    await runCli(["db"]);

    expect(logs.join("\n")).toContain("may already exist");
    expect(h.writeFileSync).toHaveBeenCalled();
  });

  it("returns stderr output from a failing ignorable command", async () => {
    h.execSync.mockImplementation((cmd) => {
      if (cmd === "turso auth token") {
        const e = new Error("fail");
        e.stdout = "";
        e.stderr = Buffer.from("You are not logged in, please login with turso auth login");
        throw e;
      }
      return "";
    });
    h.answers.push("n");

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(1);
  });

  it("reports unexpected errors and exits 1", async () => {
    // The exit comes from main()'s own catch handler, so it must not throw.
    throwOnExit = false;
    h.execSync.mockImplementation((cmd) => {
      if (cmd === "turso auth token") return "tok";
      if (cmd.startsWith("turso db show")) throw new Error("show failed");
      return "";
    });

    await runCli(["db"]);

    expect(exitCalls[0]).toBe(1);
    expect(logs.join("\n")).toContain("Unexpected error");
  });
});
