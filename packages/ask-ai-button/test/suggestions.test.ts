import { describe, expect, it, vi } from "vitest";
import {
  buildSuggestionsPrompt,
  parseSuggestions,
  qwkSearchSuggestions,
} from "../src";

const page = {
  pageUrl: "https://docs.example.com/docs/intro",
  markdownUrl: "https://docs.example.com/docs/intro.mdx",
  title: "Intro",
};

describe("parseSuggestions", () => {
  it("reads lines between <suggestions> tags like QwkSearch", () => {
    const reply = `Sure!\n<suggestions>\n1. How do I *install* it\n- What does it cost?\nWhere is the config.\n</suggestions>`;
    expect(parseSuggestions(reply)).toEqual([
      "How do I install it?",
      "What does it cost?",
      "Where is the config.",
    ]);
  });

  it("decodes escaped tags and keeps at most four", () => {
    const reply = `&lt;suggestions&gt;\na\nb\nc\nd\ne\n&lt;/suggestions&gt;`;
    expect(parseSuggestions(reply)).toEqual(["a?", "b?", "c?", "d?"]);
  });

  it("falls back to list items when there are no tags", () => {
    expect(parseSuggestions("Ideas:\n- One\n2) Two", 5)).toEqual([
      "One?",
      "Two?",
    ]);
  });
});

describe("buildSuggestionsPrompt", () => {
  it("fills the query and article", () => {
    const prompt = buildSuggestionsPrompt({ query: "Q$&", article: "A" });
    expect(prompt).toContain("User query:\nQ$&\nArticle:\nA");
    expect(prompt).toContain("<suggestions>");
  });
});

describe("qwkSearchSuggestions", () => {
  it("posts to the suggest-followups agent and parses the reply", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: "<suggestions>\nWhat is X\nHow does Y work?\n</suggestions>",
        }),
    });
    const load = qwkSearchSuggestions({ baseUrl: "https://qs.test/", fetch });
    const list = await load({ ...page, content: "# Intro" });
    expect(list).toEqual(["What is X?", "How does Y work?"]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://qs.test/agents");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      agent: "suggest-followups",
      provider: "groq",
      query: "Intro",
      article: "# Intro",
    });
  });

  it("uses a structured array when the server returns one", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: ["*Why*", "How?"] }),
    });
    const list = await qwkSearchSuggestions({ fetch })(page);
    expect(list).toEqual(["Why?", "How?"]);
  });

  it("throws on an HTTP error", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(qwkSearchSuggestions({ fetch })(page)).rejects.toThrow(
      /500/,
    );
  });
});
