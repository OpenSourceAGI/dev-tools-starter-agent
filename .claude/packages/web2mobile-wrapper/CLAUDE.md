# CLAUDE.md — `create-mobile-wrapper` (`packages/web2mobile-wrapper`)

**npm name:** `create-mobile-wrapper` · **Private — not published.**
**skill:** [`skills/web2mobile`](../../../skills/web2mobile/SKILL.md)
· **runner:** Vitest · **build:** none

Scaffolds an **Expo** WebView app around an existing website, generates the
assets, and wires up **EAS** build/submit.

## Things that bite

- **The suite is ESM.** `test/generate.test.js` uses `import` and Vitest's
  APIs, while `src/generate.js` is CommonJS — it is loaded through
  `createRequire` so its `require('fs')`/`require('sharp')` calls keep working.
  The tests run the generator against a real temp directory rather than
  mocking those modules.
- **`src/*.template.js|json` are templates, not source.** They are copied into
  the generated project — they are not type-checked or linted here, and a
  syntax error in one surfaces only in the scaffolded app. Read them as the
  output they are.
- Store submission metadata (`eas.template.json`, `app.template.json`) encodes
  bundle identifiers and signing config. Placeholder values must stay obviously
  placeholder — a real-looking bundle id that belongs to someone else is worse
  than `com.example`.

## Layout

`src/generate.js` (entry) · `src/App.template.js` · `src/app.template.json` ·
`src/eas.template.json` · `bin/cli.js`

```bash
cd packages/web2mobile-wrapper && bun run test   # vitest
```
