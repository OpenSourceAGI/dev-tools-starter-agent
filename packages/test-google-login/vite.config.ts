import { resolve } from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Two entries, not one. `index` is the Node/Playwright half and runs in a test
// process; `worker` is the Cloudflare half and runs in a Worker isolate. Bundling
// them together would drag `node:fs` into the Worker build, which does not start.
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        worker: resolve(__dirname, "src/worker.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      // Everything the package expects its host to supply: node builtins for the
      // Playwright half, `@cloudflare/puppeteer` for the Worker half. Both are
      // peer dependencies, so neither may be inlined.
      external: [/^node:/, "@cloudflare/puppeteer"],
    },
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
  },
  plugins: [
    dts({
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      outDir: "dist",
    }),
  ],
});
