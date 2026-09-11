<p align="center">
    <img  src="https://i.imgur.com/LkLbPYE.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/export-svg-icons-typescript"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/export-svg-icons-typescript"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/export-svg-typescript"><img src="https://img.shields.io/npm/dm/export-svg-typescript.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/export-svg-typescript"><img src="https://img.shields.io/npm/v/export-svg-typescript.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/export-svg-typescript"><img src="https://img.shields.io/npm/dt/export-svg-typescript.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/export-svg-typescript"><img src="https://img.shields.io/npm/types/export-svg-typescript" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=export-svg-typescript"><img src="https://packagephobia.com/badge?p=export-svg-typescript" alt="Install size" /></a>
</p>
<!-- template-git-repo:badges:end -->

## export-svg-typescript

Convert a folder of SVG icons into a color-customizable, tree-shakable TypeScript export `index.ts` that works with any component framework without SVG or Vite compiler issues.

1. Barrel Roll: Exports all icons as named functions for tree shaking to only the ones actually used.
2. Typescript Tooltip Previews: Each export includes a tooltip preview of icon.
3. Customizable: Change icon colors, size, and dimensions at runtime. Can return SVG or IMG tag with SVG as source.
4. CLI Tool: Use directly from the command line or in npm scripts.

### Install
Global install:
```
npm install -g export-svg-typescript
```
Or add to package.json:
```
 "icons": "npx export-svg-typescript -i ./src/icons",
```
Or use npx without installing globally with index output file set
```
npx export-svg-typescript -i ./src/icons -o ./src/icons/index.ts
```

### Example

Clone this repo and run `npm run demo` to see icons in demo folder.

```javascript
import { loadingDoubleRing } from './demo';
 
loadingDoubleRing({size: 200, colors: ["#5345bb"] })
```
![screenshot](https://i.imgur.com/aXczCC2.png)

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
