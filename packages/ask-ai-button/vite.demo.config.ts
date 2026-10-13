import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Builds the demo page as a static site (used by `bun run build:demo` and Vercel).
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "demo"),
  base: "./",
  build: {
    outDir: resolve(__dirname, "dist-demo"),
    emptyOutDir: true,
  },
});
