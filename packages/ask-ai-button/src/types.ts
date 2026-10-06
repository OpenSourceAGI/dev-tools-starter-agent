/**
 * @file types.ts
 * @description Public types for ask-ai-button.
 */
import type { ReactNode } from "react";

/**
 * How the page reaches the model.
 * - `link` — the prompt carries the page's Markdown URL; the model fetches it.
 * - `content` — the page's Markdown is pasted into the prompt itself.
 */
export type PromptMode = "link" | "content";

/** Everything known about the page the visitor is reading. */
export interface PageContext {
  /** Absolute URL of the page being read. */
  pageUrl: string;
  /** Absolute URL of the page's raw Markdown/MDX, when one exists. */
  markdownUrl?: string;
  /** Page title, used to label the page in the prompt. */
  title?: string;
  /** Source file on GitHub, shown as an extra link when set. */
  githubUrl?: string;
}

/** The inputs a prompt is built from. */
export interface PromptInput extends PageContext {
  /** What the visitor typed. Empty means "I want to ask questions about it." */
  message?: string;
  /** The page's Markdown — only used in `content` mode. */
  content?: string;
  mode: PromptMode;
}

/**
 * A destination for the prompt. Give it `getHref` to open a chat URL in a new
 * tab, or `onSelect` to hand the prompt to your own code (an API route, an
 * in-page chat, an extension) instead.
 */
export interface AIProvider {
  id: string;
  title: string;
  /** Icon shown beside the title. Falls back to the destination's favicon. */
  icon?: ReactNode;
  /** Build the URL that opens this provider with `prompt` pre-filled. */
  getHref?: (prompt: string, page: PageContext) => string;
  /** Called instead of opening a URL — for APIs and custom handlers. */
  onSelect?: (prompt: string, page: PageContext) => void | Promise<void>;
  /**
   * Longest URL this provider reliably accepts. When a `content` prompt would
   * exceed it, the URL falls back to the `link` prompt and the full prompt is
   * copied to the clipboard instead. Defaults to the component's `maxUrlLength`.
   */
  maxUrlLength?: number;
}
