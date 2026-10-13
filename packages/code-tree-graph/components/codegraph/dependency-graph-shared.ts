/**
 * Shared utility functions, logic, and tooltip builders for the dependency graph and its components.
 */
import type { FileAnalysis } from "../../lib";

export interface FileInfo {
  path: string;
  name: string;
  id: string;
  pkg: string;
  description?: string;
  analysis?: FileAnalysis;
}

export interface GraphDisplayOptions {
  showNpmImports: boolean;
  showTypes: boolean;
  showPrivateFunctions: boolean;
  showExportedFunctions: boolean;
}

export interface MermaidTooltipData {
  title: string;
  description?: string;
  exports?: string[];
  functions?: string[];
  types?: string[];
  href?: string;
}

const NODE_COLORS = {
  entry: { bg: "#14532d", border: "#22c55e", font: "#f0fdf4" },
  core: { bg: "#1d4ed8", border: "#60a5fa", font: "#eff6ff" },
  types: { bg: "#7e22ce", border: "#c084fc", font: "#faf5ff" },
  util: { bg: "#334155", border: "#94a3b8", font: "#f8fafc" },
  npm: { bg: "#7c2d12", border: "#fb923c", font: "#fff7ed" },
  fn: { bg: "#14532d", border: "#4ade80", font: "#ecfdf5" },
  exportFn: { bg: "#164e63", border: "#22d3ee", font: "#ecfeff" },
  typeNode: { bg: "#581c87", border: "#c084fc", font: "#faf5ff" },
} as const;

function resolveImport(fromPath: string, importPath: string): string {
  const dir = fromPath.split("/").slice(0, -1);
  const parts = importPath.replace(/\.(js|ts|mjs|mts)$/, "").split("/");
  const resolved = [...dir];
  for (const p of parts) {
    if (p === "..") resolved.pop();
    else if (p !== ".") resolved.push(p);
  }
  return resolved.join("/");
}

function uniqueNames(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function makeSymbolNodeId(
  fileId: string,
  prefix: "private_fn" | "exported_fn" | "type",
  name: string,
): string {
  return `${fileId}__${prefix}_${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function escapeC4(value: string): string {
  return value.replace(/"/g, "'");
}

function classifyFile(f: FileInfo): keyof typeof NODE_COLORS {
  if (f.name === "index.ts" || f.name === "index.js") return "entry";
  if (f.name.includes("type")) return "types";
  if (
    f.analysis?.exports.some((e) => e.kind === "function" || e.kind === "class")
  )
    return "core";
  return "util";
}

function fileExtTech(f: FileInfo): string {
  const ext = f.name.split(".").pop() ?? "";
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "React TSX",
    js: "JavaScript",
    jsx: "React JSX",
    mjs: "ESModule",
    md: "Markdown",
    json: "JSON",
  };
  return map[ext] ?? ext;
}

export function buildChart(
  files: FileInfo[],
  options: GraphDisplayOptions,
): string {
  const lines: string[] = ["C4Container"];

  // Group files by package
  const pkgs = new Map<string, FileInfo[]>();
  for (const f of files) {
    if (!pkgs.has(f.pkg)) pkgs.set(f.pkg, []);
    pkgs.get(f.pkg)!.push(f);
  }

  const pathLookup = new Map<string, string>();
  for (const f of files) {
    pathLookup.set(f.path, f.id);
    pathLookup.set(f.path.replace(/\.[^.]+$/, ""), f.id);
  }

  // Track all file IDs and their color classification for styling
  const fileStyles: { id: string; color: keyof typeof NODE_COLORS }[] = [];

  // Emit Container_Boundary per package, nested by subdirectory
  for (const [pkg, pkgFiles] of pkgs) {
    const pkgId = `pkg_${pkg.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    lines.push(`  Container_Boundary(${pkgId}, "${pkg} ➕") {`);

    // Separate files into subdirectories vs package root
    const subDirs = new Map<string, FileInfo[]>();
    const rootFiles: FileInfo[] = [];
    for (const f of pkgFiles) {
      const relPath =
        pkg === "root"
          ? f.name
          : f.path.startsWith(`${pkg}/`)
            ? f.path.slice(pkg.length + 1)
            : f.name;
      const parts = relPath.split("/");
      if (parts.length > 1) {
        const subDir = parts[0];
        if (!subDirs.has(subDir)) subDirs.set(subDir, []);
        subDirs.get(subDir)!.push(f);
      } else {
        rootFiles.push(f);
      }
    }

    // Nested subdirectory boundaries
    for (const [subDir, subFiles] of subDirs) {
      const subId = `${pkgId}_${subDir.replace(/[^a-zA-Z0-9_]/g, "_")}`;
      lines.push(`    Container_Boundary(${subId}, "${subDir}/ ➕") {`);
      for (const f of subFiles) {
        const shortName = f.path.startsWith(`${pkg}/`)
          ? f.path.slice(pkg.length + 1)
          : f.name;
        const tech = fileExtTech(f);
        const cls = classifyFile(f);
        fileStyles.push({ id: f.id, color: cls });
        lines.push(
          `      Component(${f.id}, "${escapeC4(f.name)}", "${tech}")`,
        );
      }
      lines.push(`    }`);
    }

    // Root-level files in the package
    for (const f of rootFiles) {
      const tech = fileExtTech(f);
      const cls = classifyFile(f);
      fileStyles.push({ id: f.id, color: cls });
      lines.push(`    Component(${f.id}, "${escapeC4(f.name)}", "${tech}")`);
    }

    lines.push(`  }`);
  }

  // Symbol nodes (private functions, exported functions, types) as top-level components
  const symbolStyles: { id: string; color: keyof typeof NODE_COLORS }[] = [];

  if (
    options.showPrivateFunctions ||
    options.showExportedFunctions ||
    options.showTypes
  ) {
    for (const f of files) {
      if (!f.analysis) continue;

      if (options.showPrivateFunctions) {
        for (const fnName of uniqueNames(
          f.analysis.functions.map((i) => i.name),
        )) {
          const nodeId = makeSymbolNodeId(f.id, "private_fn", fnName);
          lines.push(
            `  Component(${nodeId}, "${escapeC4(fnName)}", "Function")`,
          );
          symbolStyles.push({ id: nodeId, color: "fn" });
        }
      }

      if (options.showExportedFunctions) {
        for (const fnName of uniqueNames(
          f.analysis.exports
            .filter((i) => i.kind === "function" || i.kind === "class")
            .map((i) => i.name),
        )) {
          const nodeId = makeSymbolNodeId(f.id, "exported_fn", fnName);
          lines.push(`  Component(${nodeId}, "${escapeC4(fnName)}", "Export")`);
          symbolStyles.push({ id: nodeId, color: "exportFn" });
        }
      }

      if (options.showTypes) {
        const typeNames = uniqueNames([
          ...f.analysis.types.map((i) => i.name),
          ...f.analysis.exports
            .filter((i) => i.kind === "type")
            .map((i) => i.name),
        ]);
        for (const typeName of typeNames) {
          const nodeId = makeSymbolNodeId(f.id, "type", typeName);
          lines.push(`  Component(${nodeId}, "${escapeC4(typeName)}", "Type")`);
          symbolStyles.push({ id: nodeId, color: "typeNode" });
        }
      }
    }
  }

  // NPM external systems
  if (options.showNpmImports) {
    const npmNodes = new Map<string, string>();
    for (const f of files) {
      for (const pkg of [...new Set(f.analysis?.npmImports ?? [])]) {
        if (!npmNodes.has(pkg)) {
          const nodeId = `npm_${pkg.replace(/[^a-zA-Z0-9]/g, "_")}`;
          npmNodes.set(pkg, nodeId);
          lines.push(
            `  System_Ext(${nodeId}, "${escapeC4(pkg)}", "npm package")`,
          );
          symbolStyles.push({ id: nodeId, color: "npm" });
        }
      }
    }
  }

  lines.push("");

  // Relationships: file-to-file imports
  const edges = new Set<string>();

  const fileEdges = new Map<
    string,
    {
      from: string;
      to: string;
      valueNames: Set<string>;
      typeNames: Set<string>;
    }
  >();
  const getFileEdge = (from: string, to: string) => {
    const key = `${from}=>${to}`;
    let edge = fileEdges.get(key);
    if (!edge) {
      edge = { from, to, valueNames: new Set(), typeNames: new Set() };
      fileEdges.set(key, edge);
    }
    return edge;
  };

  for (const f of files) {
    if (!f.analysis) continue;
    for (const imp of f.analysis.localImports) {
      const resolved = resolveImport(f.path, imp);
      const targetId = pathLookup.get(resolved);
      if (targetId && targetId !== f.id) getFileEdge(f.id, targetId);
    }
  }

  // Collect symbol import details
  if (options.showExportedFunctions || options.showTypes) {
    for (const f of files) {
      if (!f.analysis) continue;
      for (const imported of f.analysis.localImportSymbols ?? []) {
        const resolved = resolveImport(f.path, imported.source);
        const targetFile = files.find(
          (c) =>
            c.path === resolved || c.path.replace(/\.[^.]+$/, "") === resolved,
        );
        if (!targetFile || targetFile.id === f.id) continue;
        const fileEdge = getFileEdge(f.id, targetFile.id);
        if (options.showExportedFunctions)
          for (const v of imported.valueNames) fileEdge.valueNames.add(v);
        if (options.showTypes)
          for (const t of imported.typeNames) fileEdge.typeNames.add(t);
      }
    }
  }

  // Emit Rel() for file edges
  for (const edge of fileEdges.values()) {
    const valueParts = options.showExportedFunctions
      ? uniqueNames([...edge.valueNames]).slice(0, 5)
      : [];
    const typeParts = options.showTypes
      ? uniqueNames([...edge.typeNames])
          .slice(0, 3)
          .map((n) => `type ${n}`)
      : [];
    const label = [...valueParts, ...typeParts].join(", ") || "imports";
    const key = `${edge.from}->${edge.to}`;
    if (!edges.has(key)) {
      edges.add(key);
      lines.push(`  Rel(${edge.from}, ${edge.to}, "${escapeC4(label)}")`);
    }
  }

  // Symbol relationships
  if (
    options.showPrivateFunctions ||
    options.showExportedFunctions ||
    options.showTypes
  ) {
    for (const f of files) {
      if (!f.analysis) continue;
      if (options.showPrivateFunctions) {
        for (const fnName of uniqueNames(
          f.analysis.functions.map((i) => i.name),
        )) {
          lines.push(
            `  Rel(${f.id}, ${makeSymbolNodeId(f.id, "private_fn", fnName)}, "defines")`,
          );
        }
      }
      if (options.showTypes) {
        const typeNames = uniqueNames([
          ...f.analysis.types.map((i) => i.name),
          ...f.analysis.exports
            .filter((i) => i.kind === "type")
            .map((i) => i.name),
        ]);
        for (const typeName of typeNames) {
          lines.push(
            `  Rel(${f.id}, ${makeSymbolNodeId(f.id, "type", typeName)}, "declares")`,
          );
        }
      }
    }
  }

  // NPM import relationships
  if (options.showNpmImports) {
    const npmNodes = new Map<string, string>();
    for (const f of files) {
      for (const pkg of [...new Set(f.analysis?.npmImports ?? [])]) {
        if (!npmNodes.has(pkg))
          npmNodes.set(pkg, `npm_${pkg.replace(/[^a-zA-Z0-9]/g, "_")}`);
        const targetId = npmNodes.get(pkg)!;
        const key = `${f.id}->${targetId}`;
        if (!edges.has(key)) {
          edges.add(key);
          lines.push(`  Rel(${f.id}, ${targetId}, "uses")`);
        }
      }
    }
  }

  lines.push("");

  lines.push("");

  lines.push("");

  // Per-element styling
  for (const { id, color } of [...fileStyles, ...symbolStyles]) {
    const c = NODE_COLORS[color];
    lines.push(
      `  UpdateElementStyle(${id}, $bgColor="${c.bg}", $fontColor="${c.font}", $borderColor="${c.border}")`,
    );
  }

  // No per-boundary styling: Mermaid's C4 grammar has no UpdateBoundaryStyle,
  // and emitting it makes the whole chart fail to parse. Boundaries take the
  // cluster colors from the Mermaid theme instead.

  // Layout
  lines.push(`  UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="2")`);

  return lines.join("\n");
}

export function buildNodeTooltips(
  files: FileInfo[],
  options: GraphDisplayOptions,
  npmMetadata?: Record<string, any>,
): Record<string, MermaidTooltipData> {
  const tooltips: Record<string, MermaidTooltipData> = {};

  for (const file of files) {
    const exportNames =
      file.analysis?.exports.map((item) => item.name).filter(Boolean) ?? [];
    const functionNames =
      file.analysis?.functions.map((item) => item.name).filter(Boolean) ?? [];
    const typeNames = [
      ...(file.analysis?.types.map((item) => item.name).filter(Boolean) ?? []),
      ...(file.analysis?.exports
        .filter((item) => item.kind === "type")
        .map((item) => item.name)
        .filter(Boolean) ?? []),
    ];

    tooltips[file.id] = {
      title: file.path,
      description: file.description,
      exports: exportNames.slice(0, 8),
      functions: functionNames.slice(
        0,
        options.showPrivateFunctions || options.showExportedFunctions ? 8 : 5,
      ),
      types: [...new Set(typeNames)].slice(0, options.showTypes ? 8 : 5),
    };

    if (options.showPrivateFunctions) {
      const privateFunctionNames = uniqueNames([
        ...(file.analysis?.functions.map((item) => item.name) ?? []),
      ]);

      for (const fnName of privateFunctionNames) {
        tooltips[makeSymbolNodeId(file.id, "private_fn", fnName)] = {
          title: fnName,
          description: `Private function from ${file.path}`,
        };
      }
    }

    if (options.showExportedFunctions) {
      const exportedFunctionNames = uniqueNames([
        ...(file.analysis?.exports
          .filter((item) => item.kind === "function" || item.kind === "class")
          .map((item) => item.name) ?? []),
      ]);

      for (const fnName of exportedFunctionNames) {
        tooltips[makeSymbolNodeId(file.id, "exported_fn", fnName)] = {
          title: fnName,
          description: `Exported function from ${file.path}`,
        };
      }
    }

    if (options.showTypes) {
      const uniqueTypes = uniqueNames([
        ...(file.analysis?.types.map((item) => item.name) ?? []),
        ...(file.analysis?.exports
          .filter((item) => item.kind === "type")
          .map((item) => item.name) ?? []),
      ]);

      for (const typeName of uniqueTypes) {
        tooltips[makeSymbolNodeId(file.id, "type", typeName)] = {
          title: typeName,
          description: `Type from ${file.path}`,
        };
      }
    }
  }

  if (options.showNpmImports) {
    const packages = new Set<string>();
    for (const file of files) {
      for (const pkg of file.analysis?.npmImports ?? []) {
        packages.add(pkg);
      }
    }

    for (const pkg of packages) {
      const nodeId = `npm_${pkg.replace(/[^a-zA-Z0-9]/g, "_")}`;
      let description = "npm package dependency";

      if (npmMetadata && npmMetadata[pkg]) {
        const meta = npmMetadata[pkg];
        if (!meta._loading && !meta._error && meta.name) {
          description = `**${meta.name}**\n\n${meta.description || ""}\n`;
          const latest = meta.version ?? meta["dist-tags"]?.latest;
          if (latest) description += `\n**Latest:** \`${latest}\``;
          if (meta.author?.name)
            description += `\n**Author:** ${meta.author.name}`;
          if (meta.license) description += `\n**License:** ${meta.license}`;
          if (meta.lastUpdated)
            description += `\n**Last updated:** ${meta.lastUpdated}`;
        } else if (meta._loading) {
          description = "Loading package metadata...";
        }
      }

      tooltips[nodeId] = {
        title: pkg,
        description,
        href: `https://npmgraph.js.org/?q=${pkg}`,
      };
    }
  }

  return tooltips;
}

export function getGraphHierarchy(
  files: FileInfo[],
  options: GraphDisplayOptions,
): Record<string, string[]> {
  const hierarchy: Record<string, string[]> = {};

  const pkgs = new Map<string, FileInfo[]>();
  for (const f of files) {
    if (!pkgs.has(f.pkg)) pkgs.set(f.pkg, []);
    pkgs.get(f.pkg)!.push(f);
  }

  for (const [pkg, pkgFiles] of pkgs) {
    const pkgId = `pkg_${pkg.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    if (!hierarchy[pkgId]) hierarchy[pkgId] = [];

    const subDirs = new Map<string, FileInfo[]>();
    for (const f of pkgFiles) {
      const relPath =
        pkg === "root"
          ? f.name
          : f.path.startsWith(`${pkg}/`)
            ? f.path.slice(pkg.length + 1)
            : f.name;
      const parts = relPath.split("/");
      if (parts.length > 1) {
        const subDir = parts[0];
        if (!subDirs.has(subDir)) subDirs.set(subDir, []);
        subDirs.get(subDir)!.push(f);
      } else {
        hierarchy[pkgId].push(f.id);
      }
    }

    for (const [subDir, subFiles] of subDirs) {
      const subId = `${pkgId}_${subDir.replace(/[^a-zA-Z0-9_]/g, "_")}`;
      hierarchy[pkgId].push(subId);
      if (!hierarchy[subId]) hierarchy[subId] = [];
      for (const f of subFiles) {
        hierarchy[subId].push(f.id);
      }
    }
  }

  // Symbol nodes
  if (
    options.showPrivateFunctions ||
    options.showExportedFunctions ||
    options.showTypes
  ) {
    for (const f of files) {
      if (!f.analysis) continue;
      if (!hierarchy[f.id]) hierarchy[f.id] = [];
      if (options.showPrivateFunctions) {
        for (const fnName of uniqueNames(
          f.analysis.functions.map((i) => i.name),
        )) {
          hierarchy[f.id].push(makeSymbolNodeId(f.id, "private_fn", fnName));
        }
      }
      if (options.showExportedFunctions) {
        for (const fnName of uniqueNames(
          f.analysis.exports
            .filter((i) => i.kind === "function" || i.kind === "class")
            .map((i) => i.name),
        )) {
          hierarchy[f.id].push(makeSymbolNodeId(f.id, "exported_fn", fnName));
        }
      }
      if (options.showTypes) {
        const typeNames = uniqueNames([
          ...f.analysis.types.map((i) => i.name),
          ...f.analysis.exports
            .filter((i) => i.kind === "type")
            .map((i) => i.name),
        ]);
        for (const typeName of typeNames) {
          hierarchy[f.id].push(makeSymbolNodeId(f.id, "type", typeName));
        }
      }
    }
  }
  return hierarchy;
}
