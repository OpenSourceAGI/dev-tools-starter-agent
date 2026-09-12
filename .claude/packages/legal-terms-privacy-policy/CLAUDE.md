# CLAUDE.md — `legal-terms-privacy-policy`

**skill:** [`skills/legal-terms-privacy-policy`](../../../skills/legal-terms-privacy-policy/SKILL.md)
· **runner:** Vitest · **build:** none — `src/index.ts` is the entry

A configurable Terms of Service and Privacy Policy: a scannable plain-language
summary alongside the full text, rendered by React components or emitted by the
CLI (`cli.mjs`).

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

## Layout

`src/content/` (the text) · `src/react/` · `src/render/` · `src/resolve.ts`
(token resolution) · `src/types.ts` · `cli.mjs`

```bash
cd packages/legal-terms-privacy-policy && bun run test
```
