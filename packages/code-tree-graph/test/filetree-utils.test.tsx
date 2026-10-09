import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FileTreeNode } from "../lib";
import {
  analysisItemDocText,
  analysisItemMatches,
  buildSearchRecords,
  collectFileNodeMap,
  collectFilePaths,
  defaultExportStyle,
  exportStyles,
  filterTreeByPaths,
  getExportStyle,
  getLocalImportLabel,
  getLocalImportSections,
  getMaxTreeDepth,
  getNodeFontSize,
  ghLineUrl,
  Highlight,
  resolveLocalImport,
} from "../components/code-tree/filetree-utils";
import { parseMermaidSvg, widenClusterLabels } from "../components/codegraph/pan-zoom-controller";
import { cn } from "../utils";

const analysis = (over: Partial<NonNullable<FileTreeNode["analysis"]>> = {}) => ({
  localImports: [],
  localImportSymbols: [],
  npmImports: [],
  exports: [],
  functions: [],
  types: [],
  ...over,
});

const TREE: FileTreeNode[] = [
  {
    name: "src",
    type: "folder",
    path: "src",
    children: [
      {
        name: "a.ts",
        type: "file",
        path: "src/a.ts",
        description: "File A",
        analysis: analysis({
          npmImports: ["react"],
          localImports: ["./b"],
          localImportSymbols: [{ source: "./b", valueNames: ["run", "Klass", "VALUE", "unknown"], typeNames: ["Opts"] }],
          exports: [{ name: "alpha", kind: "function", jsdoc: "Alpha doc", signature: "(x: number)" }],
          functions: [{ name: "helper", jsdoc: "Helps" }],
          types: [{ name: "Shape", properties: [{ name: "w", type: "number", required: true, description: "width" }] }],
        }),
      },
      {
        name: "b.ts",
        type: "file",
        path: "src/b.ts",
        analysis: analysis({
          exports: [
            { name: "run", kind: "function", signature: "()" },
            { name: "Klass", kind: "class" },
            { name: "VALUE", kind: "constant" },
          ],
        }),
      },
      { name: "deep", type: "folder", path: "src/deep", children: [{ name: "c.ts", type: "file", path: "src/deep/c.ts" }] },
    ],
  },
  { name: "root.ts", type: "file", path: "root.ts" },
];

describe("styles and labels", () => {
  it("picks an export style by kind, falling back to the function style", () => {
    expect(getExportStyle({ name: "x", kind: "class" })).toBe(exportStyles.class);
    expect(getExportStyle({ name: "x", kind: "constant" })).toBe(exportStyles.constant);
    expect(getExportStyle({ name: "x" })).toBe(defaultExportStyle);
    expect(getExportStyle({ name: "x", kind: "type" })).toBe(defaultExportStyle);
  });

  it("builds GitHub line links only when a line is known", () => {
    expect(ghLineUrl("https://gh/x/blob/main", "src/a.ts", 12)).toBe("https://gh/x/blob/main/src/a.ts#L12");
    expect(ghLineUrl("https://gh", "a.ts")).toBeUndefined();
  });

  it("labels local imports with the last path segment", () => {
    expect(getLocalImportLabel("./lib/helper")).toBe("helper");
    expect(getLocalImportLabel("./x", "src/deep/c.ts")).toBe("c.ts");
    expect(getLocalImportLabel("/", undefined)).toBe("/");
  });

  it("scales font size down with depth, to a floor", () => {
    expect(getNodeFontSize(0, true)).toBe("1.060rem");
    expect(getNodeFontSize(0, false)).toBe("0.980rem");
    expect(getNodeFontSize(1, true)).toBe("1.000rem");
    expect(getNodeFontSize(50, true)).toBe("0.860rem");
    expect(getNodeFontSize(50, false)).toBe("0.800rem");
  });
});

describe("resolveLocalImport", () => {
  const known = new Set(["src/b.ts", "src/deep/index.tsx", "src/util", "lib/x.mjs"]);

  it("resolves relative imports to files with each known extension", () => {
    expect(resolveLocalImport("src/a.ts", "./b", known)).toBe("src/b.ts");
    expect(resolveLocalImport("src/a.ts", "./b.js", known)).toBe("src/b.ts");
    expect(resolveLocalImport("src/a.ts", "../lib/x", known)).toBe("lib/x.mjs");
  });

  it("prefers an exact path, then files, then index files", () => {
    expect(resolveLocalImport("src/a.ts", "./util", known)).toBe("src/util");
    expect(resolveLocalImport("src/a.ts", "./deep", known)).toBe("src/deep/index.tsx");
  });

  it("returns undefined when nothing matches", () => {
    expect(resolveLocalImport("src/a.ts", "./missing", known)).toBeUndefined();
  });
});

describe("tree helpers", () => {
  it("collects nodes and paths recursively", () => {
    expect([...collectFilePaths(TREE)]).toEqual(["src", "src/a.ts", "src/b.ts", "src/deep", "src/deep/c.ts", "root.ts"]);
    const map = collectFileNodeMap(TREE);
    expect(map.get("src/b.ts")!.name).toBe("b.ts");
    expect(map.size).toBe(6);
  });

  it("measures the maximum depth", () => {
    expect(getMaxTreeDepth(TREE)).toBe(3);
    expect(getMaxTreeDepth([])).toBe(1);
    expect(getMaxTreeDepth([{ name: "x", type: "file", path: "x" }])).toBe(1);
  });

  it("filters to matched paths, keeping ancestors of matches", () => {
    const out = filterTreeByPaths(TREE, new Set(["src/deep/c.ts"]));
    expect(out).toHaveLength(1);
    expect(out[0].children!.map((c) => c.name)).toEqual(["deep"]);
    expect(out[0].children![0].children![0].name).toBe("c.ts");

    const folderOnly = filterTreeByPaths(TREE, new Set(["src/deep"]));
    expect(folderOnly[0].children![0]).toMatchObject({ name: "deep", children: [] });

    expect(filterTreeByPaths(TREE, new Set())).toEqual([]);
    expect(filterTreeByPaths([{ name: "f", type: "folder", path: "f" }], new Set(["f"]))).toEqual([
      { name: "f", type: "folder", path: "f", children: [] },
    ]);
  });
});

describe("getLocalImportSections", () => {
  const map = collectFileNodeMap(TREE);
  const source = map.get("src/a.ts")!;

  it("groups imported symbols by what the target exports", () => {
    const sections = getLocalImportSections(source, "./b", "src/b.ts", map)!;
    expect(sections.map((s) => s.label)).toEqual(["Functions", "Types", "Classes", "Values"]);
    const by = Object.fromEntries(sections.map((s) => [s.label, s.items]));
    expect(by.Functions).toEqual([{ name: "run", icon: "function", signature: "()" }]);
    expect(by.Classes).toEqual([{ name: "Klass", icon: "class" }]);
    expect(by.Types).toEqual([{ name: "Opts", icon: "braces" }]);
    expect(by.Values.map((i) => i.name)).toEqual(["VALUE", "unknown"]);
  });

  it("returns undefined without analysis, without matching import, or without symbols", () => {
    expect(getLocalImportSections(map.get("root.ts")!, "./b", "src/b.ts", map)).toBeUndefined();
    expect(getLocalImportSections(source, "./nope", undefined, map)).toBeUndefined();
    const empty: FileTreeNode = {
      name: "e.ts",
      type: "file",
      path: "e.ts",
      analysis: analysis({ localImportSymbols: [{ source: "./x", valueNames: [], typeNames: [] }] }),
    };
    expect(getLocalImportSections(empty, "./x", undefined, map)).toBeUndefined();
  });

  it("still lists symbols when the target file is unresolved", () => {
    const sections = getLocalImportSections(source, "./b", undefined, map)!;
    expect(sections.find((s) => s.label === "Values")!.items.map((i) => i.name)).toEqual(["run", "Klass", "VALUE", "unknown"]);
  });
});

describe("search", () => {
  it("analysisItemMatches checks name, docs, signature and properties", () => {
    const item = {
      name: "Widget",
      jsdoc: "Renders a Thing",
      signature: "(props: Props)",
      properties: [{ name: "size", type: "Number", description: "Pixel Size", required: true }],
    };
    for (const q of ["widget", "thing", "props", "size", "number", "pixel"]) {
      expect(analysisItemMatches(item, q)).toBe(true);
    }
    expect(analysisItemMatches(item, "zzz")).toBe(false);
    expect(analysisItemMatches({ name: "Plain" }, "zzz")).toBe(false);
  });

  it("analysisItemDocText concatenates searchable text and skips empties", () => {
    expect(analysisItemDocText({ name: "x" })).toBe("");
    expect(
      analysisItemDocText({
        name: "x",
        jsdoc: "doc",
        signature: "sig",
        properties: [{ name: "p", type: "T", required: true }, { name: "q", type: "U", description: "d", required: false }],
      }),
    ).toBe("doc sig p T  q U d".replace("T  q", "T q"));
  });

  it("buildSearchRecords flattens the tree with per-file facets", () => {
    const records = buildSearchRecords(TREE);
    expect(records.map((r) => r.path)).toEqual(["src", "src/a.ts", "src/b.ts", "src/deep", "src/deep/c.ts", "root.ts"]);
    const a = records.find((r) => r.path === "src/a.ts")!;
    expect(a).toMatchObject({
      type: "file",
      name: "a.ts",
      description: "File A",
      npmImports: ["react"],
      localImports: ["./b"],
      localImportSources: ["./b"],
      localImportValues: ["run", "Klass", "VALUE", "unknown"],
      localImportTypes: ["Opts"],
      exportNames: ["alpha"],
      functionNames: ["helper"],
      typeNames: ["Shape"],
    });
    expect(a.exportDocs[0]).toContain("Alpha doc");
    expect(a.typeDocs[0]).toContain("width");
    const folder = records.find((r) => r.path === "src")!;
    expect(folder.exportNames).toEqual([]);
    expect(folder.description).toBe("");
  });
});

describe("Highlight", () => {
  it("renders text through the markdown component", () => {
    const html = renderToStaticMarkup(createElement(Highlight, { text: "hello **world**", query: "" }));
    expect(html).toContain("hello");
    expect(html).toContain("world");
  });

  it("marks query matches", () => {
    const html = renderToStaticMarkup(createElement(Highlight, { text: "find the needle here", query: "needle" }));
    expect(html).toContain("needle");
    expect(html.toLowerCase()).toMatch(/<mark|highlight/);
  });
});

describe("mermaid svg helpers", () => {
  it("parses viewBox dimensions and inner markup", () => {
    const out = parseMermaidSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g id="x"/></svg>');
    expect(out.width).toBe(640);
    expect(out.height).toBe(480);
    expect(out.innerHtml).toContain('id="x"');
  });

  it("falls back to width/height attributes, then to defaults", () => {
    expect(parseMermaidSvg('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"/>')).toMatchObject({ width: 300, height: 200 });
    expect(parseMermaidSvg('<svg xmlns="http://www.w3.org/2000/svg"/>')).toMatchObject({ width: 1200, height: 600 });
    expect(parseMermaidSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5"/>')).toMatchObject({ width: 1200, height: 600 });
  });

  it("returns defaults when the markup has no svg element", () => {
    expect(parseMermaidSvg("<div/>")).toEqual({ innerHtml: "", width: 1200, height: 600 });
  });

  it("widenClusterLabels leaves containers without clusters alone", () => {
    const el = document.createElement("div");
    el.innerHTML = '<svg><g class="node"></g></svg>';
    expect(() => widenClusterLabels(el)).not.toThrow();
  });
});

describe("cn", () => {
  it("merges class names, resolving tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("a", false && "b", ["c", { d: true, e: false }])).toBe("a c d");
  });
});
