/**
 * @fileoverview `about-system web` — serves the React dashboard and a JSON API.
 *
 * The dashboard is prebuilt into dist/web by `vite build --config web/vite.config.ts`
 * and served as static files; the only dynamic route is GET /api/info, which
 * returns the same object as `about-system --json`.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSystemInfo } from "./system-info-api";

export interface WebServerOptions {
  port?: number;
  host?: string;
  /** Directory holding the built dashboard. Defaults to dist/web next to this file. */
  webRoot?: string;
}

export const DEFAULT_WEB_PORT = 3777;
export const DEFAULT_WEB_HOST = "127.0.0.1";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function defaultWebRoot(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "web");
}

/**
 * Resolves a request path to a file inside webRoot, or null if it escapes the
 * root or does not exist. Unknown paths fall back to index.html (SPA routing).
 */
export function resolveStaticFile(webRoot: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const root = path.resolve(webRoot);
  const candidate = path.resolve(root, "." + path.posix.normalize("/" + decoded));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  const index = path.join(root, "index.html");
  return fs.existsSync(index) ? index : null;
}

function send(res: http.ServerResponse, status: number, type: string, body: string | Buffer): void {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

export function createWebServer(options: WebServerOptions = {}): http.Server {
  const webRoot = options.webRoot ?? defaultWebRoot();

  return http.createServer(async (req, res) => {
    const url = req.url ?? "/";

    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "text/plain; charset=utf-8", "Method Not Allowed");
      return;
    }

    if (url === "/api/info" || url.startsWith("/api/info?")) {
      try {
        const info = await getSystemInfo();
        send(res, 200, MIME_TYPES[".json"], JSON.stringify(info));
      } catch (error) {
        send(res, 500, MIME_TYPES[".json"], JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    const file = resolveStaticFile(webRoot, url);
    if (!file) {
      send(
        res,
        404,
        "text/plain; charset=utf-8",
        "Dashboard not found. Build it with: npm run build:web"
      );
      return;
    }
    const type = MIME_TYPES[path.extname(file)] ?? "application/octet-stream";
    send(res, 200, type, fs.readFileSync(file));
  });
}

/** Starts the dashboard server and resolves with the URL it is listening on. */
export function startWebServer(options: WebServerOptions = {}): Promise<{ server: http.Server; url: string }> {
  const port = options.port ?? DEFAULT_WEB_PORT;
  const host = options.host ?? DEFAULT_WEB_HOST;
  const server = createWebServer(options);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      const shownHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
      resolve({ server, url: `http://${shownHost}:${actualPort}` });
    });
  });
}
