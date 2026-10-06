/**
 * @file index.ts
 * @description Public entry point for ask-ai-button.
 */
export { AskAIButton, CopyPageButton } from "./AskAIButton";
export type { AskAIButtonProps, CopyPageButtonProps } from "./AskAIButton";
export { AskAIPanel } from "./AskAIPanel";
export type { AskAIPanelProps } from "./AskAIPanel";
export { AI_PROVIDERS, resolveProviders } from "./providers";
export type { AIProviderID, ProviderOption } from "./providers";
export {
  buildPrompt,
  resolveProviderTarget,
  toAbsoluteUrl,
  DEFAULT_MAX_URL_LENGTH,
  DEFAULT_QUESTION,
} from "./prompt";
export type { ProviderTarget } from "./prompt";
export {
  copyText,
  copyPendingText,
  fetchMarkdown,
  clearMarkdownCache,
} from "./clipboard";
export { askAIButtonCss, useAskAIStyles, STYLE_ELEMENT_ID } from "./styles";
export * from "./icons";
export type { AIProvider, PageContext, PromptInput, PromptMode } from "./types";
