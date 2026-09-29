import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The dashboard served by `about-system web`. Built after the library build
// (which empties dist/) into dist/web, where src/web-server.ts looks for it.
export default defineConfig({
  root: __dirname,
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    outDir: resolve(__dirname, "../dist/web"),
    emptyOutDir: true,
  },
  server: {
    // `bun run dev:web` with `about-system web` running on the default port.
    proxy: { "/api": "http://127.0.0.1:3777" },
  },
});
