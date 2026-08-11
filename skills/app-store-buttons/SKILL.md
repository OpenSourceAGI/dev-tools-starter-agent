---
name: app-store-buttons
description: Guide to the app store download badges in packages/react-app-store-buttons — rendering DownloadAppButton for iOS, Android, Chrome, macOS, Windows, Linux and Snap, appId vs href, native deep links, autoHighlight OS detection, badge sizing, the styles import, and the getOS/buildStoreUrl/buildDeepLink helpers. Use when working with these buttons or troubleshooting them — a badge that doesn't render, the wrong package name on install, deep links that don't open the store app, highlight not matching the user's OS, or SSR/hydration mismatches from userAgent detection.
---

# Working With the App Store Buttons

The React badge components in `packages/react-app-store-buttons`. **Mind the name**: `package.json` declares `react-app-store-buttons`, while the README and root README call it `react-native-app-buttons`. Check the registry name before writing an install command; inside this monorepo, import from the workspace package. Badge images are bundled as assets, so nothing is fetched from a CDN.

## Setup

```tsx
import { DownloadAppButton } from "react-app-store-buttons";
import "react-app-store-buttons/styles";   // only if you don't use Tailwind
```

`react` and `react-dom` (≥17) are peers. That's the whole install — no provider, no config.

## Picking the right props

| You want | Props |
| --- | --- |
| The store URL built for you | `platform` + `appId` |
| Your own URL (self-hosted binary, landing page) | `platform` + `href` |
| The button glowing on the user's own OS | `autoHighlight` |
| The glow always on/off regardless of OS | `highlight={true \| false}` — overrides `autoHighlight` |
| A different badge size | `height={56}` (px, default 56) |
| Same-tab navigation | `newTab={false}` |

`appId` and `href` are mutually exclusive in the types — pass exactly one.

Platforms: `ios`, `android`, `chrome-extension`, `chrome-extension-white`, `macos`, `windows`, `linux`, `linux-snap`.

```tsx
<DownloadAppButton platform="ios"     appId="6474268307"      autoHighlight />
<DownloadAppButton platform="android" appId="com.example.app" autoHighlight />
<DownloadAppButton platform="linux"   href="https://example.com/app.AppImage" />
```

## Recipes

**What `appId` means per platform** — iOS/macOS: the numeric App Store id. Android: the package name (`com.example.app`). Windows: the Microsoft Store product id (`9NBLGGH4NNS1`). Chrome: the extension id. Snap: the snap name.

**Deep links** — when the visitor's OS matches the platform, the anchor uses the native scheme so the store app opens directly instead of the web page:

| Platform | Native | Web fallback |
| --- | --- | --- |
| iOS | `itms-apps://itunes.apple.com/app/id{id}` | `https://apps.apple.com/app/id{id}` |
| macOS | `macappstore://itunes.apple.com/app/id{id}` | `https://apps.apple.com/app/id{id}` |
| Android | `market://details?id={pkg}` | `https://play.google.com/store/apps/details?id={pkg}` |
| Windows | `ms-windows-store://pdp/?productid={id}` | `https://apps.microsoft.com/detail/{id}?rtc=1` |
| Chrome | — | `https://chromewebstore.google.com/detail/{id}` |
| Snap | — | `https://snapcraft.io/{name}` |

**The helpers, standalone** — `getOS()`, the `OS` enum, `platformMatchesOS(platform, os)`, `buildStoreUrl(platform, appId)`, `buildDeepLink(platform, appId)`, and `resolveHref(platform, appId, os)` are all exported if you want the URL logic without the badge.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `npm i react-native-app-buttons` installs the wrong thing (or 404s) | The README name and the `package.json` name (`react-app-store-buttons`) disagree. Use the name the registry actually serves; in this repo, depend on the workspace package. |
| Badge area is blank | Images ship in `dist` as bundled assets — a bundler configured to ignore image imports will drop them. Make sure your build handles the package's assets, and that you imported the component from the package root. |
| Badge is unstyled / no glow | The stylesheet wasn't imported. Add `import "react-app-store-buttons/styles"` unless your app already provides the Tailwind classes. |
| Hydration mismatch with `autoHighlight` | Detection reads `navigator.userAgent`, which doesn't exist during SSR. Render the highlight after mount, or drive it with an explicit `highlight` prop computed on the client. |
| Highlight never matches | `getOS()` is user-agent based and can't see past a spoofed or reduced UA (Chrome's UA-reduction, privacy browsers). Treat `autoHighlight` as a nicety, not a guarantee. |
| Deep link does nothing on desktop | Native schemes only resolve on the matching OS with the store app installed. Everywhere else the component already falls back to the web URL — that's the intended behavior. |
| TypeScript error about `appId` and `href` | The props are a union: one or the other, never both, never neither. |
| Badges look inconsistent in a row | Set the same `height` on all of them; source badge artwork has different intrinsic aspect ratios. |
