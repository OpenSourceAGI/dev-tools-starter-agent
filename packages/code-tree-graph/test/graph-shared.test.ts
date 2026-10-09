import { describe, expect, it } from "vitest";
import { analyzeFileContent } from "../lib";
import {
  buildChart,
  buildNodeTooltips,
  getGraphHierarchy,
  type FileInfo,
  type GraphDisplayOptions,
} from "../components/codegraph/dependency-graph-shared";

const file = (filePath: string, source: string, description?: string): FileInfo => {
  const parts = filePath.split("/");
  return {
    path: filePath,
    name: parts[parts.length - 1],
    id: filePath.replace(/[^a-zA-Z0-9]/g, "_"),
    pkg: parts.length > 1 ? parts[0] : "root",
    description,
    analysis: analyzeFileContent(filePath, source),
  };
};

const FILES: FileInfo[] = [
  file(
    "app/index.ts",
    'import { helper } from "./lib/helper";\nimport type { Opts } from "./types";\nimport React from "react";\nexport function main() { helper(); }\nfunction secret() {}\n',
    "Entry point",
  ),
  file(
    "app/lib/helper.ts",
    'import "../index";\nexport function helper(): void {}\nexport type Shape = { a: number };\nconst internal = () => 1;\n',
  ),
  file("app/types.ts", "export interface Opts { x: number }\ninterface Hidden {}\n"),
  file("tool.ts", 'import zod from "zod";\nexport const VERSION = "1";\n'),
  { path: "app/readme.md", name: "readme.md", id: "app_readme_md", pkg: "app" },
];

const none: GraphDisplayOptions = {
  showNpmImports: false,
  showTypes: false,
  showPrivateFunctions: false,
  showExportedFunctions: false,
};
const all: GraphDisplayOptions = {
  showNpmImports: true,
  showTypes: true,
  showPrivateFunctions: true,
  showExportedFunctions: true,
};

describe("buildChart", () => {
  it("starts a C4Container and groups files by package with nested sub-directories", () => {
    const chart = buildChart(FILES, none);
    const lines = chart.split("\n");
    expect(lines[0]).toBe("C4Container");
    expect(chart).toContain('Container_Boundary(pkg_app, "app ➕") {');
    expect(chart).toContain('Container_Boundary(pkg_app_lib, "lib/ ➕") {');
    expect(chart).toContain('Container_Boundary(pkg_root, "root ➕") {');
    expect(chart).toContain('Component(app_index_ts, "index.ts", "TypeScript")');
    expect(chart).toContain('Component(app_lib_helper_ts, "helper.ts", "TypeScript")');
    expect(chart).toContain('Component(app_readme_md, "readme.md", "Markdown")');
    expect(chart).toContain('Component(tool_ts, "tool.ts", "TypeScript")');
  });

  it("draws import relationships between files, resolving relative paths", () => {
    const chart = buildChart(FILES, none);
    expect(chart).toContain('Rel(app_index_ts, app_lib_helper_ts, "imports")');
    expect(chart).toContain('Rel(app_index_ts, app_types_ts, "imports")');
    // helper imports ../index back to the entry point
    expect(chart).toContain('Rel(app_lib_helper_ts, app_index_ts, "imports")');
    expect(chart).not.toContain("System_Ext");
  });

  it("labels edges with imported symbols when symbol options are on", () => {
    const chart = buildChart(FILES, { ...none, showExportedFunctions: true, showTypes: true });
    expect(chart).toContain('Rel(app_index_ts, app_lib_helper_ts, "helper")');
    expect(chart).toContain('Rel(app_index_ts, app_types_ts, "type Opts")');
  });

  it("adds symbol and npm nodes with their relationships when enabled", () => {
    const chart = buildChart(FILES, all);
    expect(chart).toContain('Component(app_index_ts__private_fn_secret, "secret", "Function")');
    expect(chart).toContain('Component(app_index_ts__exported_fn_main, "main", "Export")');
    expect(chart).toContain('Component(app_lib_helper_ts__type_Shape, "Shape", "Type")');
    expect(chart).toContain('System_Ext(npm_react, "react", "npm package")');
    expect(chart).toContain('System_Ext(npm_zod, "zod", "npm package")');
    expect(chart).toContain('Rel(app_index_ts, app_index_ts__private_fn_secret, "defines")');
    expect(chart).toContain('Rel(app_lib_helper_ts, app_lib_helper_ts__type_Shape, "declares")');
    expect(chart).toContain('Rel(app_index_ts, npm_react, "uses")');
    expect(chart).toContain('Rel(tool_ts, npm_zod, "uses")');
  });

  it("styles elements by classification and ends with layout config", () => {
    const chart = buildChart(FILES, none);
    expect(chart).toContain('UpdateElementStyle(app_index_ts, $bgColor="#14532d"'); // entry
    expect(chart).toContain('UpdateElementStyle(app_types_ts, $bgColor="#7e22ce"'); // "type" in name
    expect(chart).toContain('UpdateElementStyle(app_lib_helper_ts, $bgColor="#1d4ed8"'); // core
    expect(chart).toContain('UpdateElementStyle(tool_ts, $bgColor="#334155"'); // util
    expect(chart).toContain('UpdateBoundaryStyle(pkg_app, ');
    expect(chart).toContain('UpdateBoundaryStyle(pkg_app_lib, ');
    expect(chart.trim().split("\n").at(-1)).toContain("UpdateLayoutConfig");
  });

  it("escapes double quotes in names and tolerates files with no analysis", () => {
    const odd: FileInfo = { path: 'x/we"ird.js', name: 'we"ird.js', id: "x_weird_js", pkg: "x" };
    const chart = buildChart([odd], all);
    expect(chart).toContain("we'ird.js");
    expect(chart).toContain('"JavaScript"');
  });

  it("classifies .jsx, .tsx and .mjs technologies and unknown extensions", () => {
    const mk = (name: string): FileInfo => ({ path: `p/${name}`, name, id: name.replace(/\W/g, "_"), pkg: "p" });
    const chart = buildChart([mk("a.tsx"), mk("b.jsx"), mk("c.mjs"), mk("d.json"), mk("e.yaml")], none);
    expect(chart).toContain('"React TSX"');
    expect(chart).toContain('"React JSX"');
    expect(chart).toContain('"ESModule"');
    expect(chart).toContain('"JSON"');
    expect(chart).toContain('"yaml"');
  });

  it("nests files whose path does not start with their package under the package root", () => {
    const f: FileInfo = { path: "elsewhere/x.ts", name: "x.ts", id: "elsewhere_x_ts", pkg: "other" };
    expect(buildChart([f], none)).toContain("Component(elsewhere_x_ts");
  });

  it("limits edge labels to 5 values and 3 types, falling back to 'imports'", () => {
    const names = ["a", "b", "c", "d", "e", "f"];
    const target = file("p/t.ts", names.map((n) => `export function ${n}() {}`).join("\n") + "\nexport type T1 = 1; export type T2 = 2; export type T3 = 3; export type T4 = 4;\n");
    const src = file(
      "p/s.ts",
      `import { ${names.join(", ")}, type T1, type T2, type T3, type T4 } from "./t";\nexport const x = 1;\n`,
    );
    const chart = buildChart([target, src], { ...none, showExportedFunctions: true, showTypes: true });
    const rel = chart.split("\n").find((l) => l.includes("Rel(p_s_ts, p_t_ts"))!;
    expect(rel).toBe('  Rel(p_s_ts, p_t_ts, "a, b, c, d, e, type T1, type T2, type T3")');
  });
});

describe("buildNodeTooltips", () => {
  it("builds a tooltip per file with exports, functions and types", () => {
    const t = buildNodeTooltips(FILES, none);
    expect(t.app_index_ts).toEqual({
      title: "app/index.ts",
      description: "Entry point",
      exports: ["main"],
      functions: ["secret"],
      types: [],
    });
    expect(t.app_lib_helper_ts.types).toEqual(["Shape"]);
    expect(t.app_readme_md).toMatchObject({ title: "app/readme.md", exports: [], functions: [], types: [] });
  });

  it("adds symbol tooltips and caps list lengths", () => {
    const many = file(
      "m/many.ts",
      Array.from({ length: 12 }, (_, i) => `export function f${i}() {}\nfunction p${i}() {}\ntype T${i} = 1;`).join("\n"),
    );
    const small = buildNodeTooltips([many], none);
    expect(small.m_many_ts.exports).toHaveLength(8);
    expect(small.m_many_ts.functions).toHaveLength(5);
    expect(small.m_many_ts.types).toHaveLength(5);

    const big = buildNodeTooltips([many], all);
    expect(big.m_many_ts.functions).toHaveLength(8);
    expect(big.m_many_ts.types).toHaveLength(8);
    expect(big.m_many_ts__private_fn_p0).toEqual({ title: "p0", description: "Private function from m/many.ts" });
    expect(big.m_many_ts__exported_fn_f0).toEqual({ title: "f0", description: "Exported function from m/many.ts" });
    expect(big.m_many_ts__type_T0).toEqual({ title: "T0", description: "Type from m/many.ts" });
  });

  it("describes npm packages, with and without fetched metadata", () => {
    const plain = buildNodeTooltips(FILES, { ...none, showNpmImports: true });
    expect(plain.npm_react).toEqual({
      title: "react",
      description: "npm package dependency",
      href: "https://npmgraph.js.org/?q=react",
    });

    const withMeta = buildNodeTooltips(FILES, { ...none, showNpmImports: true }, {
      react: {
        name: "react",
        description: "UI lib",
        version: "19.0.0",
        author: { name: "Meta" },
        license: "MIT",
        lastUpdated: "2025-01-01",
      },
      zod: { _loading: true },
    });
    expect(withMeta.npm_react.description).toContain("**react**");
    expect(withMeta.npm_react.description).toContain("UI lib");
    expect(withMeta.npm_react.description).toContain("**Latest:** `19.0.0`");
    expect(withMeta.npm_react.description).toContain("**Author:** Meta");
    expect(withMeta.npm_react.description).toContain("**License:** MIT");
    expect(withMeta.npm_react.description).toContain("**Last updated:** 2025-01-01");
    expect(withMeta.npm_zod.description).toBe("Loading package metadata...");
  });

  it("falls back to dist-tags and ignores errored metadata", () => {
    const t = buildNodeTooltips(FILES, { ...none, showNpmImports: true }, {
      react: { name: "react", "dist-tags": { latest: "18.3.1" } },
      zod: { _error: true, name: "zod" },
    });
    expect(t.npm_react.description).toContain("`18.3.1`");
    expect(t.npm_zod.description).toBe("npm package dependency");
  });
});

describe("getGraphHierarchy", () => {
  it("nests files under their package and sub-directory boundaries", () => {
    const h = getGraphHierarchy(FILES, none);
    expect(h.pkg_app).toEqual(expect.arrayContaining(["app_index_ts", "app_types_ts", "app_readme_md", "pkg_app_lib"]));
    expect(h.pkg_app_lib).toEqual(["app_lib_helper_ts"]);
    expect(h.pkg_root).toEqual(["tool_ts"]);
  });

  it("adds symbol nodes under their file when enabled", () => {
    const h = getGraphHierarchy(FILES, all);
    expect(h.app_index_ts).toEqual([
      "app_index_ts__private_fn_secret",
      "app_index_ts__exported_fn_main",
    ]);
    expect(h.app_lib_helper_ts).toEqual(
      expect.arrayContaining([
        "app_lib_helper_ts__private_fn_internal",
        "app_lib_helper_ts__exported_fn_helper",
        "app_lib_helper_ts__type_Shape",
      ]),
    );
    expect(h.app_readme_md).toBeUndefined();
  });

  it("handles files outside their package prefix", () => {
    const f: FileInfo = { path: "elsewhere/x.ts", name: "x.ts", id: "x", pkg: "other" };
    expect(getGraphHierarchy([f], none)).toEqual({ pkg_other: ["x"] });
  });
});
