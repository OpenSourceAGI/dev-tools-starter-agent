---
name: web2mobile
description: Guide to web2mobile-wrapper (packages/web2mobile-wrapper), the generator that wraps a website in an Expo/React Native WebView app — the interactive CLI vs config.json, icon auto-detection and asset generation with Sharp, the generated mobile-app/ directory, and the EAS build and submit scripts. Use when working with web2mobile or troubleshooting it — a blank or refusing-to-load WebView, X-Frame-Options and HTTPS requirements, icon generation failures, EAS build or login errors, or app-store rejections of thin wrapper apps.
---

# Working With web2mobile

The generator in `packages/web2mobile-wrapper` (package name `create-mobile-wrapper`, bin `create-mobile-wrapper`; marked `private`, so run it from a checkout). It renders an Expo + `react-native-webview` app that loads your site, generates every icon size with Sharp, and wires up EAS build/submit profiles.

## Setup

Prerequisites: Node 18+, an **HTTPS** site, and a square logo.

Two ways to configure — the CLI prompts, or a `config.json`:

```bash
npm install
npm run generate      # prompts: app name, website URL, enable EAS?
```

```json
{
  "name": "Your App Name",
  "url": "https://yoursite.com",
  "icon": "path/to/logo.png",
  "packageName": "com.yourcompany.app"
}
```

`name`, `url`, and `packageName` (reverse-domain) are required; `icon` is optional — without it the tool searches `icon.png`/`logo.png`/`app-icon.png` in the cwd and in `assets/`, `public/`, `static/`, `images/`, `img/`, accepting `.png`, `.jpg`, `.jpeg`, `.svg`, and falls back to a placeholder.

## What gets generated

Everything lands in `mobile-app/`:

```
mobile-app/
├── assets/  icon.png (1024²) · adaptive-icon.png (1024²) · splash.png (2048²) · favicon.png (48²)
├── App.js       WebView wrapper
├── app.json     Expo config
├── package.json
└── eas.json     development / preview / production profiles
```

## Build and submit

| Goal | Command (from the project root) |
| --- | --- |
| Test on a device | `npm start`, then scan the QR with Expo Go (`i`/`a` for simulators) |
| First-time EAS setup | `npx eas-cli login`, then `cd mobile-app && npx eas build:configure` |
| Android / iOS / both | `npm run build:android` · `build:ios` · `build:all` |
| Store release (auto-increment) | `npm run build:production` |
| Submit | `npm run submit:android` · `submit:ios` · `submit:all` |

## Recipes

**Customize behavior after generation** — edit `mobile-app/App.js` for loading states, error handling, back-button navigation, custom headers, `injectedJavaScript`, or user agent; `mobile-app/app.json` for splash color, status bar style, orientation; `mobile-app/eas.json` for build profiles. Re-running the generator overwrites these, so keep custom edits in version control.

**Detecting the wrapper from your site** — set a custom user agent in `App.js` and branch on it server-side to hide install banners or enable app-only behavior.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Blank WebView | The URL isn't HTTPS (required), the site sends `X-Frame-Options`/CSP `frame-ancestors` that block embedding, or it failed silently — add an `onError` handler in `App.js` and test the URL in a mobile browser first. |
| Login/session doesn't persist | The WebView has its own cookie/localStorage jar. Third-party-cookie-dependent auth flows often need a native redirect or a token handoff. |
| Generation fails on the icon | Sharp couldn't read the file. Use a square PNG ≥512px (1024px recommended); SVG input works but converts less predictably. |
| Icons look cropped or off-center | Non-square source. The tool resizes and centers — it can't fix a 16:9 logo. |
| `eas build` fails | Not logged in (`npx eas-cli login`), dependencies not installed in `mobile-app/`, or an invalid `config.json`. Build errors come from EAS, not this tool — read its log URL. |
| `packageName` rejected | It must be reverse-domain (`com.company.app`), unique on both stores, and immutable after first publish. Choose carefully. |
| App store rejects the app | Both stores reject apps that are only a website in a shell. Add genuine native value (push notifications, offline handling, deep links) before submitting. |
| Re-running `generate` wiped my changes | Templates are re-rendered into `mobile-app/`. Commit before regenerating, or move customizations into the templates under `src/`. |
| `npm run start` can't find Expo | Scripts `cd mobile-app` first — run `npm install` inside `mobile-app/` after generation. |
