import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import type http from "http";

vi.mock("./system-info-api", () => ({
  getSystemInfo: vi.fn(async () => ({ user: "tester", hostname: "box", ram_used: "8/16GB" })),
}));

import { resolveStaticFile, startWebServer } from "./web-server";

let webRoot: string;
let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  webRoot = fs.mkdtempSync(path.join(os.tmpdir(), "about-system-web-"));
  fs.mkdirSync(path.join(webRoot, "assets"));
  fs.writeFileSync(path.join(webRoot, "index.html"), "<!doctype html><div id=root></div>");
  fs.writeFileSync(path.join(webRoot, "assets", "app.js"), "console.log(1)");

  ({ server, url: baseUrl } = await startWebServer({ port: 0, webRoot }));
});

afterAll(() => {
  server?.close();
  fs.rmSync(webRoot, { recursive: true, force: true });
});

describe("resolveStaticFile", () => {
  it("serves files inside the web root", () => {
    expect(resolveStaticFile(webRoot, "/assets/app.js")).toBe(path.join(webRoot, "assets", "app.js"));
  });

  it("falls back to index.html for unknown routes", () => {
    expect(resolveStaticFile(webRoot, "/some/route")).toBe(path.join(webRoot, "index.html"));
  });

  it("never escapes the web root", () => {
    for (const attempt of ["/../../etc/passwd", "/%2e%2e/%2e%2e/etc/passwd", "/..%2f..%2fetc/passwd"]) {
      const file = resolveStaticFile(webRoot, attempt);
      expect(file === null || file.startsWith(webRoot)).toBe(true);
    }
  });
});

describe("web server", () => {
  it("returns system info as JSON from /api/info", async () => {
    const res = await fetch(`${baseUrl}/api/info`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ user: "tester", hostname: "box", ram_used: "8/16GB" });
  });

  it("serves the dashboard with the right content types", async () => {
    const index = await fetch(`${baseUrl}/`);
    expect(index.headers.get("content-type")).toContain("text/html");
    expect(await index.text()).toContain('id=root');

    const js = await fetch(`${baseUrl}/assets/app.js`);
    expect(js.headers.get("content-type")).toContain("text/javascript");
  });

  it("rejects non-GET methods", async () => {
    const res = await fetch(`${baseUrl}/api/info`, { method: "POST" });
    expect(res.status).toBe(405);
  });
});
