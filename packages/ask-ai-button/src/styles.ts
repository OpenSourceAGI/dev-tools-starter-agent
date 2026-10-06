/**
 * @file styles.ts
 * @description The component stylesheet, injected once at runtime so the
 * package works without a CSS import or Tailwind. Colors read Fumadocs'
 * `--color-fd-*` tokens when present and fall back to a neutral palette.
 * Every class is prefixed `aai-`; override the `--aai-*` variables to theme it.
 */
import { useInsertionEffect } from "react";

export const STYLE_ELEMENT_ID = "ask-ai-button-styles";

export const askAIButtonCss = `
.aai-root {
  --aai-fallback-bg: #ffffff;
  --aai-fallback-fg: #0a0a0a;
  --aai-fallback-muted: #6b7280;
  --aai-fallback-border: #e5e7eb;
  --aai-fallback-accent: #f3f4f6;
  --aai-fallback-primary: #2563eb;
  --aai-fallback-primary-fg: #ffffff;
  --aai-bg: var(--color-fd-popover, var(--aai-fallback-bg));
  --aai-fg: var(--color-fd-popover-foreground, var(--aai-fallback-fg));
  --aai-muted: var(--color-fd-muted-foreground, var(--aai-fallback-muted));
  --aai-border: var(--color-fd-border, var(--aai-fallback-border));
  --aai-accent: var(--color-fd-accent, var(--aai-fallback-accent));
  --aai-primary: var(--color-fd-primary, var(--aai-fallback-primary));
  --aai-primary-fg: var(--color-fd-primary-foreground, var(--aai-fallback-primary-fg));
  --aai-radius: 0.75rem;
  position: relative;
  display: inline-flex;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--aai-fg);
}
.dark .aai-root, [data-theme="dark"] .aai-root, .aai-root.aai-dark {
  --aai-fallback-bg: #0a0a0a;
  --aai-fallback-fg: #fafafa;
  --aai-fallback-muted: #a1a1aa;
  --aai-fallback-border: #27272a;
  --aai-fallback-accent: #1f1f23;
  --aai-fallback-primary: #60a5fa;
  --aai-fallback-primary-fg: #0a0a0a;
}
.aai-root *, .aai-root *::before, .aai-root *::after { box-sizing: border-box; }
.aai-root svg { width: 1rem; height: 1rem; flex-shrink: 0; }
.aai-btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.375rem 0.75rem; border-radius: 0.5rem;
  border: 1px solid var(--aai-border); background: var(--aai-bg); color: var(--aai-fg);
  font: inherit; font-weight: 500; white-space: nowrap; text-decoration: none; cursor: pointer;
  transition: background-color 120ms, color 120ms;
}
.aai-btn:hover { background: var(--aai-accent); }
.aai-btn:disabled { opacity: 0.5; cursor: default; }
.aai-btn:focus-visible, .aai-provider:focus-visible, .aai-input:focus-visible, .aai-fab:focus-visible {
  outline: 2px solid var(--aai-primary); outline-offset: 2px;
}
.aai-btn-primary { background: var(--aai-primary); color: var(--aai-primary-fg); border-color: transparent; }
.aai-btn-primary:hover { background: var(--aai-primary); opacity: 0.9; }
.aai-chevron { width: 0.875rem !important; height: 0.875rem !important; color: var(--aai-muted); transition: transform 150ms; }
.aai-open .aai-chevron { transform: rotate(180deg); }
.aai-panel {
  position: absolute; z-index: 50; top: calc(100% + 0.5rem);
  width: min(22rem, calc(100vw - 2rem));
  display: flex; flex-direction: column; gap: 0.625rem; padding: 0.75rem;
  background: var(--aai-bg); color: var(--aai-fg);
  border: 1px solid var(--aai-border); border-radius: var(--aai-radius);
  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 0.3);
  animation: aai-in 120ms ease-out;
}
.aai-panel.aai-align-start { left: 0; }
.aai-panel.aai-align-end { right: 0; }
.aai-panel.aai-inline { position: static; width: 100%; box-shadow: none; animation: none; }
@keyframes aai-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.aai-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-weight: 600; }
.aai-heading small { font-weight: 400; color: var(--aai-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aai-input {
  width: 100%; min-height: 4.5rem; resize: vertical; padding: 0.5rem 0.625rem;
  border: 1px solid var(--aai-border); border-radius: 0.5rem;
  background: transparent; color: inherit; font: inherit;
}
.aai-input::placeholder { color: var(--aai-muted); }
.aai-modes { display: flex; padding: 0.125rem; gap: 0.125rem; border: 1px solid var(--aai-border); border-radius: 0.5rem; }
.aai-mode {
  flex: 1; padding: 0.25rem 0.5rem; border: 0; border-radius: 0.375rem;
  background: transparent; color: var(--aai-muted); font: inherit; font-size: 0.75rem; cursor: pointer;
}
.aai-mode[aria-pressed="true"] { background: var(--aai-accent); color: var(--aai-fg); font-weight: 500; }
.aai-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 500; color: var(--aai-muted); }
.aai-label::before, .aai-label::after { content: ""; height: 1px; flex: 1; background: var(--aai-border); }
.aai-providers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.25rem; max-height: 14rem; overflow-y: auto; }
.aai-provider {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.4375rem 0.5rem;
  border: 0; border-radius: 0.5rem; background: transparent; color: inherit;
  font: inherit; text-align: left; text-decoration: none; cursor: pointer;
}
.aai-provider:hover { background: var(--aai-accent); }
.aai-provider:disabled { opacity: 0.5; cursor: default; }
.aai-provider span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aai-favicon { width: 1rem; height: 1rem; border-radius: 0.25rem; flex-shrink: 0; }
.aai-letter {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--aai-accent); color: var(--aai-muted); font-size: 0.625rem; font-weight: 700;
}
.aai-actions { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.aai-actions .aai-btn { flex: 1; justify-content: center; font-size: 0.75rem; padding: 0.3125rem 0.5rem; }
.aai-status { min-height: 1rem; font-size: 0.75rem; color: var(--aai-muted); }
.aai-status[data-tone="error"] { color: #dc2626; }
.aai-status:empty { display: none; }
.aai-fab-root { position: fixed; z-index: 60; bottom: 1.25rem; }
.aai-fab-root.aai-pos-bottom-right { right: 1.25rem; }
.aai-fab-root.aai-pos-bottom-left { left: 1.25rem; }
.aai-fab {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  height: 3rem; min-width: 3rem; padding: 0 1rem; border: 0; border-radius: 999px;
  background: var(--aai-primary); color: var(--aai-primary-fg);
  font: inherit; font-weight: 600; cursor: pointer;
  box-shadow: 0 8px 24px -6px rgb(0 0 0 / 0.35);
  transition: transform 120ms;
}
.aai-fab:hover { transform: translateY(-1px); }
.aai-fab-root .aai-panel { top: auto; bottom: calc(100% + 0.75rem); }
.aai-fab-root.aai-pos-bottom-right .aai-panel { right: 0; left: auto; }
.aai-fab-root.aai-pos-bottom-left .aai-panel { left: 0; right: auto; }
.aai-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .aai-panel { animation: none; } .aai-fab, .aai-chevron { transition: none; } }
`;

/** Add the stylesheet to `document.head` once, unless `enabled` is false. */
export function useAskAIStyles(enabled = true): void {
  useInsertionEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    if (document.getElementById(STYLE_ELEMENT_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    style.textContent = askAIButtonCss;
    document.head.appendChild(style);
  }, [enabled]);
}
