# Why login needs a deep link, and how it works

This applies to **remote-mode** apps only, and only to ones whose wrapped site has a login. A
profile with no `deepLinkScheme` compiles none of this into the app's behavior — local-mode apps
(`LOCAL_APPS.md`) never need it.

Google (and most OAuth providers) refuse to run their login flow inside an embedded webview —
Tauri's WebView2/WKWebView/WebKitGTK included. Loading the site and clicking "Continue with Google"
straight inside the wrapper's window either fails outright or gets flagged as insecure. So sign-in
has to happen in the user's actual default browser, and the resulting session has to be handed back
to the wrapper's window afterward — those are two different cookie jars that can't otherwise see
each other's session.

## The three steps

```
 Wrapper window                System browser                  Wrapper window
   (the site)                    (the site)                      (the site)
┌────────────────┐            ┌──────────────────┐            ┌────────────────┐
│ login UI        │  opener    │ /login            │            │ /auth/         │
│ "Continue in    │ ────────► │  → Google OAuth    │            │  native-callback│
│  your browser"  │  plugin    │  → /auth/          │  deep      │  verifies token │
│                 │            │    native-complete │  link      │  → session      │
│                 │            │  generates token,  │ ─────────► │    cookie set   │
│                 │            │  redirects to      │ myapp://   │  → redirect "/" │
│                 │            │  myapp://...       │            │                 │
└────────────────┘            └──────────────────┘            └────────────────┘
      step 1                        step 2                          step 3
```

1. **The site's login page** detects it's running inside the wrapper — check for the
   `window.__TAURI__` global the wrapper injects (the profile sets `withGlobalTauri`, and
   `capabilities/remote.json` is what makes the opener plugin reachable from the site's origin) —
   and, instead of rendering the normal social/magic-link buttons, renders one "Continue in your
   browser" button. Clicking it calls the wrapper's opener plugin (`plugin:opener|open_url`) to
   open `https://<your-site>/login?callbackURL=/auth/native-complete` in the OS default browser.
2. The user signs in normally there — whichever provider they pick; none of this page's code needs
   to know which. Once a session cookie exists, the browser lands on **`/auth/native-complete`**.
   That page generates a **single-use, short-lived token bound to that session** and redirects the
   browser to `<scheme>://auth-callback?token=<token>`. The custom scheme (registered by the
   wrapper from the profile's `deepLinkScheme`) hands the OS back to the installed app.
3. `src-tauri/src/lib.rs`'s `on_open_url` handler catches that deep link and navigates the
   wrapper's own window to **`https://<your-site>/auth/native-callback?token=<token>`** — the same
   origin the window already had loaded, so this is same-origin from here on. That page spends the
   token against the site's verify endpoint, which sets a session cookie scoped to *this* window's
   cookie jar, then redirects to `/`. The wrapper's window is now signed in.

## Why the Rust side doesn't call the verify endpoint directly

A verify endpoint is normally a **POST** expecting a JSON body — not something a plain window
navigation (a GET) can hit. Routing through `/auth/native-callback`'s own client-side `fetch` is
what actually performs that POST, and doing it from a page already loaded at the site's own origin
is what makes the resulting `Set-Cookie` land in the right cookie jar with no CORS complications —
a cross-origin fetch from a `tauri://localhost` asset page would need those, a same-origin one
doesn't.

## Windows/Linux: why `tauri-plugin-single-instance` is in `Cargo.toml`

Clicking a `<scheme>://` link while the app is already running launches a **second OS process** on
Windows and Linux instead of delivering the URL to the running one — `on_open_url` alone doesn't
fire for the already-running instance there. `tauri-plugin-single-instance` intercepts that second
launch and forwards its argv (which contains the deep-link URL) to `handle_deep_link()` in the
first, already-running process instead, and focuses its window. macOS doesn't need this —
`on_open_url` fires correctly there without it.

## What the wrapped site has to provide

Everything above is generic except the page routes — `/login`, `/auth/native-complete`,
`/auth/native-callback` — which have to exist on whatever the profile's `url` points at. Any auth
stack with a one-time-token generate/verify pair will do;
[better-auth's one-time-token plugin](https://better-auth.com/docs/plugins/one-time-token) is one
ready-made option. The deep-link and Rust-side handoff mechanics in `src-tauri/` don't change
either way.

`debate/debate-ai.com`'s `apps/debate-native-wrapper` — the wrapper this package was generalized
from — is a full worked implementation of both halves if you want a reference.
