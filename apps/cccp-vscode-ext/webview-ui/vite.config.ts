import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** The Next.js app next door, whose components this panel renders as-is. */
const cccpRoot = fileURLToPath(new URL("../../Cloud-Computer-Control-Panel", import.meta.url));

/** A file inside this package, used as the anchor for resolving bare imports. */
const selfAnchor = fileURLToPath(new URL("./src/main.tsx", import.meta.url));

/**
 * The reused CCCP components live outside this package, so Node resolution
 * would look for `react`, `lucide-react` and the Radix packages in the Next.js
 * app's own `node_modules` -- which need not be installed to build the panel.
 * Bare imports arriving from that directory are resolved against this package
 * instead, which also guarantees a single copy of React in the bundle.
 */
function resolveCccpImportsHere(): Plugin {
  return {
    name: "cccp-bare-imports",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer?.startsWith(cccpRoot)) return null;
      if (/^[./]/.test(source) || source.startsWith("@/") || source.includes("\0")) return null;

      const resolved = await this.resolve(source, selfAnchor, { ...options, skipSelf: true });
      return resolved?.id ?? null;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), resolveCccpImportsHere()],
  resolve: {
    alias: [
      // Lets the CCCP components resolve their own `@/...` imports from here,
      // so the dashboard UI is reused rather than re-implemented.
      { find: /^@\/(.*)$/, replacement: `${cccpRoot}/$1` },
    ],
  },
  // A handful of CCCP modules read `process.env.NEXT_PUBLIC_*` for their
  // defaults. There is no bundler-injected `process` in a webview, so the values
  // are inlined and `src/processShim.ts` covers the bare `process` reference.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    // The extension host references dist/main.js and dist/main.css by name, and
    // the CSP admits exactly one nonce'd script, so everything ships as one file.
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 2_000,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        inlineDynamicImports: true,
        entryFileNames: "main.js",
        assetFileNames: "main.[ext]",
      },
    },
  },
});
