---
name: export-svg-typescript
description: Guide to export-svg-typescript (packages/export-svg-icons-typescript), the CLI that turns a folder of SVGs into a tree-shakable TypeScript barrel of icon functions — the -i / -o flags, the generated function options (colors, size, width, height, raw), JSDoc tooltip previews, and regenerating after adding icons. Use when working with export-svg-typescript or troubleshooting it — icons that don't recolor, an index.ts written to the wrong place, camelCase export names you can't guess, missing icons after adding files, or SVG strings rendering as text in JSX.
---

# Working With export-svg-typescript

The generator in `packages/export-svg-icons-typescript`, published as **`export-svg-typescript`**. It reads a folder of `.svg` files and writes a single `index.ts` exporting one function per icon — no SVG loader, no bundler plugin, no framework coupling. Each export returns an SVG **string** (or an `<img>` tag) at call time, so color and size are runtime arguments.

## Setup

```bash
npx export-svg-typescript -i ./src/icons -o ./src/icons/index.ts
npm install -g export-svg-typescript        # optional
```

Only two flags exist:

| Flag | Default | Meaning |
| --- | --- | --- |
| `-i <folder>` | `./svg` | Folder containing the source SVGs |
| `-o <path>` | `./index.ts` | Output file to write |

Both defaults are relative to the current working directory, so always pass `-o` explicitly unless you're standing in the icon folder. Add it as a script — `"icons": "npx export-svg-typescript -i ./src/icons -o ./src/icons/index.ts"` — and re-run it whenever icons change; the output is generated, not hand-maintained.

## Using the generated icons

File names become camelCase exports: `icon-chat.svg` → `iconChat`, `loading-double-ring.svg` → `loadingDoubleRing`.

```ts
import { loadingDoubleRing } from "./icons";
loadingDoubleRing({ size: 200, colors: ["#5345bb"] });
```

| Option | Type | Effect |
| --- | --- | --- |
| `colors` | `string[]` | Replaces hex colors **in order of first appearance** in the source SVG |
| `size` | `number \| string` | Sets width and height together (overrides both) |
| `width` / `height` | `number` | Set individually |
| `raw` | `boolean` | `true` returns the raw SVG string; otherwise an `<img>` tag with a data-URI source |

Each export carries a JSDoc block with a base64 preview of the icon, so hovering it in the editor shows the actual image.

## Recipes

**Rendering in React** — the return value is a string, not an element. Either use the `<img>` form directly, or inject the raw SVG:

```tsx
<span dangerouslySetInnerHTML={{ __html: iconChat({ size: 24, colors: ["currentColor"], raw: true }) }} />
```

**Tree shaking** — the barrel is a flat list of `export const` arrow functions, so bundlers drop the icons you never import. Don't re-export it through a wrapper that imports `*`.

**Theming** — pass `["currentColor"]` as the first color to inherit CSS color, provided the source SVG's first fill is the one you want replaced.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Colors don't change | The SVG uses named colors, `url(#gradient)` fills, or CSS classes instead of inline hex. Replacement matches hex values in appearance order only. |
| Wrong element got recolored | `colors` maps positionally: the first array entry replaces the first hex found, and so on. Count the hex values in the source file. |
| `index.ts` appeared somewhere unexpected | `-o` defaults to `./index.ts` relative to your cwd. Pass the full intended path. |
| A newly added icon isn't exported | The generator is a one-shot build step, not a watcher. Re-run it. |
| Can't guess the export name | It's the filename camelCased, with separators dropped (`my-cool_icon.svg` → `myCoolIcon`). Open the generated file to confirm. |
| SVG markup shows up as literal text in JSX | You rendered the string directly. Use the `<img>` form or `dangerouslySetInnerHTML`. |
| Editor tooltips have no preview image | The preview is a base64 data URI in the JSDoc — very large SVGs make it unwieldy, and some editors truncate hover cards. |
| Output file is huge | Every icon's markup is inlined as a template literal. That's the tradeoff for zero bundler config; keep the source folder scoped to icons you actually ship. |
