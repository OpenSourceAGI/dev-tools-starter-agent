import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import fumadocs from "fumadocs-mdx/vite";
import { docs } from "./source.config";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fumadocsPlugin = await fumadocs({ docs });

// Intercept ?collection= JSON IDs so rolldown never tries to parse them as JS.
// Phase 1 (load, enforce:pre): return raw JSON so fumadocs transform can parse it.
// Phase 2 (transform, default priority): if output is still raw JSON wrap it in
// `export default` — fumadocs uses json:"json" mode which relies on Vite's JSON
// plugin, but that plugin doesn't run for ?query-suffixed IDs in RSC builds.
function fumadocsJsonLoad() {
  return {
    name: "fumadocs-json-load",
    enforce: "pre" as const,
    resolveId(id: string) {
      if (id.match(/\.json\?.*collection=/)) return id;
    },
    load(id: string) {
      if (!id.match(/\.json\?.*collection=/)) return;
      const filePath = id.split("?")[0];
      try {
        return { code: readFileSync(filePath, "utf8"), map: null };
      } catch {
        return { code: "{}", map: null };
      }
    },
  };
}

function fumadocsJsonWrap() {
  return {
    name: "fumadocs-json-wrap",
    transform(code: string, id: string) {
      if (!id.match(/\.json\?.*collection=/)) return;
      const trimmed = code.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return { code: `export default ${JSON.stringify(JSON.parse(trimmed))}`, map: null };
        } catch {
          return null;
        }
      }
    },
  };
}

export default defineConfig({
  // Polyfill CJS globals so Node-only packages (e.g. typescript, ts-morph) bundled into
  // Cloudflare Workers don't crash with "ReferenceError: __filename is not defined".
  define: {
    __filename: JSON.stringify("/"),
    __dirname: JSON.stringify("/"),
  },
  resolve: {
    alias: {
      "fumadocs-mdx:collections/server": path.resolve(__dirname, ".source/server.ts"),
    },
  },
  plugins: [
    fumadocsJsonLoad(),
    fumadocsPlugin,
    fumadocsJsonWrap(),
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
