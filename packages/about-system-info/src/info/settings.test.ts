import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

const osMock = vi.hoisted(() => ({
  homedir: vi.fn(() => "/home/ada"),
  tmpdir: vi.fn(() => "/tmpdir"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const s = await import("./settings");

beforeEach(() => {
  for (const f of Object.values(fsMock)) f.mockReset();
});

describe("paths", () => {
  it("places settings under ~/.config and the cache under the temp dir", () => {
    expect(s.SETTINGS_FILE).toBe("/home/ada/.config/systeminfo-settings.json");
    expect(s.CACHE_FILE).toBe("/tmpdir/systeminfo-cache.json");
  });
});

describe("defaults", () => {
  it("defines a color, emoji and label for every displayed item", () => {
    const shown = s.DEFAULT_SETTINGS.display_order.flat();
    for (const key of shown) {
      if (key === "pacman" || key === "bench" || key === "gpu_bench") continue;
      expect(s.DEFAULT_SETTINGS.labels).toHaveProperty(key);
    }
    for (const color of Object.values(s.DEFAULT_SETTINGS.colors)) {
      if (color === "multicolor") continue;
      expect(s.colors).toHaveProperty(color);
      expect(s.backgrounds).toHaveProperty(color);
    }
  });

  it("uses ANSI escapes for every palette entry", () => {
    for (const v of [...Object.values(s.colors), ...Object.values(s.backgrounds)]) {
      expect(v.startsWith("\x1b[")).toBe(true);
    }
  });

  it("falls back to 100 columns when stdout has no width", () => {
    expect(s.DEFAULT_SETTINGS.display.line_wrap_length).toBeGreaterThan(0);
  });
});

describe("loadSettings", () => {
  it("returns the defaults when no settings file exists", () => {
    fsMock.existsSync.mockReturnValue(false);
    expect(s.loadSettings()).toBe(s.DEFAULT_SETTINGS);
  });

  it("shallow-merges the user's file over the defaults", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(JSON.stringify({ labels: { user: "Me" } }));
    const loaded = s.loadSettings();
    expect(loaded.labels).toEqual({ user: "Me" });
    expect(loaded.colors).toBe(s.DEFAULT_SETTINGS.colors);
    expect(fsMock.readFileSync).toHaveBeenCalledWith(s.SETTINGS_FILE, "utf8");
  });

  it("falls back to the defaults on malformed JSON or a read error", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue("{not json");
    expect(s.loadSettings()).toBe(s.DEFAULT_SETTINGS);
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error("EACCES");
    });
    expect(s.loadSettings()).toBe(s.DEFAULT_SETTINGS);
  });
});

describe("saveSettings", () => {
  it("creates the config dir when missing and writes pretty JSON", () => {
    fsMock.existsSync.mockReturnValue(false);
    expect(s.saveSettings(s.DEFAULT_SETTINGS)).toBe(true);
    expect(fsMock.mkdirSync).toHaveBeenCalledWith("/home/ada/.config", { recursive: true });
    const [file, body] = fsMock.writeFileSync.mock.calls[0];
    expect(file).toBe(s.SETTINGS_FILE);
    expect(JSON.parse(body)).toEqual(JSON.parse(JSON.stringify(s.DEFAULT_SETTINGS)));
    expect(body).toContain('\n  "display_order"');
  });

  it("skips mkdir when the dir exists", () => {
    fsMock.existsSync.mockReturnValue(true);
    expect(s.saveSettings(s.DEFAULT_SETTINGS)).toBe(true);
    expect(fsMock.mkdirSync).not.toHaveBeenCalled();
  });

  it("reports failure instead of throwing", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.writeFileSync.mockImplementation(() => {
      throw new Error("EROFS");
    });
    expect(s.saveSettings(s.DEFAULT_SETTINGS)).toBe(false);
  });
});
