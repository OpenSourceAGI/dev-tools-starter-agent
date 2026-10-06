---
name: ask-ai-button
description: Guide to ask-ai-button (packages/ask-ai-button) — the "Ask AI about this page" React component for docs sites. Covers AskAIButton as a dropdown or floating action button, the inline AskAIPanel, CopyPageButton, link vs content prompt modes, choosing built-in providers (Claude, ChatGPT, Gemini, Perplexity, Grok, Copilot, Le Chat, T3 Chat, Brave, QwkSearch, Cursor), adding custom URL or API (onSelect) providers, the URL-length fallback, theming with --aai-* variables, and Fumadocs integration. Use when adding an Ask AI / copy-for-LLM button to a docs page or troubleshooting one — prompts not pre-filling, popups blocked, the page text missing, unstyled panels, or CSP errors from the injected stylesheet.
---

# Working With ask-ai-button

React component that sends the current docs page plus the visitor's question to a chat model in a new tab, or copies the prompt. Spun out of the Ask AI dropdown in `starter-templates/template-fumadocs`. Peers: `react`/`react-dom` ≥18. No CSS import — it injects its own stylesheet.

## Setup

```tsx
import { AskAIButton, AskAIPanel, CopyPageButton } from "ask-ai-button";

<CopyPageButton markdownUrl={`${page.url}.mdx`} />
<AskAIButton markdownUrl={`${page.url}.mdx`} title={page.data.title} />   // dropdown
<AskAIButton variant="fab" />                                              // floating, bottom-right
<AskAIPanel markdownUrl="/docs/intro.mdx" inline />                        // in page flow
```

The bundle starts with `"use client"`, so a Next.js server component can render these directly.

## Picking the right props

| You want | Props |
| --- | --- |
| Only some models, in your order | `providers={["claude", "chatgpt"]}` |
| A chat UI that isn't built in | `providers={[..., { id, title, getHref: (prompt, page) => url }]}` |
| Your own API / in-page chat | `providers={[{ id, title, onSelect: (prompt, page) => … }]}` — no tab opens |
| Page text pasted into the prompt by default | `defaultMode="content"` |
| Lock the mode | `showModeToggle={false}` |
| Text from somewhere other than `markdownUrl` | `getContent={() => …}` |
| Different wording | `promptTemplate={(input) => string}` — `input` has `mode`, `message`, `content`, `pageUrl`, `markdownUrl`, `title` |
| Analytics | `onSend={({ provider, prompt, href }) => …}` |
| FAB in the other corner / icon only | `position="bottom-left"`, `label={null}` |
| Panel lined up with the right edge of the trigger | `align="end"` |

## How it works

- **Prompt modes**: `link` → `Read <markdownUrl>, <question>`; `content` → the Markdown between `<page>` tags, then the question. Empty question → "I want to ask questions about it."
- **Content source**: `getContent()` → else fetch `markdownUrl` (cached per URL, failures evicted) → else `<article>`/`<main>` `innerText`.
- **Prefetch**: switching to `content` mode fetches immediately and disables provider buttons until loaded, so the click can call `window.open` synchronously (popup blockers drop opens after an `await`).
- **URL length**: if the provider URL would exceed `maxUrlLength` (default 8000, per-provider `maxUrlLength` wins), the tab opens with the `link` prompt and the full prompt goes on the clipboard, with a status message saying so.
- **Styles**: injected once as `<style id="ask-ai-button-styles">`. Colors read Fumadocs' `--color-fd-*` tokens, else a neutral palette; dark under `.dark` / `[data-theme="dark"]`. All classes are prefixed `aai-`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Model opens but the prompt is empty | That provider changed its query parameter. Override it with a custom provider object using the current URL format. |
| Model says it can't read the link | Many models can't browse. Switch to **Include page text**, or set `defaultMode="content"`. |
| "Couldn't load the page text" | `markdownUrl` 404s or is blocked by CORS. Fumadocs serves `.mdx` only if you added the `llms.mdx` route — check the URL in a browser. |
| Clicks open nothing | A popup blocker. Opens happen synchronously on click; if you wrap `onSelect` around your own `window.open` after an `await`, the browser blocks it. |
| Panel is unstyled | `injectStyles={false}` without rendering `askAIButtonCss` yourself. |
| CSP blocks the injected `<style>` | Pass `injectStyles={false}` and ship `askAIButtonCss` in your own stylesheet (or with a nonce). |
| Colors clash with the site | Override `--aai-primary`, `--aai-bg`, `--aai-border`, etc. on `.aai-root`. |
| Missing provider icons | Providers without an `icon` show their favicon from Google's favicon service, then a letter badge if that fails. Pass `icon` to avoid the network request. |
