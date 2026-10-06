# CLAUDE.md — `ask-ai-button`

**skill:** [`skills/ask-ai-button`](../../../skills/ask-ai-button/SKILL.md)
· **runner:** Vitest (jsdom) · **build:** Vite library + `vite-plugin-dts`

"Ask AI about this page" for docs sites: `AskAIButton` (dropdown or FAB),
`AskAIPanel` (inline), `CopyPageButton`. Spun out of
`starter-templates/template-fumadocs/components/fumadocs/ai/`.

## Rules

- **Provider URLs are public API.** A changed query parameter silently empties
  every prompt for that provider. Only change one after checking it opens with
  the prompt filled in, and keep the encode-everything test passing.
- **`window.open` must stay synchronous in the click handler.** Content is
  prefetched for exactly this reason; an `await` before the open gets the tab
  blocked as a popup.
- **No Tailwind, no CSS import.** Styles live in `src/styles.ts` and are
  injected at runtime; class names (`aai-*`) and `--aai-*` variables are public
  surface.
- The bundle keeps its `"use client"` banner (`vite.config.ts`) so Next.js
  server components can render it.

## Layout

`src/AskAIButton.tsx` (trigger, FAB, CopyPageButton) · `src/AskAIPanel.tsx`
(the panel) · `src/providers.tsx` · `src/prompt.ts` · `src/clipboard.ts` ·
`src/styles.ts` · `src/icons.tsx` · `demo/` (`bun run dev`)

```bash
cd packages/ask-ai-button && bun run typecheck && bun run test && bun run build
```
