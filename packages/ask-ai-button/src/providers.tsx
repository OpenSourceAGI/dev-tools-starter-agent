/**
 * @file providers.tsx
 * @description The built-in chat providers and how each takes a pre-filled prompt.
 */
import {
  BraveIcon,
  ChatGPTIcon,
  ClaudeIcon,
  CursorIcon,
  GeminiIcon,
  PerplexityIcon,
  QwkSearchIcon,
} from "./icons";
import type { AIProvider } from "./types";

const q = (prompt: string) => encodeURIComponent(prompt);

/** Every provider that ships with the package, in display order. */
export const AI_PROVIDERS = [
  {
    id: "claude",
    title: "Claude",
    icon: <ClaudeIcon />,
    getHref: (p) => `https://claude.ai/new?q=${q(p)}`,
  },
  {
    id: "chatgpt",
    title: "ChatGPT",
    icon: <ChatGPTIcon />,
    getHref: (p) => `https://chatgpt.com/?hints=search&q=${q(p)}`,
  },
  {
    id: "gemini",
    title: "Gemini",
    icon: <GeminiIcon />,
    getHref: (p) =>
      `https://aistudio.google.com/prompts/new_chat?prompt=${q(p)}`,
  },
  {
    id: "perplexity",
    title: "Perplexity",
    icon: <PerplexityIcon />,
    getHref: (p) => `https://www.perplexity.ai/search?q=${q(p)}`,
  },
  {
    id: "grok",
    title: "Grok",
    getHref: (p) => `https://grok.com/?q=${q(p)}`,
  },
  {
    id: "copilot",
    title: "Copilot",
    getHref: (p) => `https://copilot.microsoft.com/?q=${q(p)}`,
  },
  {
    id: "mistral",
    title: "Le Chat",
    getHref: (p) => `https://chat.mistral.ai/chat?q=${q(p)}`,
  },
  {
    id: "t3chat",
    title: "T3 Chat",
    getHref: (p) => `https://t3.chat/new?q=${q(p)}`,
  },
  {
    id: "brave",
    title: "Brave",
    icon: <BraveIcon />,
    getHref: (p) => `https://search.brave.com/ask?q=${q(p)}`,
  },
  {
    id: "qwksearch",
    title: "QwkSearch",
    icon: <QwkSearchIcon />,
    getHref: (p) => `https://qwksearch.com/?q=${q(p)}`,
  },
  {
    id: "cursor",
    title: "Cursor",
    icon: <CursorIcon />,
    getHref: (p) => `https://cursor.com/link/prompt?text=${q(p)}`,
  },
] as const satisfies readonly AIProvider[];

/** IDs of the built-in providers. */
export type AIProviderID = (typeof AI_PROVIDERS)[number]["id"];

/** A built-in provider by ID, or a custom provider object. */
export type ProviderOption = AIProviderID | AIProvider;

/**
 * Turn a mixed list of IDs and provider objects into providers, dropping
 * unknown IDs. With no list, every built-in provider is returned.
 */
export function resolveProviders(options?: ProviderOption[]): AIProvider[] {
  if (!options) return [...AI_PROVIDERS];
  return options
    .map((option) =>
      typeof option === "string"
        ? AI_PROVIDERS.find((provider) => provider.id === option)
        : option,
    )
    .filter((provider): provider is AIProvider => Boolean(provider));
}
