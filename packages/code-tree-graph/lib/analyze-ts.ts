/**
 * @file TypeScript compiler-based file analyser.
 *
 * Uses `ts.createSourceFile` to parse `.ts`, `.js`, and `.mjs` files and
 * extract import/export metadata.  Falls back to the ESTree analyser for
 * `.tsx`/`.jsx` files.
 */
import fs from "fs";
import path from "path";
import * as ts from "typescript";
import type { AnalysisItem, AnalysisKind, FileAnalysis, TypeProperty } from "./types";
import { PARSEABLE_EXTS, SYSTEM_MODULES } from "./constants";
import { analyzeFileEstree } from "./analyze-estree";

/**
 * Analyse a source file using the TypeScript compiler API.
 *
 * For `.tsx`/`.jsx` files the work is delegated to {@link analyzeFileEstree}.
 *
 * @param filePath - Absolute path (or virtual name when `providedContent` is given).
 * @param providedContent - Optional in-memory source text to analyse instead of reading from disk.
 * @returns Parsed import/export information, or `undefined` when the file is not parseable.
 */
export function analyzeFile(filePath: string, providedContent?: string): FileAnalysis | undefined {
  const ext = path.extname(filePath);
  if (!PARSEABLE_EXTS.has(ext)) return undefined;

  if (ext === ".tsx" || ext === ".jsx") {
    return analyzeFileEstree(filePath, providedContent);
  }

  let content: string;
  if (providedContent !== undefined) {
    content = providedContent;
  } else {
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      return undefined;
    }
  }

  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    content,
    ts.ScriptTarget.Latest,
    true,
    ext === ".tsx" || ext === ".jsx" ? ts.ScriptKind.TSX : undefined
  );

  const localImports: string[] = [];
  const localImportSymbols: {
    source: string;
    valueNames: string[];
    typeNames: string[];
  }[] = [];
  const npmImports: string[] = [];
  const exports: AnalysisItem[] = [];
  const functions: AnalysisItem[] = [];
  const types: AnalysisItem[] = [];

  /** Check whether a node has the `export` keyword modifier. */
  function hasExportModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node)
      ? (ts.getModifiers(node) ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      : false;
  }

  /**
   * Extract a JSDoc comment string from a node.
   *
   * Looks at the compiler's own `jsDoc` array first, then falls back to
   * searching for a leading `//` comment in the source text.
   */
  function getJsDoc(node: ts.Node): string | undefined {
    const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;
    if (jsDocNodes && jsDocNodes.length > 0) {
      const doc = jsDocNodes[0];
      let comment: string | undefined;
      if (typeof doc.comment === "string") {
        comment = doc.comment;
      } else if (Array.isArray(doc.comment)) {
        comment = doc.comment.map((part: any) => part.text || "").join("").trim() || undefined;
      }
      if (comment) return comment;
      if (doc.tags) {
        for (const tag of doc.tags) {
          if (tag.tagName.text === "description" && typeof tag.comment === "string") {
            return tag.comment;
          }
        }
      }
    }
    const fullText = sourceFile.getFullText();
    const nodeStart = node.getStart(sourceFile);
    const textBefore = fullText.substring(0, nodeStart);
    const lines = textBefore.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === "") continue;
      if (line.startsWith("//")) {
        return line.replace(/^\/\/\s*/, "").trim() || undefined;
      }
      break;
    }
    return undefined;
  }

  /** Build a condensed signature string from a declaration node. */
  function getSignature(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node)) {
      const params = node.parameters.map(p => p.getText(sourceFile)).join(", ");
      const ret = node.type ? `: ${node.type.getText(sourceFile)}` : "";
      return `(${params})${ret}`;
    }
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          const fn = decl.initializer;
          const params = fn.parameters.map(p => p.getText(sourceFile)).join(", ");
          const ret = fn.type ? `: ${fn.type.getText(sourceFile)}` : "";
          return `(${params})${ret}`;
        }
        if (decl.type) return decl.type.getText(sourceFile);
      }
    }
    if (ts.isTypeAliasDeclaration(node)) return node.type.getText(sourceFile);
    if (ts.isInterfaceDeclaration(node)) {
      const members = node.members.map(m => m.getText(sourceFile).replace(/;$/, "")).filter(Boolean);
      if (members.length === 0) return undefined;
      return `{\n  ${members.join(";\n  ")}\n}`;
    }
    if (ts.isEnumDeclaration(node)) {
      const members = node.members.map(m => m.getText(sourceFile)).filter(Boolean);
      if (members.length === 0) return undefined;
      return `{ ${members.join(", ")} }`;
    }
    if (ts.isClassDeclaration(node)) {
      const methods = node.members.filter(ts.isMethodDeclaration).map(m => m.name?.getText(sourceFile)).filter(Boolean);
      if (methods.length === 0) return undefined;
      return `{ ${methods.join(", ")} }`;
    }
    return undefined;
  }

  /** Extract properties from an interface or type-literal declaration. */
  function getProperties(node: ts.Node): TypeProperty[] | undefined {
    let members: ts.NodeArray<ts.TypeElement> | undefined;
    if (ts.isInterfaceDeclaration(node)) {
      members = node.members;
    } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
      members = node.type.members;
    }
    if (!members || members.length === 0) return undefined;
    const props: TypeProperty[] = [];
    for (const member of members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const propName = member.name.getText(sourceFile);
      const propType = member.type ? member.type.getText(sourceFile) : "unknown";
      const propDoc = getJsDoc(member);
      const required = !member.questionToken;
      const prop: TypeProperty = { name: propName, type: propType, required };
      if (propDoc) prop.description = propDoc;
      props.push(prop);
    }
    return props.length > 0 ? props : undefined;
  }

  /** Get the 1-based line number where a node starts. */
  function getLine(node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  /** Build an {@link AnalysisItem} from a TypeScript AST node. */
  function item(name: string, node: ts.Node, kind?: AnalysisKind): AnalysisItem {
    const jsdoc = getJsDoc(node);
    const signature = getSignature(node);
    const properties = getProperties(node);
    const line = getLine(node);
    const result: AnalysisItem = { name, line };
    if (kind) result.kind = kind;
    if (jsdoc) result.jsdoc = jsdoc;
    if (signature) result.signature = signature;
    if (properties) result.properties = properties;
    return result;
  }

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const mod = (node.moduleSpecifier as ts.StringLiteral).text;
      if (SYSTEM_MODULES.has(mod)) return;
      const isLocal = mod.startsWith(".") || mod.startsWith("/");
      const list = isLocal ? localImports : npmImports;
      if (!list.includes(mod)) list.push(mod);
      if (isLocal && node.importClause) {
        const symbolEntry = { source: mod, valueNames: [] as string[], typeNames: [] as string[] };
        if (node.importClause.name && !node.importClause.isTypeOnly) {
          symbolEntry.valueNames.push(node.importClause.name.text);
        }
        const bindings = node.importClause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) {
            const importedName = el.propertyName?.text || el.name.text;
            if (node.importClause.isTypeOnly || el.isTypeOnly) {
              symbolEntry.typeNames.push(importedName);
            } else {
              symbolEntry.valueNames.push(importedName);
            }
          }
        }
        if (symbolEntry.valueNames.length > 0 || symbolEntry.typeNames.length > 0) {
          localImportSymbols.push(symbolEntry);
        }
      }
    }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        exports.push(item(el.name.text, node));
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (hasExportModifier(node)) {
        exports.push(item(node.name.text, node, "function"));
      } else {
        functions.push(item(node.name.text, node, "function"));
      }
    }
    if (ts.isVariableStatement(node)) {
      const isExported = hasExportModifier(node);
      const stmtDoc = getJsDoc(node);
      const stmtSig = getSignature(node);
      for (const decl of node.declarationList.declarations) {
        if (decl.name && ts.isIdentifier(decl.name)) {
          const declDoc = getJsDoc(decl) || stmtDoc;
          const isFunc = decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
          const kind: AnalysisKind = isFunc ? "function" : "constant";
          const entry: AnalysisItem = { name: decl.name.text, kind, line: getLine(node) };
          if (declDoc) entry.jsdoc = declDoc;
          if (stmtSig) entry.signature = stmtSig;
          const props = getProperties(decl);
          if (props) entry.properties = props;
          if (isExported) {
            exports.push(entry);
          } else if (isFunc) {
            functions.push(entry);
          }
        }
      }
    }
    if (ts.isClassDeclaration(node) && node.name) {
      if (hasExportModifier(node)) {
        exports.push(item(node.name.text, node, "class"));
      } else {
        functions.push(item(node.name.text, node, "class"));
      }
    }
    if (ts.isTypeAliasDeclaration(node)) types.push(item(node.name.text, node, "type"));
    if (ts.isInterfaceDeclaration(node)) types.push(item(node.name.text, node, "type"));
    if (ts.isEnumDeclaration(node)) types.push(item(node.name.text, node, "type"));
    if (ts.isExportAssignment(node)) exports.push(item("default", node));
  });

  const hasContent = localImports.length > 0 || localImportSymbols.length > 0 || npmImports.length > 0 ||
    exports.length > 0 || functions.length > 0 || types.length > 0;
  if (!hasContent) return undefined;
  return { localImports, localImportSymbols, npmImports, exports, functions, types };
}
