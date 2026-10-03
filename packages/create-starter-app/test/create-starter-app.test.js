import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  answers: [],
  existsSync: vi.fn(),
  cpSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

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
    cpSync: h.cpSync,
    readFileSync: h.readFileSync,
    writeFileSync: h.writeFileSync,
  };
  return { ...api, default: api };
});

const UP = "\x1b[A";
const DOWN = "\x1b[B";

class ExitSignal extends Error {}

let stdin;
let out;
let exitCalls;
let origStdin;

async function start() {
  vi.resetModules();
  await import("../bin/create-starter-app.js");
  await new Promise((r) => setTimeout(r, 10));
}

const press = async (...keys) => {
  for (const k of keys) {
    stdin.emit("data", k);
    await new Promise((r) => setTimeout(r, 5));
  }
};

beforeEach(() => {
  h.answers.length = 0;
  h.existsSync.mockReset().mockReturnValue(false);
  h.cpSync.mockReset();
  h.readFileSync.mockReset();
  h.writeFileSync.mockReset();
  out = "";
  exitCalls = [];
  stdin = Object.assign(new EventEmitter(), {
    setRawMode: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
    setEncoding: vi.fn(),
  });
  origStdin = Object.getOwnPropertyDescriptor(process, "stdin");
  Object.defineProperty(process, "stdin", { value: stdin, configurable: true });
  vi.spyOn(process.stdout, "write").mockImplementation((s) => {
    out += String(s);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((s) => {
    out += String(s);
    return true;
  });
  vi.spyOn(process, "exit").mockImplementation((code) => {
    exitCalls.push(code);
    if (exitCalls.length === 1) throw new ExitSignal(`exit ${code}`);
  });
});

afterEach(() => {
  Object.defineProperty(process, "stdin", origStdin);
  vi.restoreAllMocks();
});

describe("create-starter-app", () => {
  it("renders the menu with the first template expanded", async () => {
    await start();
    expect(out).toContain("create-starter-app");
    expect(out).toContain("Select a starter template");
    expect(out).toContain("Next.js + BetterAuth + Shadcn + Drizzle");
    expect(out).toContain("Best for SaaS apps");
    expect(stdin.setRawMode).toHaveBeenCalledWith(true);
  });

  it("cancels on q", async () => {
    await start();
    await press("q");
    await new Promise((r) => setTimeout(r, 10));
    expect(out).toContain("Cancelled.");
    expect(exitCalls[0]).toBe(0);
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it("cancels on ctrl-c", async () => {
    await start();
    await press("\x03");
    await new Promise((r) => setTimeout(r, 10));
    expect(exitCalls[0]).toBe(0);
  });

  it("navigates with arrow keys (wrapping) and scaffolds the picked template", async () => {
    h.answers.push("my-docs");
    h.existsSync.mockImplementation((p) => String(p).endsWith("package.json"));
    h.readFileSync.mockReturnValue(
      JSON.stringify({ name: "template", version: "1.2.3", dependencies: { a: "1" } }),
    );

    await start();
    // Up from the first item wraps to the last (docusaurus), down wraps back.
    await press(UP);
    expect(out).toContain("Best for established projects");
    await press(DOWN, DOWN);
    expect(out).toContain("Best for teams comfortable with Prisma");
    await press("\r");
    await new Promise((r) => setTimeout(r, 20));

    expect(h.cpSync).toHaveBeenCalledTimes(1);
    const [src, dest, opts] = h.cpSync.mock.calls[0];
    expect(src.endsWith("starter-templates/template-nextjs-betterauth-shadcn-prisma")).toBe(true);
    expect(dest.endsWith("my-docs")).toBe(true);
    expect(opts.recursive).toBe(true);
    expect(opts.filter("/a/src/index.ts")).toBe(true);
    expect(opts.filter("/a/node_modules/x")).toBe(false);
    expect(opts.filter("/a/.next/x")).toBe(false);
    expect(opts.filter("/a/dist/x")).toBe(false);

    const written = JSON.parse(h.writeFileSync.mock.calls[0][1]);
    expect(written).toEqual({ name: "my-docs", private: true, dependencies: { a: "1" } });
    expect(out).toContain("Created");
    expect(out).toContain("cd my-docs");
  });

  it("accepts newline as confirm and defaults the project name", async () => {
    h.answers.push("");
    await start();
    await press("\n");
    await new Promise((r) => setTimeout(r, 20));

    const dest = h.cpSync.mock.calls[0][1];
    expect(dest.endsWith("nextjs-betterauth-shadcn-drizzle")).toBe(true);
    // No package.json in the (mocked) copy → nothing rewritten.
    expect(h.writeFileSync).not.toHaveBeenCalled();
  });

  it("refuses to overwrite an existing directory", async () => {
    h.answers.push("taken");
    h.existsSync.mockReturnValue(true);
    await start();
    await press("\r");
    await new Promise((r) => setTimeout(r, 20));

    expect(out).toContain('directory "taken" already exists');
    expect(exitCalls[0]).toBe(1);
    expect(h.cpSync).not.toHaveBeenCalled();
  });

  it("reports copy failures on stderr and exits 1", async () => {
    h.answers.push("proj");
    h.cpSync.mockImplementation(() => {
      throw new Error("disk full");
    });
    // main()'s catch handler issues the only exit here; it must not throw.
    process.exit.mockImplementation((code) => {
      exitCalls.push(code);
    });
    await start();
    await press("\r");
    await new Promise((r) => setTimeout(r, 20));

    expect(out).toContain("Error: ");
    expect(out).toContain("disk full");
    expect(exitCalls).toEqual([1]);
  });

  it("ignores unrelated keys", async () => {
    await start();
    await press("x", "y");
    expect(exitCalls).toEqual([]);
    expect(h.cpSync).not.toHaveBeenCalled();
  });
});
