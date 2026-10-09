import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDescriptions, inferFileDescription, scanDir } from "../lib/scan";
import { generateFileTree, parseIgnoreFile, PARSEABLE_EXTS } from "../lib";
import { ASSET_EXTS, IGNORE, SYSTEM_MODULES } from "../lib/constants";

let root: string;

const put = (rel: string, content = "") => {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ctg-scan-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("constants", () => {
  it("expose the sets the scanner relies on", () => {
    expect(IGNORE.has("node_modules")).toBe(true);
    expect(ASSET_EXTS.has(".png")).toBe(true);
    expect(PARSEABLE_EXTS.has(".tsx")).toBe(true);
    expect(SYSTEM_MODULES.has("node:fs")).toBe(true);
  });
});

describe("scanDir", () => {
  it("lists folders before files, alphabetically, with relative posix paths", () => {
    put("b.ts", "export const b = 1;");
    put("a.ts", "export const a = 1;");
    put("zeta/inner.ts", "export const i = 1;");
    put("alpha/deep/x.ts", "export const x = 1;");
    const tree = scanDir(root, root, new Set());

    expect(tree.map((n) => n.name)).toEqual(["alpha", "zeta", "a.ts", "b.ts"]);
    const alpha = tree[0];
    expect(alpha).toMatchObject({ type: "folder", path: "alpha" });
    expect(alpha.children![0]).toMatchObject({ name: "deep", path: "alpha/deep" });
    expect(alpha.children![0].children![0]).toMatchObject({ name: "x.ts", type: "file", path: "alpha/deep/x.ts" });
  });

  it("analyzes parseable files and leaves other files unanalyzed", () => {
    put("code.ts", "export function f() {}");
    put("notes.txt", "hello");
    const tree = scanDir(root, root, new Set());
    expect(tree.find((n) => n.name === "code.ts")!.analysis!.exports[0].name).toBe("f");
    expect(tree.find((n) => n.name === "notes.txt")!.analysis).toBeUndefined();
  });

  it("skips dotfiles, built-in ignores, assets and extra ignore patterns", () => {
    put(".hidden/a.ts", "export const a = 1;");
    put("node_modules/pkg/index.js", "export const n = 1;");
    put("dist/out.js", "export const d = 1;");
    put("package.json", "{}");
    put("logo.PNG", "x");
    put("keep.ts", "export const k = 1;");
    put("generated/skip.ts", "export const s = 1;");
    put("src/nested/skipme.ts", "export const s = 1;");
    put("src/ok.ts", "export const ok = 1;");
    const tree = scanDir(root, root, new Set(["generated", "src/nested/skipme.ts", "skipme.ts"]));
    expect(tree.map((n) => n.name)).toEqual(["src", "keep.ts"]);
    expect(tree[0].children!.map((n) => n.name)).toEqual(["ok.ts"]);
  });

  it("drops folders that end up empty", () => {
    put("onlyassets/pic.png", "x");
    put("file.ts", "export const f = 1;");
    expect(scanDir(root, root, new Set()).map((n) => n.name)).toEqual(["file.ts"]);
  });

  it("reads package.json dependencies and the main entry's exports for packages", () => {
    put(
      "libpkg/package.json",
      JSON.stringify({
        name: "libpkg",
        main: "src/main.ts",
        dependencies: { react: "1", zod: "1" },
        peerDependencies: { react: "1", next: "1" },
      }),
    );
    put(
      "libpkg/src/main.ts",
      "export const VERSION = '1';\nexport function make() {}\nexport class Maker {}\nexport interface Opts {}\n",
    );
    const pkg = scanDir(root, root, new Set())[0];
    expect(pkg.packageDependencies).toEqual(["react", "zod", "next"]);
    expect(pkg.packageExports!.map((e) => e.name)).toEqual(["make", "Maker"]);
  });

  it("falls back to all exports when none are functions or classes, and resolves exports maps", () => {
    put("consts/package.json", JSON.stringify({ exports: { ".": { import: "./index.ts" } } }));
    put("consts/index.ts", "export const A = 1;\nexport const B = 2;\n");
    const pkg = scanDir(root, root, new Set())[0];
    expect(pkg.packageExports!.map((e) => e.name)).toEqual(["A", "B"]);
    expect(pkg.packageDependencies).toBeUndefined();
  });

  it("tries the conventional entry points when main does not resolve", () => {
    put("conv/package.json", JSON.stringify({ main: "dist/missing.js" }));
    put("conv/src/index.ts", "export function entry() {}\n");
    const pkg = scanDir(root, root, new Set())[0];
    expect(pkg.packageExports!.map((e) => e.name)).toEqual(["entry"]);
  });

  it("ignores an unparseable package.json", () => {
    put("broken/package.json", "{nope");
    put("broken/a.ts", "export const a = 1;");
    const pkg = scanDir(root, root, new Set())[0];
    expect(pkg.packageDependencies).toBeUndefined();
    expect(pkg.children).toHaveLength(1);
  });
});

describe("inferFileDescription", () => {
  const infer = (name: string, content: string) => {
    put(name, content);
    return inferFileDescription(path.join(root, name));
  };

  it("uses an @description / @file tag from the leading JSDoc", () => {
    expect(infer("a.ts", "/**\n * Intro\n * @description Real description\n *   continued\n * @see x\n */\nexport const a = 1;")).toBe(
      "Real description\ncontinued",
    );
    expect(infer("b.ts", "/** @file The b file */\nexport const b = 1;")).toBe("The b file");
  });

  it("falls back to the JSDoc body before the first tag", () => {
    expect(infer("c.ts", "/**\n * Line one\n *\n * Line two\n * @param x\n */\nexport const c = 1;")).toBe(
      "Line one\n\nLine two",
    );
  });

  it("falls back to leading // comments, skipping 'use' directives", () => {
    expect(infer("d.ts", '"use client";\n// First\n// Second\n\nexport const d = 1;')).toBe("First\nSecond");
    expect(infer("e.ts", "'use strict'\n//\n// Only\nconst e = 1;")).toBe("Only");
  });

  it("returns undefined when there is nothing to infer from", () => {
    expect(infer("f.ts", "export const f = 1;")).toBeUndefined();
    expect(infer("g.ts", "/** @param x */\nexport const g = 1;")).toBeUndefined();
    expect(infer("h.css", "/* css */")).toBeUndefined();
    expect(inferFileDescription(path.join(root, "missing.ts"))).toBeUndefined();
  });
});

describe("applyDescriptions", () => {
  it("applies manual descriptions by path, recursively", () => {
    const tree = scanDir(root, root, new Set());
    expect(tree).toEqual([]);
    put("src/a.ts", "export const a = 1;");
    put("b.ts", "export const b = 1;");
    const nodes = scanDir(root, root, new Set());
    const out = applyDescriptions(nodes, { "src/a.ts": "Manual A", "b.ts": "Manual B" }, root, false);
    expect(out.find((n) => n.name === "b.ts")!.description).toBe("Manual B");
    expect(out.find((n) => n.name === "src")!.children![0].description).toBe("Manual A");
  });

  it("infers file descriptions only when asked, and prefers manual ones", () => {
    put("one.ts", "// inferred one\nexport const one = 1;");
    put("two.ts", "// inferred two\nexport const two = 1;");
    put("three.ts", "export const three = 1;");
    const nodes = scanDir(root, root, new Set());

    const off = applyDescriptions(nodes, {}, root, false);
    expect(off.every((n) => n.description === undefined)).toBe(true);

    const on = applyDescriptions(nodes, { "two.ts": "Manual two" }, root, true);
    const by = Object.fromEntries(on.map((n) => [n.name, n.description]));
    expect(by).toEqual({ "one.ts": "inferred one", "two.ts": "Manual two", "three.ts": undefined });
  });

  it("does not mutate its input", () => {
    put("x.ts", "// d\nexport const x = 1;");
    const nodes = scanDir(root, root, new Set());
    applyDescriptions(nodes, { "x.ts": "m" }, root, false);
    expect(nodes[0].description).toBeUndefined();
  });
});

describe("parseIgnoreFile", () => {
  it("collects non-comment lines and strips trailing slashes", () => {
    put(".treeignore", "# comment\nbuild/\n\n  coverage//  \nsrc/gen\n");
    expect([...parseIgnoreFile(path.join(root, ".treeignore"))]).toEqual(["build", "coverage", "src/gen"]);
  });

  it("returns an empty set for a missing file", () => {
    expect(parseIgnoreFile(path.join(root, "nope")).size).toBe(0);
  });
});

describe("generateFileTree", () => {
  it("scans, applies ignores and descriptions", () => {
    put("keep.ts", "// from comment\nexport const k = 1;");
    put("skip/me.ts", "export const m = 1;");
    const tree = generateFileTree(root, { "keep.ts": "Manual" }, new Set(["skip"]), true);
    expect(tree.map((n) => n.name)).toEqual(["keep.ts"]);
    expect(tree[0].description).toBe("Manual");
    const inferred = generateFileTree(root, {}, new Set(["skip"]), true);
    expect(inferred[0].description).toBe("from comment");
    const defaults = generateFileTree(root);
    expect(defaults.map((n) => n.name)).toEqual(["skip", "keep.ts"]);
    expect(defaults[1].description).toBeUndefined();
  });
});
