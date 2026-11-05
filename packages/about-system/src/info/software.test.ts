import { beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ windows: false }));
vi.mock("../utils/platform", () => ({
  get IS_WINDOWS() {
    return flags.windows;
  },
  IS_LINUX: true,
  IS_MAC: false,
}));

const execCommand = vi.hoisted(() => vi.fn());
const commandExists = vi.hoisted(() => vi.fn());
vi.mock("../utils/command", () => ({ execCommand, commandExists }));

const osMock = vi.hoisted(() => ({
  userInfo: vi.fn(() => ({ shell: "/bin/zsh" })),
  tmpdir: vi.fn(() => "/tmp"),
  platform: vi.fn(() => "linux"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));
vi.mock("process", () => ({ default: { ppid: 4242 } }));

const s = await import("./software");
import type { InfoContext } from "../types/internal-types";

const ctx = (): InfoContext => ({ cache: {} });

beforeEach(() => {
  flags.windows = false;
  execCommand.mockReset().mockReturnValue("");
  commandExists.mockReset().mockReturnValue(false);
  osMock.userInfo.mockReset().mockReturnValue({ shell: "/bin/zsh" });
});

describe("shell", () => {
  it("returns the login shell's basename", () => {
    expect(s.shell(ctx())).toBe("zsh");
  });

  it("falls back to the parent process name when there is no login shell", () => {
    osMock.userInfo.mockReturnValue({ shell: "" });
    execCommand.mockReturnValue("/usr/bin/fish");
    expect(s.shell(ctx())).toBe("fish");
    expect(execCommand).toHaveBeenCalledWith("ps -p 4242 -o comm=");
  });

  it("falls back to ps when userInfo throws", () => {
    osMock.userInfo.mockImplementation(() => {
      throw new Error("x");
    });
    execCommand.mockReturnValue("bash");
    expect(s.shell(ctx())).toBe("bash");
  });

  it("is empty when nothing identifies the shell", () => {
    osMock.userInfo.mockReturnValue({ shell: "" });
    execCommand.mockReturnValue("");
    expect(s.shell(ctx())).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(s.shell(ctx())).toBe("");
  });

  it("is empty on Windows and serves from cache", () => {
    flags.windows = true;
    const c = ctx();
    expect(s.shell(c)).toBe("");
    flags.windows = false;
    expect(s.shell(c)).toBe("");
  });
});

describe("packages", () => {
  it("lists the package managers/tools that exist", () => {
    commandExists.mockImplementation((c: string) => ["apt", "npm", "bun"].includes(c));
    const c = ctx();
    expect(s.packages(c)).toBe("apt npm bun");
    commandExists.mockReturnValue(false);
    expect(s.packages(c)).toBe("apt npm bun");
  });

  it("is empty when nothing is installed", () => {
    expect(s.packages(ctx())).toBe("");
  });
});

describe("common_versions", () => {
  const outputs: Record<string, string> = {
    "node --version": "v22.1.0",
    "git --version": "git version 2.44.0",
    "docker --version": "Docker version 26.1.0, build abc",
    "python3 --version": "Python 3.12.3",
    "go version": "go version go1.22.0 linux/amd64",
    "rustc --version": "rustc 1.77.0 (abc 2024-03-17)",
  };

  it("cleans each tool's version output", () => {
    commandExists.mockReturnValue(true);
    execCommand.mockImplementation((c: string) => outputs[c]);
    expect(s.common_versions(ctx())).toBe(
      "node:22.1.0 git:2.44.0 docker:26.1.0 python3:3.12.3 go:1.22.0 rustc:1.77.0",
    );
  });

  it("skips missing tools, empty versions and failing commands", () => {
    commandExists.mockImplementation((c: string) => ["node", "git", "go"].includes(c));
    execCommand.mockImplementation((c: string) => {
      if (c.startsWith("git")) return "";
      if (c.startsWith("go")) throw new Error("x");
      return outputs[c];
    });
    const c = ctx();
    expect(s.common_versions(c)).toBe("node:22.1.0");
    execCommand.mockReturnValue("v1");
    expect(s.common_versions(c)).toBe("node:22.1.0");
  });
});

describe("containers", () => {
  it("is empty without docker", () => {
    expect(s.containers(ctx())).toBe("");
  });

  it("is empty when no containers are running", () => {
    commandExists.mockReturnValue(true);
    execCommand.mockReturnValue("");
    expect(s.containers(ctx())).toBe("");
  });

  it("lists names with their de-duplicated published ports", () => {
    commandExists.mockReturnValue(true);
    execCommand.mockImplementation((c: string) =>
      c === "docker ps -q"
        ? "abc\ndef\nghi"
        : [
            "web\t0.0.0.0:8080->80/tcp, :::8080->80/tcp, 0.0.0.0:9000-9002->9000-9002/tcp",
            "db\t5432/tcp",
            "bare",
            "\t0.0.0.0:1->1/tcp",
          ].join("\n"),
    );
    const c = ctx();
    expect(s.containers(c)).toBe("web 80 9000-9002 db bare");
    execCommand.mockReturnValue("");
    expect(s.containers(c)).toBe("web 80 9000-9002 db bare");
  });

  it("is empty when docker errors", () => {
    commandExists.mockReturnValue(true);
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(s.containers(ctx())).toBe("");
  });
});
