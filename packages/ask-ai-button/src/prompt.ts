/**
 * @file prompt.ts
 * @description Builds the text sent to a provider, and the URL that carries it.
 */
import type { AIProvider, PageContext, PromptInput } from "./types";

/** Default longest URL handed to a provider. Most chat UIs accept ~8k. */
export const DEFAULT_MAX_URL_LENGTH = 8000;

/** Used when the visitor sends without typing anything. */
export const DEFAULT_QUESTION = "I want to ask questions about it.";

/** Resolve `url` against the current origin (or `base`), leaving absolute URLs alone. */
export function toAbsoluteUrl(url: string, base?: string): string {
  const origin =
    base ?? (typeof window !== "undefined" ? window.location.href : undefined);
  try {
    return origin ? new URL(url, origin).toString() : new URL(url).toString();
  } catch {
    return url;
  }
}

/**
 * Build the prompt for a page.
 *
 * `link` mode points the model at the Markdown URL (falling back to the page
 * URL); `content` mode pastes the Markdown in. The visitor's message always
 * comes last so it reads as the actual question.
 */
export function buildPrompt(input: PromptInput): string {
  const { pageUrl, markdownUrl, title, message, content, mode } = input;
  const question = message?.trim() || DEFAULT_QUESTION;
  const label = title ? `"${title}"` : "this page";

  if (mode === "content" && content) {
    return [
      `Here is the documentation page ${label} from ${pageUrl}:`,
      "",
      "<page>",
      content.trim(),
      "</page>",
      "",
      question,
    ].join("\n");
  }

  return `Read ${markdownUrl ?? pageUrl}, ${question}`;
}

/** The result of resolving where a provider should be sent. */
export interface ProviderTarget {
  /** URL to open, or `undefined` for `onSelect` providers. */
  href?: string;
  /** True when the prompt was too long for a URL and the link prompt was used. */
  shortened: boolean;
}

/**
 * Work out the URL to open for `provider`. When the full prompt does not fit
 * the provider's URL limit, the shorter `fallbackPrompt` is used instead and
 * `shortened` is set, so the caller can put the full prompt on the clipboard.
 */
export function resolveProviderTarget(
  provider: AIProvider,
  prompt: string,
  fallbackPrompt: string,
  page: PageContext,
  maxUrlLength = DEFAULT_MAX_URL_LENGTH,
): ProviderTarget {
  if (!provider.getHref) return { shortened: false };
  const limit = provider.maxUrlLength ?? maxUrlLength;
  const href = provider.getHref(prompt, page);
  if (href.length <= limit || prompt === fallbackPrompt) {
    return { href, shortened: false };
  }
  return { href: provider.getHref(fallbackPrompt, page), shortened: true };
}

/** Favicon URL for a provider's destination, used when it has no icon. */
export function faviconFor(href: string): string | undefined {
  try {
    const { origin } = new URL(href);
    return `https://s2.googleusercontent.com/s2/favicons?domain_url=${encodeURIComponent(origin)}`;
  } catch {
    return undefined;
  }
}
