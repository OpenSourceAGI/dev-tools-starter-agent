import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dir;
let origArgv;

const SMALL = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="#ff0000" d="M0 0"/></svg>';

async function load(argv) {
  vi.resetModules();
  process.argv = ["node", "export-svg-typescript.js", ...argv];
  return import("../export-svg-typescript.js");
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-export-"));
  origArgv = process.argv;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.argv = origArgv;
  fs.rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("convertSVGFolderToExportIndex", () => {
  it("generates one customizable export per .svg and skips other files", async () => {
    const input = path.join(dir, "svg");
    fs.mkdirSync(input);
    fs.writeFileSync(path.join(input, "icon-arrow-left.svg"), SMALL);
    fs.writeFileSync(path.join(input, "Star_Big.SVG"), SMALL);
    fs.writeFileSync(path.join(input, "notes.txt"), "ignore me");
    const out = path.join(dir, "index.ts");

    await load(["-i", input, "-o", out]);

    const src = fs.readFileSync(out, "utf8");
    expect(src).toContain("Do a Barrel Roll");
    expect(src).toContain("export const iconArrowLeft = (options: LoadingOptions = {}) => customSVG(options,");
    // The extension is stripped case-sensitively, so ".SVG" ends up in the name.
    expect(src).toContain("export const starBigSvg =");
    expect(src).not.toContain("notes");
    expect(src).toContain("Returns a customized SVG string for icon arrow-left");
    expect(src).toContain("(default: 24)");
    expect(src).toContain("data:image/svg+xml;base64,");
    expect(src).toContain("function customSVG(");
    expect(src).toContain("interface LoadingOptions");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Converted 2 SVG files"));
  });

  it("falls back to 100x100 defaults and a resized preview when width is missing", async () => {
    const input = path.join(dir, "in");
    fs.mkdirSync(input);
    fs.writeFileSync(path.join(input, "plain.svg"), '<svg viewBox="0 0 10 10"><circle/></svg>');
    const out = path.join(dir, "o.ts");

    const mod = await load(["-i", input, "-o", out]);
    expect(typeof mod.convertSVGFolderToExportIndex).toBe("function");

    const src = fs.readFileSync(out, "utf8");
    expect(src).toContain("(default: 100)");
    const b64 = src.match(/base64,([A-Za-z0-9+/=]+)\)/)[1];
    expect(Buffer.from(b64, "base64").toString()).toContain('<svg width="100px" height="100px"');
  });

  it("resizes the preview of oversized icons", async () => {
    const input = path.join(dir, "big");
    fs.mkdirSync(input);
    fs.writeFileSync(
      path.join(input, "huge.svg"),
      '<svg width="800" height="600"><rect/></svg>',
    );
    const out = path.join(dir, "o.ts");

    await load(["-i", input, "-o", out]);

    const src = fs.readFileSync(out, "utf8");
    expect(src).toContain("(default: 800)");
    expect(src).toContain("(default: 600)");
    const b64 = src.match(/base64,([A-Za-z0-9+/=]+)\)/)[1];
    const preview = Buffer.from(b64, "base64").toString();
    expect(preview).toMatch(/^<svg width="100px" height="100px"\s*><rect\/><\/svg>$/);
  });

  it("escapes backticks, dollars and collapses whitespace in the embedded markup", async () => {
    const input = path.join(dir, "esc");
    fs.mkdirSync(input);
    fs.writeFileSync(
      path.join(input, "tricky.svg"),
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink" width="10" height="10">\n  <text>`a` $b</text>\n  <g/>\n</svg>',
    );
    const out = path.join(dir, "o.ts");

    await load(["-i", input, "-o", out]);

    const src = fs.readFileSync(out, "utf8");
    expect(src).toContain("\\`a\\` \\$b");
    expect(src).not.toContain("xmlns:xlink");
    expect(src).toContain("<svg width=\"10\" height=\"10\"><text>");
  });

  it("handles an empty folder", async () => {
    const input = path.join(dir, "empty");
    fs.mkdirSync(input);
    const out = path.join(dir, "o.ts");
    await load(["-i", input, "-o", out]);
    expect(fs.readFileSync(out, "utf8")).toContain("customSVG");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Converted 0 SVG files"));
  });

  it("defaults to ./svg and ./index.ts when no flags are given", async () => {
    const cwd = process.cwd();
    fs.mkdirSync(path.join(dir, "svg"));
    fs.writeFileSync(path.join(dir, "svg", "a.svg"), SMALL);
    process.chdir(dir);
    try {
      await load([]);
      expect(fs.existsSync(path.join(dir, "index.ts"))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});
