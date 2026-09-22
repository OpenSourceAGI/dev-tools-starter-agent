# CLAUDE.md — `legal-terms-privacy-policy`

**skill:** [`skills/legal-terms-privacy-policy`](../../../skills/legal-terms-privacy-policy/SKILL.md)
· **runner:** Vitest · **build:** none — `src/index.ts` is the entry

A configurable Terms of Service and Privacy Policy: a scannable plain-language
summary alongside the full text, rendered by React components or emitted by the
CLI (`cli.mjs`). The cookie consent banner ships from here too — it makes the
same promises in a smaller box, and linking the two is the whole point.

## Rules

- **Legal text is not refactorable prose.** Do not reword, condense or "improve"
  the content in `src/content/` to fit a layout. Structure and tokens are yours;
  the wording is not.
- The two variants (summary and full) must stay in sync — a section removed from
  one has to be accounted for in the other.
- Token substitution (company name, jurisdiction, contact) is the configuration
  surface. An unsubstituted token shipping to a real site is the failure mode
  worth testing for.
- This package is consumed by sibling repos (the ai-broker app renders its legal
  pages from it), so changing a token name or an export is a cross-repo break.
- The consent record's shape and its `cookie-consent` storage key are a
  compatibility surface: a visitor who has already answered must keep reading
  as answered. Widen the record, don't re-key it.

## Layout

`src/content/` (the text) · `src/react/` · `src/render/` · `src/resolve.ts`
(token resolution) · `src/types.ts` · `src/cookie-consent.ts` (the consent
record and its storage, framework-free) · `cli.mjs`

The suite runs in `node`, not jsdom — the consent tests stub `localStorage` and
server-render the banner rather than adding a DOM to the package.

```bash
cd packages/legal-terms-privacy-policy && bun run test
```
