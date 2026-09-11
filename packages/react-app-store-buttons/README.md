<p align="center">
    <img src="https://i.imgur.com/5lsiepL.png" width="300" >
    <br />
<b>💍One Code to rule them all — and in the cloud compile them. </b>
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/react-app-store-buttons"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/react-app-store-buttons"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/react-app-store-buttons"><img src="https://img.shields.io/npm/dm/react-app-store-buttons.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/react-app-store-buttons"><img src="https://img.shields.io/npm/v/react-app-store-buttons.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/react-app-store-buttons"><img src="https://img.shields.io/npm/dt/react-app-store-buttons.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/react-app-store-buttons"><img src="https://img.shields.io/npm/types/react-app-store-buttons" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=react-app-store-buttons"><img src="https://packagephobia.com/badge?p=react-app-store-buttons" alt="Install size" /></a>
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill app-store-buttons` ([what it covers](../../skills/app-store-buttons/SKILL.md))
<!-- skills:install:end -->

# react-native-app-buttons

React badge components for app store and platform download links. Badges ship as bundled assets — no CDN required.
[DEMO](https://appdemo-dev-tools-mu.vercel.app)

![screen](https://i.imgur.com/VNhYSmF.png)

## Install

```bash
npm install react-native-app-buttons
```

Import the bundled stylesheet if your project doesn't use Tailwind:

```ts
import "react-native-app-buttons/styles";
```

## Features

- **8 platforms** — iOS App Store, Google Play, Chrome Web Store, Mac App Store, Microsoft Store, Linux, Snap Store
- **`appId` prop** — pass your app identifier and the correct store URL is built automatically per platform
- **Native deep links** — when the user is on the matching OS the button uses the native store protocol (`itms-apps://`, `macappstore://`, `market://`, `ms-windows-store://`) so the store app opens directly
- **`autoHighlight`** — detects the user's OS via `navigator.userAgent` and applies a golden glow ring to the matching platform button
- **`highlight`** — manually force the golden glow on any button
- **`newTab`** — open in new tab (default) or same tab
- **`height`** — badge image height in px (default `56`)
- **Exported utilities** — `getOS()`, `OS` enum, `buildStoreUrl()`, `buildDeepLink()`, `platformMatchesOS()`

## Usage

```tsx
import { DownloadAppButton } from "react-native-app-buttons";

<DownloadAppButton platform="ios"              appId="6474268307"               autoHighlight />
<DownloadAppButton platform="android"          appId="com.example.app"          autoHighlight />
<DownloadAppButton platform="chrome-extension" appId="noecbaibfh..."            autoHighlight />
<DownloadAppButton platform="macos"            appId="6474268307"               autoHighlight />
<DownloadAppButton platform="windows"          appId="9NBLGGH4NNS1"             autoHighlight />
<DownloadAppButton platform="linux-snap"       appId="my-app"                   autoHighlight />
<DownloadAppButton platform="linux"            href="https://example.com/linux" autoHighlight />
```

Pass `href` instead of `appId` to use an explicit URL:

```tsx
<DownloadAppButton platform="ios" href="https://apps.apple.com/app/id6474268307" />
```

## Props

| Prop              | Type         | Default        | Notes                                          |
| ----------------- | ------------ | -------------- | ---------------------------------------------- |
| `platform`      | `Platform` | —             | Required                                       |
| `appId`         | `string`   | —             | Either `appId` or `href` required          |
| `href`          | `string`   | —             | Either `appId` or `href` required          |
| `autoHighlight` | `boolean`  | `false`      | Golden glow when OS matches platform           |
| `highlight`     | `boolean`  | —             | Force glow on/off; overrides `autoHighlight` |
| `newTab`        | `boolean`  | `true`       | `target="_blank"`                            |
| `height`        | `number`   | `56`         | Badge height in px                             |
| `className`     | `string`   | `""`         | Extra classes on `<a>`                       |
| `alt`           | `string`   | Platform label | Accessible alt text                            |

## Deep link schemes

| Platform | Native deep link                              | Web fallback                                            |
| -------- | --------------------------------------------- | ------------------------------------------------------- |
| iOS      | `itms-apps://itunes.apple.com/app/id{id}`   | `https://apps.apple.com/app/id{id}`                   |
| macOS    | `macappstore://itunes.apple.com/app/id{id}` | `https://apps.apple.com/app/id{id}`                   |
| Android  | `market://details?id={pkg}`                 | `https://play.google.com/store/apps/details?id={pkg}` |
| Windows  | `ms-windows-store://pdp/?productid={id}`    | `https://apps.microsoft.com/detail/{id}?rtc=1`        |
| Chrome   | —                                            | `https://chromewebstore.google.com/detail/{id}`       |
| Snap     | —                                            | `https://snapcraft.io/{name}`                         |

## Utilities

```ts
import { getOS, OS, platformMatchesOS, buildStoreUrl, buildDeepLink, resolveHref } from "react-native-app-buttons";

getOS()                                             // → OS.macOS | OS.Windows | OS.Linux | …
platformMatchesOS("macos", getOS())                 // → true on macOS
buildStoreUrl("android", "com.example.app")         // → "https://play.google.com/…"
buildDeepLink("android", "com.example.app")         // → "market://details?id=…"
resolveHref("android", "com.example.app", getOS()) // → deep link on Android, web elsewhere
```

## Dev

```bash
npm run dev        # demo at http://localhost:5173
        build      # library build → dist/
        typecheck
```

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
