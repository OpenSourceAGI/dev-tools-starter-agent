import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  buildPrompt,
  DEFAULT_QUESTION,
  resolveProviderTarget,
  resolveProviders,
  toAbsoluteUrl,
  type AIProvider,
} from "../src";

const page = {
  pageUrl: "https://docs.example.com/docs/intro",
  markdownUrl: "https://docs.example.com/docs/intro.mdx",
  title: "Intro",
};

describe("buildPrompt", () => {
  it("points at the markdown URL in link mode", () => {
    expect(
      buildPrompt({ ...page, mode: "link", message: "How do I install?" }),
    ).toBe("Read https://docs.example.com/docs/intro.mdx, How do I install?");
  });

  it("falls back to the page URL and the default question", () => {
    expect(
      buildPrompt({ pageUrl: page.pageUrl, mode: "link", message: "  " }),
    ).toBe(`Read ${page.pageUrl}, ${DEFAULT_QUESTION}`);
  });

  it("pastes the page in content mode with the question last", () => {
    const prompt = buildPrompt({
      ...page,
      mode: "content",
      content: "# Intro\nHello",
      message: "Summarize",
    });
    expect(prompt).toContain(
      '"Intro" from https://docs.example.com/docs/intro',
    );
    expect(prompt).toContain("<page>\n# Intro\nHello\n</page>");
    expect(prompt.endsWith("Summarize")).toBe(true);
  });

  it("uses link wording when content mode has no content", () => {
    expect(buildPrompt({ ...page, mode: "content" })).toMatch(/^Read /);
  });
});

describe("providers", () => {
  it("returns every built-in by default", () => {
    expect(resolveProviders()).toHaveLength(AI_PROVIDERS.length);
  });

  it("mixes IDs and custom providers and drops unknown IDs", () => {
    const custom: AIProvider = {
      id: "api",
      title: "My API",
      onSelect: () => {},
    };
    const resolved = resolveProviders(["claude", custom, "nope" as never]);
    expect(resolved.map((p) => p.id)).toEqual(["claude", "api"]);
  });

  it("encodes the prompt into every built-in URL", () => {
    for (const provider of AI_PROVIDERS) {
      const href = provider.getHref("a b&c", page);
      expect(href).toMatch(/^https:\/\//);
      expect(href).toContain("a%20b%26c");
    }
  });
});

describe("resolveProviderTarget", () => {
  const claude = AI_PROVIDERS.find((p) => p.id === "claude")!;

  it("uses the full prompt when it fits", () => {
    const target = resolveProviderTarget(claude, "full", "link", page);
    expect(target).toEqual({
      href: "https://claude.ai/new?q=full",
      shortened: false,
    });
  });

  it("falls back to the link prompt when the URL is too long", () => {
    const target = resolveProviderTarget(
      claude,
      "x".repeat(100),
      "link",
      page,
      50,
    );
    expect(target).toEqual({
      href: "https://claude.ai/new?q=link",
      shortened: true,
    });
  });

  it("honours a per-provider limit", () => {
    const tiny = { ...claude, maxUrlLength: 10 };
    expect(
      resolveProviderTarget(tiny, "long prompt", "l", page).shortened,
    ).toBe(true);
  });

  it("returns no href for onSelect providers", () => {
    expect(
      resolveProviderTarget(
        { id: "x", title: "X", onSelect: () => {} },
        "p",
        "l",
        page,
      ),
    ).toEqual({
      shortened: false,
    });
  });
});

describe("toAbsoluteUrl", () => {
  it("resolves relative URLs against a base", () => {
    expect(toAbsoluteUrl("/docs/a.mdx", "https://x.dev/docs/b")).toBe(
      "https://x.dev/docs/a.mdx",
    );
  });
  it("keeps absolute URLs", () => {
    expect(toAbsoluteUrl("https://y.dev/a", "https://x.dev")).toBe(
      "https://y.dev/a",
    );
  });
});
