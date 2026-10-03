import { describe, expect, it } from "vitest";
import { analyzeFile } from "../lib/analyze-ts";
import { analyzeFileEstree } from "../lib/analyze-estree";
import { analyzeFileContent } from "../lib";

const names = (items: { name: string }[]) => items.map((i) => i.name);

describe("analyzeFile (TypeScript compiler)", () => {
  it("returns undefined for non-parseable extensions and unreadable files", () => {
    expect(analyzeFile("readme.md", "# hi")).toBeUndefined();
    expect(analyzeFile("/definitely/not/here.ts")).toBeUndefined();
  });

  it("returns undefined for a file with nothing to report", () => {
    expect(analyzeFile("empty.ts", "// just a comment\nconst x = 1;\n")).toBeUndefined();
  });

  it("classifies imports into local, npm and skipped system modules", () => {
    const a = analyzeFile(
      "a.ts",
      [
        'import fs from "fs";',
        'import path from "node:path";',
        'import React from "react";',
        'import React2 from "react";',
        'import { z } from "zod";',
        'import { helper, type Helper } from "./helper";',
        'import type { Only } from "../types";',
        'import Default, * as ns from "/abs/mod";',
        'import "./side-effect";',
      ].join("\n"),
    )!;
    expect(a.npmImports).toEqual(["react", "zod"]);
    expect(a.localImports).toEqual(["./helper", "../types", "/abs/mod", "./side-effect"]);
    expect(a.localImportSymbols).toEqual([
      { source: "./helper", valueNames: ["helper"], typeNames: ["Helper"] },
      { source: "../types", valueNames: [], typeNames: ["Only"] },
      { source: "/abs/mod", valueNames: ["Default"], typeNames: [] },
    ]);
  });

  it("records the original name for aliased imports", () => {
    const a = analyzeFile("a.ts", 'import { real as alias } from "./m";\n')!;
    expect(a.localImportSymbols[0].valueNames).toEqual(["real"]);
  });

  it("treats a type-only default import as a type", () => {
    const a = analyzeFile("a.ts", 'import type Def from "./m";\n')!;
    expect(a.localImportSymbols).toEqual([{ source: "./m", valueNames: [], typeNames: [] }].filter((e) => e.typeNames.length || e.valueNames.length));
  });

  it("separates exported from private functions and classes, with signatures and lines", () => {
    const a = analyzeFile(
      "a.ts",
      [
        "/** Adds numbers. */",
        "export function add(a: number, b: number): number { return a + b; }",
        "function hidden(x) { return x; }",
        "export class Box { open() {} close() {} }",
        "class Secret {}",
        "export default 42;",
      ].join("\n"),
    )!;
    expect(names(a.exports)).toEqual(["add", "Box", "default"]);
    expect(a.exports[0]).toMatchObject({
      name: "add",
      kind: "function",
      line: 2,
      jsdoc: "Adds numbers.",
      signature: "(a: number, b: number): number",
    });
    expect(a.exports[1]).toMatchObject({ name: "Box", kind: "class", signature: "{ open, close }" });
    expect(names(a.functions)).toEqual(["hidden", "Secret"]);
    expect(a.functions[1].signature).toBeUndefined();
  });

  it("handles variable statements: arrow functions, typed constants, plain constants", () => {
    const a = analyzeFile(
      "a.ts",
      [
        "// the answer",
        "export const answer: number = 42;",
        "export const double = (n: number): number => n * 2;",
        "const priv = () => 1;",
        "const plain = 5;",
        "export const fe = function (x: string) { return x; };",
        "export const { a, b } = obj;",
      ].join("\n"),
    )!;
    const by = Object.fromEntries(a.exports.map((e) => [e.name, e]));
    expect(by.answer).toMatchObject({ kind: "constant", signature: "number", jsdoc: "the answer" });
    expect(by.double).toMatchObject({ kind: "function", signature: "(n: number): number" });
    expect(by.fe).toMatchObject({ kind: "function", signature: "(x: string)" });
    expect(names(a.exports)).not.toContain("a");
    expect(names(a.functions)).toEqual(["priv"]);
  });

  it("documents types, interfaces and enums with member properties", () => {
    const a = analyzeFile(
      "a.ts",
      [
        "/** A user. */",
        "export interface User {",
        "  /** Unique id */",
        "  id: string;",
        "  name?: string;",
        "  untyped;",
        "  method(): void;",
        "}",
        "export type Alias = string | number;",
        "type Shape = { w: number; h?: number };",
        "enum Color { Red, Green }",
        "interface Empty {}",
        "enum Nothing {}",
      ].join("\n"),
    )!;
    const user = a.types.find((t) => t.name === "User")!;
    expect(user.jsdoc).toBe("A user.");
    expect(user.properties).toEqual([
      { name: "id", type: "string", required: true, description: "Unique id" },
      { name: "name", type: "string", required: false },
      { name: "untyped", type: "unknown", required: true },
    ]);
    expect(user.signature).toContain("id: string");
    expect(a.types.find((t) => t.name === "Alias")!.signature).toBe("string | number");
    expect(a.types.find((t) => t.name === "Shape")!.properties).toEqual([
      { name: "w", type: "number", required: true },
      { name: "h", type: "number", required: false },
    ]);
    expect(a.types.find((t) => t.name === "Color")!.signature).toBe("{ Red, Green }");
    expect(a.types.find((t) => t.name === "Empty")!.signature).toBeUndefined();
    expect(a.types.find((t) => t.name === "Nothing")!.signature).toBeUndefined();
  });

  it("records re-exports", () => {
    const a = analyzeFile("a.ts", 'export { one, two as three } from "./m";\nconst x = 1;\nexport { x };\n')!;
    expect(names(a.exports)).toEqual(["one", "three", "x"]);
  });

  it("reads a @description tag when there is no leading comment text", () => {
    const a = analyzeFile("a.ts", "/**\n * @description Hello tag\n */\nexport function f() {}\n")!;
    expect(a.exports[0].jsdoc).toBe("Hello tag");
  });

  it("joins structured JSDoc comment parts", () => {
    const a = analyzeFile("a.ts", "/** See {@link Other} for more. */\nexport function f() {}\n")!;
    expect(a.exports[0].jsdoc).toContain("See");
  });

  it("only picks up a // comment directly above a node", () => {
    const a = analyzeFile("a.ts", "// first\n\nexport function f() {}\n// second\nexport function g() {}\n")!;
    expect(a.exports.find((e) => e.name === "f")!.jsdoc).toBe("first");
    expect(a.exports.find((e) => e.name === "g")!.jsdoc).toBe("second");
    const none = analyzeFile("a.ts", "export function h() {}\nexport function i() {}\n")!;
    expect(none.exports[1].jsdoc).toBeUndefined();
  });

  it("reads files from disk when no content is passed", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctg-"));
    const file = path.join(dir, "x.mjs");
    fs.writeFileSync(file, "export const v = 1;\n");
    try {
      expect(names(analyzeFile(file)!.exports)).toEqual(["v"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("delegates .tsx and .jsx to the ESTree analyzer", () => {
    const a = analyzeFile("c.tsx", "export function C() { return <div/>; }\n")!;
    expect(names(a.exports)).toEqual(["C"]);
    expect(analyzeFile("c.jsx", "export const D = () => <p/>;\n")!.exports[0].kind).toBe("function");
  });
});

describe("analyzeFileEstree", () => {
  it("returns undefined for unreadable files, syntax errors and empty modules", () => {
    expect(analyzeFileEstree("/nope/x.tsx")).toBeUndefined();
    expect(analyzeFileEstree("x.tsx", "export function (((")).toBeUndefined();
    expect(analyzeFileEstree("x.tsx", "const x = 1;")).toBeUndefined();
  });

  it("extracts clean JSDoc text and strips async/export from signatures", () => {
    const src = [
      'import { a } from "./a";',
      "/**",
      " * Does the thing.",
      " * More text.",
      " * @param x foo",
      " */",
      "export function foo(x: number): string { return ''; }",
      "",
      "",
      "",
      "export async function bar() {}",
    ].join("\n");
    const a = analyzeFileEstree("f.tsx", src)!;
    const foo = a.exports.find((e) => e.name === "foo")!;
    expect(foo.jsdoc).toBe("Does the thing.\nMore text.");
    expect(foo.signature).toBe("function foo(x: number): string");
    expect(foo.kind).toBe("function");
    expect(foo.line).toBe(7);
    const bar = a.exports.find((e) => e.name === "bar")!;
    expect(bar.signature).toBe("function bar()");
    expect(bar.jsdoc).toBeUndefined();
  });

  it("prefers an @description line", () => {
    const a = analyzeFileEstree("f.tsx", "/**\n * Intro\n * @description The real one\n */\nexport const X = 1;\n")!;
    expect(a.exports[0].jsdoc).toBe("The real one");
  });

  it("classifies imports like the compiler-based analyzer", () => {
    const a = analyzeFileEstree(
      "f.tsx",
      [
        'import fs from "fs";',
        'import React from "react";',
        'import { x, type Y } from "./local";',
        'import type { Z } from "../z";',
        'import type Def from "./def";',
        'import Plain from "./plain";',
        'import * as ns from "./ns";',
        'import "./side";',
      ].join("\n"),
    )!;
    expect(a.npmImports).toEqual(["react"]);
    expect(a.localImports).toEqual(["./local", "../z", "./def", "./plain", "./ns", "./side"]);
    expect(a.localImportSymbols).toEqual([
      { source: "./local", valueNames: ["x"], typeNames: ["Y"] },
      { source: "../z", valueNames: [], typeNames: ["Z"] },
      { source: "./def", valueNames: [], typeNames: ["Def"] },
      { source: "./plain", valueNames: ["Plain"], typeNames: [] },
    ]);
  });

  it("separates exported/private functions, classes, constants and types", () => {
    const a = analyzeFileEstree(
      "f.tsx",
      [
        "function hidden() {}",
        "export class Widget {}",
        "class Hidden2 {}",
        "export const k = 1;",
        "export const arrow = (n: number): number => n;",
        "const privArrow = () => <b/>;",
        "const privFn = function () {};",
        "const notExported = 5;",
        "export const { a, b } = obj;",
        "type T = string;",
        "export type U = number;",
        "export interface I { a: string; b?: number; c; 'quoted': boolean }",
        "export enum E { A }",
        "export default function Main() { return <div/>; }",
        "export default class {}",
        "export { k as renamed };",
        "declare function ambient(x: number): void;",
        "export declare function ambient2(): string;",
        "export const typed: Record<string, number> = {};",
      ].join("\n"),
    )!;
    expect(names(a.functions)).toEqual(
      expect.arrayContaining(["hidden", "Hidden2", "privArrow", "privFn", "ambient"]),
    );
    expect(names(a.exports)).toEqual(
      expect.arrayContaining(["Widget", "k", "arrow", "U", "I", "E", "default", "renamed", "ambient2", "typed"]),
    );
    expect(names(a.types)).toEqual(["T"]);
    expect(a.exports.find((e) => e.name === "typed")!.signature).toBe(": Record<string, number>");
    expect(a.exports.find((e) => e.name === "arrow")!.signature).toBe("(n: number): number =>");
    const iface = a.exports.find((e) => e.name === "I")!;
    expect(iface.properties).toEqual([
      { name: "a", type: "string", required: true },
      { name: "b", type: "number", required: false },
      { name: "c", type: "unknown", required: true },
    ]);
    // Quoted keys have no `name` in the ESTree, so they are skipped.
    expect(iface.kind).toBe("type");
  });

  it("extracts properties of a type-literal alias", () => {
    const a = analyzeFileEstree("f.tsx", "type P = {\n  /** w doc */\n  w: number;\n\n\n\n  h?: string;\n};\n")!;
    expect(a.types[0].properties).toEqual([
      { name: "w", type: "number", required: true, description: "w doc" },
      { name: "h", type: "string", required: false },
    ]);
  });

  it("inherits a statement-level JSDoc for declarators", () => {
    const a = analyzeFileEstree("f.tsx", "/** Shared doc */\nexport const one = 1, two = 2;\n")!;
    expect(a.exports.map((e) => e.jsdoc)).toEqual(["Shared doc", "Shared doc"]);
  });
});

describe("analyzeFileContent", () => {
  it("is a thin wrapper over analyzeFile", () => {
    expect(names(analyzeFileContent("x.ts", "export const q = 1;")!.exports)).toEqual(["q"]);
    expect(analyzeFileContent("x.css", "a{}")).toBeUndefined();
  });
});
