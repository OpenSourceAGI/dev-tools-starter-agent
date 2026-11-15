/**
 * @file suggestions.ts
 * @description Suggested questions for the panel, generated the same way as
 * QwkSearch's follow-up questions: its `suggest-followups` agent prompt, and
 * the same clean-up of the reply (up to four lines, a trailing `?`, no `*`).
 */
import type { PageContext } from "./types";

/** Default number of suggested questions, matching QwkSearch. */
export const DEFAULT_MAX_SUGGESTIONS = 4;

/** Default QwkSearch API used by {@link qwkSearchSuggestions}. */
export const QWKSEARCH_API_URL = "https://api.qwksearch.com";

/** What a suggestions loader receives: the page, plus its text when it loaded. */
export interface SuggestionContext extends PageContext {
  /** The page's Markdown or visible text. Missing if it couldn't be loaded. */
  content?: string;
}

/** Static questions, or a function that produces them for the page. */
export type SuggestedQuestions =
  | string[]
  | ((context: SuggestionContext) => string[] | Promise<string[]>);

/**
 * QwkSearch's `suggest-followups` agent prompt, word for word. `{query}` and
 * `{article}` are filled by {@link buildSuggestionsPrompt}.
 */
export const SUGGEST_FOLLOWUPS_PROMPT = `You are a suggestion generator for an AI powered search engine. You will be given a
conversation below. You need to generate 4-5 suggestions based on the conversation. The
suggestion should be relevant to the conversation that can be used by the user to ask
the chat model for more information.
You need to make sure the suggestions are relevant to the conversation and are helpful
to the user. Keep a note that the user might use these suggestions to ask a chat model
for more information.
Make sure the suggestions are medium in length and are informative and relevant to the
conversation.

Provide these suggestions separated by newlines between the XML tags <suggestions> and
</suggestions>. For example:

<suggestions>
Tell me more about SpaceX and their recent projects
What is the latest news on SpaceX?
Who is the CEO of SpaceX?
</suggestions>

User query:
{query}
Article:
{article}`;

/**
 * Fill the follow-up prompt for your own model. Use it with
 * {@link parseSuggestions} when you call an LLM yourself instead of QwkSearch.
 */
export function buildSuggestionsPrompt({
  query = "",
  article = "",
}: {
  query?: string;
  article?: string;
}): string {
  return SUGGEST_FOLLOWUPS_PROMPT.replace("{query}", () => query).replace(
    "{article}",
    () => article,
  );
}

/**
 * Turn a model reply into questions, the way QwkSearch does: take the lines
 * between `<suggestions>` tags (or list-item lines when there are no tags),
 * strip list markers and `*`, end each with `?` unless it already has one or a
 * period, and keep the first `max`.
 */
export function parseSuggestions(
  reply: string,
  max = DEFAULT_MAX_SUGGESTIONS,
): string[] {
  if (!reply) return [];
  const text = reply.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const blocks = [...text.matchAll(/<suggestions>([\s\S]*?)<\/suggestions>/g)];
  const lines = blocks.length
    ? blocks.flatMap((match) => match[1].split("\n"))
    : text.split("\n").filter((line: string) => /^\s*(\d+[.)]|[-*•])\s+/.test(line));
  return cleanSuggestions(lines, max);
}

function cleanSuggestions(lines: string[], max: number): string[] {
  return lines
    .map((line) =>
      line
        .replace(/^\s*(\d+[.)]|[-*•])\s*/, "")
        .replace(/\*/g, "")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, max)
    .map((q) => (q.includes("?") || q.endsWith(".") ? q : `${q}?`));
}

export interface QwkSearchSuggestionsOptions {
  /** QwkSearch API base URL — your own deployment, or the public one. */
  baseUrl?: string;
  /** Language provider QwkSearch should call. Default `groq`. */
  provider?: string;
  /** Model name for that provider; blank uses QwkSearch's default. */
  model?: string;
  /** Your API key for `provider`, if the QwkSearch server has none. */
  key?: string;
  /** Question the suggestions follow on from. Defaults to the page title. */
  query?: string;
  /** How many questions to keep. Default 4. */
  max?: number;
  /** Longest page text sent, in characters. Default 12000. */
  maxArticleLength?: number;
  /** Custom `fetch`, e.g. for tests or a proxy. */
  fetch?: typeof fetch;
}

/**
 * A `suggestedQuestions` loader that asks a QwkSearch server's
 * `suggest-followups` agent for questions about the page — the same follow-ups
 * QwkSearch shows under its answers.
 *
 * ```tsx
 * <AskAIButton suggestedQuestions={qwkSearchSuggestions()} />
 * ```
 */
export function qwkSearchSuggestions(
  options: QwkSearchSuggestionsOptions = {},
): (context: SuggestionContext) => Promise<string[]> {
  const {
    baseUrl = QWKSEARCH_API_URL,
    provider = "groq",
    model,
    key,
    query,
    max = DEFAULT_MAX_SUGGESTIONS,
    maxArticleLength = 12000,
  } = options;
  return async (context) => {
    const doFetch = options.fetch ?? fetch;
    const article = (context.content ?? "").slice(0, maxArticleLength);
    const body: Record<string, unknown> = {
      agent: "suggest-followups",
      provider,
      html: false,
      query: query ?? context.title ?? context.pageUrl,
      article: article || context.markdownUrl || context.pageUrl,
    };
    if (model) body.model = model;
    if (key) body.key = key;
    const response = await doFetch(`${baseUrl.replace(/\/+$/, "")}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`QwkSearch suggestions failed: ${response.status}`);
    }
    const data = (await response.json()) as {
      content?: unknown;
      extract?: unknown;
      extact?: unknown;
    };
    const structured = data.extract ?? data.extact ?? data.content;
    if (Array.isArray(structured)) {
      return cleanSuggestions(structured.map(String), max);
    }
    return typeof data.content === "string"
      ? parseSuggestions(data.content, max)
      : [];
  };
}
