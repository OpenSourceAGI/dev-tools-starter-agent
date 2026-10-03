import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeRemoteRepository } from "../actions";

async function zipOf(files: Record<string, string>, opts: { dirs?: string[] } = {}): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const d of opts.dirs ?? []) zip.folder(d);
  for (const [p, c] of Object.entries(files)) zip.file(p, c);
  return zip.generateAsync({ type: "arraybuffer" });
}

const ok = (body: ArrayBuffer) => new Response(body, { status: 200 });
const fail = (status: number) => new Response("nope", { status });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("analyzeRemoteRepository", () => {
  it("downloads the master archive for a GitHub URL and analyzes parseable files", async () => {
    fetchMock.mockResolvedValueOnce(
      ok(
        await zipOf(
          {
            "repo-master/src/index.ts": "/**\n * Entry module.\n */\nimport { u } from './util';\nexport function run() {}\n",
            "repo-master/src/util.ts": "// helpers\nexport const u = 1;\n",
            "repo-master/README.md": "# hi",
            "repo-master/src/styles.css": "a{}",
            "repo-master/src/empty.ts": "const x = 1;",
            "repo-master/node_modules/dep/index.js": "export const d = 1;",
            "repo-master/.github/workflow.js": "export const w = 1;",
            "repo-master/dist/out.js": "export const o = 1;",
          },
          { dirs: ["repo-master/src/"] },
        ),
      ),
    );

    const res = await analyzeRemoteRepository("https://github.com/acme/repo");

    expect(fetchMock).toHaveBeenCalledWith("https://github.com/acme/repo/archive/refs/heads/master.zip");
    expect(res.success).toBe(true);
    const files = res.files!;
    expect(files.map((f) => f.path).sort()).toEqual(["src/index.ts", "src/util.ts"]);

    const index = files.find((f) => f.path === "src/index.ts")!;
    expect(index).toMatchObject({
      name: "index.ts",
      id: "src_index_ts",
      pkg: "src",
      description: "Entry module.",
    });
    expect(index.analysis!.exports[0].name).toBe("run");
    expect(index.analysis!.localImports).toEqual(["./util"]);
    expect(files.find((f) => f.path === "src/util.ts")!.description).toBe("helpers");
  });

  it("falls back to the main branch when master is missing", async () => {
    fetchMock
      .mockResolvedValueOnce(fail(404))
      .mockResolvedValueOnce(ok(await zipOf({ "r-main/a.ts": "export const a = 1;" })));

    const res = await analyzeRemoteRepository("https://github.com/acme/repo/tree/main");

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "https://github.com/acme/repo/archive/refs/heads/master.zip",
      "https://github.com/acme/repo/archive/refs/heads/main.zip",
    ]);
    expect(res.files!.map((f) => f.path)).toEqual(["a.ts"]);
  });

  it("reports when neither master nor main can be downloaded", async () => {
    fetchMock.mockResolvedValue(fail(404));
    const res = await analyzeRemoteRepository("https://github.com/acme/repo");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Tried master and main branches");
  });

  it("fetches non-GitHub and .zip URLs as given, reporting the status on failure", async () => {
    fetchMock.mockResolvedValueOnce(fail(500));
    const res = await analyzeRemoteRepository("https://example.com/bundle.zip");
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/bundle.zip");
    expect(res).toEqual({
      success: false,
      error: "Failed to download repository from https://example.com/bundle.zip. Status: 500",
    });

    fetchMock.mockResolvedValueOnce(fail(403));
    await analyzeRemoteRepository("https://github.com/acme/repo.zip");
    expect(fetchMock).toHaveBeenLastCalledWith("https://github.com/acme/repo.zip");
  });

  it("keeps paths intact when the archive has no common top-level folder", async () => {
    fetchMock.mockResolvedValueOnce(
      ok(await zipOf({ "a/one.ts": "export const one = 1;", "b/two.ts": "export const two = 1;" })),
    );
    const res = await analyzeRemoteRepository("https://example.com/x.zip");
    expect(res.files!.map((f) => f.path).sort()).toEqual(["a/one.ts", "b/two.ts"]);
    expect(res.files!.map((f) => f.pkg).sort()).toEqual(["a", "b"]);
  });

  it("handles an empty archive", async () => {
    fetchMock.mockResolvedValueOnce(ok(await zipOf({})));
    const res = await analyzeRemoteRepository("https://example.com/empty.zip");
    expect(res).toEqual({ success: true, files: [] });
  });

  it("returns an error for a corrupt archive or a network failure", async () => {
    fetchMock.mockResolvedValueOnce(ok(new TextEncoder().encode("not a zip").buffer as ArrayBuffer));
    const corrupt = await analyzeRemoteRepository("https://example.com/bad.zip");
    expect(corrupt.success).toBe(false);
    expect(typeof corrupt.error).toBe("string");

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await analyzeRemoteRepository("https://example.com/x.zip")).toEqual({ success: false, error: "offline" });

    fetchMock.mockRejectedValueOnce({});
    expect((await analyzeRemoteRepository("https://example.com/y.zip")).error).toBe("Unknown error during analysis");
  });

  it("infers descriptions from @description tags and plain JSDoc", async () => {
    fetchMock.mockResolvedValueOnce(
      ok(
        await zipOf({
          "r/tag.ts": "/**\n * Intro\n * @description From the tag\n *   second line\n * @see x\n */\nexport const a = 1;",
          "r/plain.ts": "/**\n * Line one\n *\n * Line two\n * @param x\n */\nexport const b = 1;",
          "r/directive.ts": '"use client";\n// After directive\nexport const c = 1;',
          "r/none.ts": "export const d = 1;",
        }),
      ),
    );
    const res = await analyzeRemoteRepository("https://example.com/r.zip");
    const by = Object.fromEntries(res.files!.map((f) => [f.name, f.description]));
    expect(by["tag.ts"]).toBe("From the tag\nsecond line");
    expect(by["plain.ts"]).toBe("Line one\n\nLine two");
    expect(by["directive.ts"]).toBe("After directive");
    expect(by["none.ts"]).toBeUndefined();
  });
});
