import { describe, expect, it } from "vitest";
import { parseRemote } from "../src/git.mjs";

describe("parseRemote", () => {
  it("parses https remotes", () => {
    expect(parseRemote("https://github.com/OpenSourceAGI/dev-tools-starter-agent.git")).toEqual({
      owner: "OpenSourceAGI",
      repo: "dev-tools-starter-agent",
    });
  });

  it("parses https remotes without the .git suffix", () => {
    expect(parseRemote("https://github.com/acme/widget")).toEqual({ owner: "acme", repo: "widget" });
  });

  it("parses scp-style ssh remotes", () => {
    expect(parseRemote("git@github.com:acme/widget.git")).toEqual({ owner: "acme", repo: "widget" });
  });

  it("parses ssh:// remotes", () => {
    expect(parseRemote("ssh://git@github.com/acme/widget.git")).toEqual({ owner: "acme", repo: "widget" });
  });

  it("ignores credentials embedded in the URL", () => {
    expect(parseRemote("https://x-access-token:ghp_secret@github.com/acme/widget.git")).toEqual({
      owner: "acme",
      repo: "widget",
    });
  });

  it("takes the last two segments on enterprise hosts with a path prefix", () => {
    expect(parseRemote("https://git.example.com/scm/team/acme/widget.git")).toEqual({
      owner: "acme",
      repo: "widget",
    });
  });

  it("returns null rather than throwing on unusable input", () => {
    for (const input of ["", "   ", null, undefined, 42, "not-a-remote"]) {
      expect(parseRemote(input)).toBeNull();
    }
  });
});
