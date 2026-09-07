<p align="center">
    <img  src="https://i.imgur.com/LkLbPYE.png" />
</p>
<p align="center">
     <a href="https://github.com/vtempest/export-svg-typescript/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/export-svg-typescript" /></a>
    <a href="https://npmjs.org/package/export-svg-typescript">
    <img alt="NPM Version" src="https://img.shields.io/npm/v/export-svg-typescript" />
    </a>     
    <img src="https://img.shields.io/github/last-commit/vtempest/export-svg-typescript.svg?style=flat-square" alt="GitHub last commit" />
    <a href="https://github.com/vtempest/export-svg-typescript/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/export-svg-typescript" />
    </a>
    <a href="http://makeapullrequest.com">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"/>
    </a>
</p>

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
