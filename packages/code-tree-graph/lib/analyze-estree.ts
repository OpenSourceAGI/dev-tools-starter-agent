/**
 * @file ESTree-based file analyser for JSX/TSX files.
 *
 * Uses `@typescript-eslint/typescript-estree` so that JSX syntax is handled
 * without needing a full TypeScript program.
 */
import fs from "fs";
import { parse } from "@typescript-eslint/typescript-estree";
import type { AnalysisItem, AnalysisKind, FileAnalysis, TypeProperty } from "./types";
import { SYSTEM_MODULES } from "./constants";

/**
 * Analyse a source file using the ESTree AST.
 *
 * @param filePath - Absolute path used for reading (ignored when `providedContent` is set).
 * @param providedContent - Optional in-memory source text.
 * @returns Parsed import/export information, or `undefined` if the file cannot be parsed.
 */
export function analyzeFileEstree(filePath: string, providedContent?: string): FileAnalysis | undefined {
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

  let ast: any;
  try {
    ast = parse(content, {
      jsx: true,
      loc: true,
      range: true,
      comment: true,
    });
  } catch {
    return undefined;
  }

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

  /**
   * Find the closest preceding JSDoc block comment for a node.
   * @returns The cleaned comment text, or `undefined`.
   */
  function getJsDoc(node: any): string | undefined {
    if (!ast.comments) return undefined;
    let closestComment: any = undefined;
    for (const comment of ast.comments) {
      if (comment.type === 'Block' && comment.value.startsWith('*')) {
        if (comment.loc.end.line <= node.loc.start.line && (!closestComment || comment.loc.end.line > closestComment.loc.end.line)) {
            closestComment = comment;
        }
      }
    }

    if (closestComment && node.loc.start.line - closestComment.loc.end.line <= 2) {
       const lines = closestComment.value.split('\n');
       for (const line of lines) {
         if (line.includes('@description')) return line.split('@description')[1].trim();
       }
       return lines.map((l: string) => l.replace(/^\s*\*\s?/, '').trim()).filter((l: string) => l && !l.startsWith('@')).join('\n').trim() || undefined;
    }
    return undefined;
  }

  /**
   * Extract a condensed signature string from a declaration node.
   */
  function getSignature(node: any): string | undefined {
      if (!node.range) return undefined;
      if (node.type === 'FunctionDeclaration' || node.type === 'TSDeclareFunction') {
         const headEnd = node.body ? node.body.range[0] : node.range[1];
         return content.slice(node.range[0], headEnd).replace(/^export\s+|default\s+|async\s+/g, '').trim();
      }
      if (node.type === 'VariableDeclarator') {
         if (node.init && (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
            const headEnd = node.init.body.range[0];
            return content.slice(node.init.range[0], headEnd).trim();
         }
         return node.id.typeAnnotation ? content.slice(node.id.typeAnnotation.range[0], node.id.typeAnnotation.range[1]) : undefined;
      }
      if (node.type === 'TSTypeAliasDeclaration' || node.type === 'TSInterfaceDeclaration' || node.type === 'TSEnumDeclaration' || node.type === 'ClassDeclaration') {
         return content.slice(node.range[0], node.range[1]);
      }
      return undefined;
  }

  /**
   * Extract properties from an interface or type-literal node.
   */
  function getProperties(node: any): TypeProperty[] | undefined {
      let members: any[] = [];
      if (node.type === 'TSInterfaceDeclaration' && node.body && node.body.body) {
          members = node.body.body;
      } else if (node.type === 'TSTypeAliasDeclaration' && node.typeAnnotation && node.typeAnnotation.type === 'TSTypeLiteral') {
          members = node.typeAnnotation.members;
      }

      if (!members.length) return undefined;

      const props: TypeProperty[] = [];
      for (const member of members) {
          if (member.type === 'TSPropertySignature' && member.key && member.key.name) {
             const required = !member.optional;
             const type = member.typeAnnotation ? content.slice(member.typeAnnotation.typeAnnotation.range[0], member.typeAnnotation.typeAnnotation.range[1]) : 'unknown';
             const propDoc = getJsDoc(member);
             const prop: TypeProperty = { name: member.key.name, type, required };
             if (propDoc) prop.description = propDoc;
             props.push(prop);
          }
      }
      return props.length > 0 ? props : undefined;
  }

  /**
   * Build an {@link AnalysisItem} from a declaration node.
   */
  function item(name: string, node: any, kind?: AnalysisKind): AnalysisItem {
    const line = node.loc.start.line;
    const jsdoc = getJsDoc(node);
    const signature = getSignature(node);
    const properties = getProperties(node);
    const result: AnalysisItem = { name, line };
    if (kind) result.kind = kind;
    if (jsdoc) result.jsdoc = jsdoc;
    if (signature) result.signature = signature;
    if (properties) result.properties = properties;
    return result;
  }

  /**
   * Process a single top-level AST node, populating the result arrays.
   */
  function processNode(node: any, isExported: boolean = false) {
     if (node.type === 'ImportDeclaration') {
        const mod = node.source.value;
        if (!SYSTEM_MODULES.has(mod)) {
            const isLocal = mod.startsWith(".") || mod.startsWith("/");
            const list = isLocal ? localImports : npmImports;
            if (!list.includes(mod)) list.push(mod);
            if (isLocal) {
               const symbolEntry = { source: mod, valueNames: [] as string[], typeNames: [] as string[] };
               for (const specifier of node.specifiers) {
                   if (specifier.type === 'ImportSpecifier') {
                       if (node.importKind === 'type' || specifier.importKind === 'type') {
                           symbolEntry.typeNames.push(specifier.local.name);
                       } else {
                           symbolEntry.valueNames.push(specifier.local.name);
                       }
                   } else if (specifier.type === 'ImportDefaultSpecifier') {
                       if (node.importKind === 'type') symbolEntry.typeNames.push(specifier.local.name);
                       else symbolEntry.valueNames.push(specifier.local.name);
                   }
               }
               if (symbolEntry.valueNames.length > 0 || symbolEntry.typeNames.length > 0) {
                   localImportSymbols.push(symbolEntry);
               }
            }
        }
     } else if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
            processNode(node.declaration, true);
        } else {
            for (const specifier of node.specifiers) {
                exports.push(item(specifier.exported.name, node));
            }
        }
     } else if (node.type === 'ExportDefaultDeclaration') {
         exports.push(item('default', node.declaration));
     } else if (node.type === 'FunctionDeclaration' || node.type === 'TSDeclareFunction') {
         const entry = item(node.id ? node.id.name : 'default', node, 'function');
         if (isExported) exports.push(entry);
         else functions.push(entry);
     } else if (node.type === 'ClassDeclaration') {
         const entry = item(node.id ? node.id.name : 'default', node, 'class');
         if (isExported) exports.push(entry);
         else functions.push(entry);
     } else if (node.type === 'VariableDeclaration') {
         for (const decl of node.declarations) {
             if (decl.id.type === 'Identifier') {
                const isFunc = decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression');
                const entry = item(decl.id.name, decl, isFunc ? 'function' : 'constant');

                if (!entry.jsdoc) entry.jsdoc = getJsDoc(node);

                if (isExported) exports.push(entry);
                else if (isFunc) functions.push(entry);
             }
         }
     } else if (node.type === 'TSTypeAliasDeclaration' || node.type === 'TSInterfaceDeclaration' || node.type === 'TSEnumDeclaration') {
         const entry = item(node.id ? node.id.name : 'unknown', node, 'type');
         if (isExported) exports.push(entry);
         else types.push(entry);
     }
  }

  for (const node of ast.body) {
      processNode(node);
  }

  const hasContent = localImports.length > 0 || localImportSymbols.length > 0 || npmImports.length > 0 ||
    exports.length > 0 || functions.length > 0 || types.length > 0;
  if (!hasContent) return undefined;
  return { localImports, localImportSymbols, npmImports, exports, functions, types };
}
