import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

/**
 * Serve `POST /api/storage` from the dev server, so `bun run dev` runs the whole
 * demo — the page and its storage server — the way Vercel runs `api/storage.ts`.
 */
function storageApi(): Plugin {
  return {
    name: "demo:storage-api",
    configureServer(server) {
      server.middlewares.use("/api/storage", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }

        let raw = "";
        for await (const chunk of req) raw += chunk;

        // Loaded through Vite so edits to the package source apply without a restart.
        const { handleStorageRequest } = await server.ssrLoadModule(
          resolve(__dirname, "demo/server/storage-api.ts"),
        );

        let result: { status: number; body: unknown };
        try {
          result = await handleStorageRequest(JSON.parse(raw));
        } catch {
          result = { status: 400, body: { error: "Body must be JSON" } };
        }

        res.statusCode = result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

// Builds the demo page as a static site (used by `bun run build:demo` and Vercel,
// which serves `api/storage.ts` beside it).
export default defineConfig({
  plugins: [storageApi(), react(), tailwindcss()],
  root: resolve(__dirname, "demo"),
  resolve: {
    alias: { "@": resolve(__dirname, "demo/src") },
  },
  build: {
    outDir: resolve(__dirname, "dist-demo"),
    emptyOutDir: true,
  },
});
