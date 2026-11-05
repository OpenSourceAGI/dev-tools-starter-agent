// Generic Tauri wrapper. It packages one of two things as a native app,
// depending on the active profile's `mode` (see ../profiles/README.md):
//
//   remote — the main window loads `generated_config::APP_URL` directly, so the
//            live site is the app's entire UI. The only thing the wrapper adds
//            beyond the window is an OAuth handoff: providers like Google
//            refuse to run their login flow inside an embedded webview, so
//            sign-in happens in the system browser and comes back through the
//            `<scheme>://auth-callback?token=...` deep link handled below.
//            See ../docs/OAUTH.md for the full round trip.
//
//   local  — the main window loads the frontend bundled in ../dist, and the
//            app's data comes from a CLI bundled alongside it as a Tauri
//            sidecar, reachable through the `sidecar_output` command. This is
//            how a command-line tool ships as a GUI app with no runtime (no
//            Node, no interpreter) installed on the user's machine.
//            See ../docs/LOCAL_APPS.md.
//
// Everything that differs between apps is generated into generated_config.rs by
// scripts/configure.mjs, so this file never needs editing to package a
// different app.

mod generated_config;

use tauri::{Manager, Url};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Neither single-instance nor the updater apply on Android/iOS: the OS
    // already dedupes app launches there, and store updates replace what
    // tauri-plugin-updater does on desktop.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // On Windows/Linux, clicking a deep link while the app is already
            // running launches a *second* process instead of firing the
            // `on_open_url` event in the first one — single-instance forwards
            // that second launch's argv here instead, so the callback still
            // needs to be pulled out of argv and handled the same way.
            if !generated_config::DEEP_LINK_SCHEME.is_empty() {
                let scheme_prefix = format!("{}://", generated_config::DEEP_LINK_SCHEME);
                if let Some(url) = argv.iter().find(|arg| arg.starts_with(&scheme_prefix)) {
                    handle_deep_link(app, url);
                }
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }));
        // Only when the profile configured updates. tauri-plugin-updater reads
        // `plugins.updater.pubkey` during initialization and *panics* if it
        // isn't there, so registering it unconditionally would crash every app
        // that hasn't set up an update endpoint — which is the default.
        if generated_config::UPDATER_ENABLED {
            builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
        }
        builder = builder.plugin(fullscreen_toggle_plugin());
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![sidecar_output])
        .setup(|app| {
            if !generated_config::DEEP_LINK_SCHEME.is_empty() {
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        handle_deep_link(&handle, url.as_str());
                    }
                });

                // Desktop platforms must register the scheme with the OS at
                // runtime (the tauri.conf.json `plugins.deep-link.desktop.schemes`
                // entry declares it for the installer; this call is what actually
                // wires it up in dev / for unpackaged runs). Android/iOS pick the
                // scheme up from the generated project's manifest/Info.plist
                // instead, produced by `tauri android init` / `tauri ios init`
                // reading the same tauri.conf.json — calling register_all() there
                // is a no-op.
                #[cfg(not(any(target_os = "android", target_os = "ios")))]
                {
                    let _ = app.deep_link().register_all();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the native app wrapper");
}

/// Runs the bundled sidecar CLI and returns its stdout, for local-mode apps
/// whose frontend is a view over a command-line tool.
///
/// Two things are deliberately not parameters.
///
/// The argument list is fixed at `generated_config::SIDECAR_ARGS`, so a page can
/// ask for the snapshot the app is built around but can't turn the bundled
/// binary into a general-purpose process spawner. An app that needs several
/// invocations should add several commands with several fixed argument lists,
/// not open this one up.
///
/// And the caller is checked to be locally bundled content. Tauri already
/// rejects app-defined commands coming from a remote origin unless a capability
/// explicitly grants them, so this is a second line of defense rather than the
/// only one — but it is the line that doesn't depend on nobody ever adding this
/// command to `capabilities/remote.json`, which is exactly the mistake that
/// would hand a wrapped website a process spawner.
#[tauri::command]
async fn sidecar_output(window: tauri::WebviewWindow) -> Result<String, String> {
    use tauri_plugin_shell::ShellExt;

    if generated_config::SIDECAR_NAME.is_empty() {
        return Err("this app bundles no sidecar (the profile has no \"sidecar\" block)".into());
    }

    // Tauri serves bundled content from tauri://localhost, or
    // http://tauri.localhost on Windows. Anything else is a real website.
    let url = window.url().map_err(|e| e.to_string())?;
    let is_bundled_content =
        url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost");
    if !is_bundled_content {
        return Err("sidecar_output is only callable from the app's bundled frontend".into());
    }

    let output = window
        .app_handle()
        .shell()
        .sidecar(generated_config::SIDECAR_NAME)
        .map_err(|e| format!("sidecar \"{}\" is not bundled: {e}", generated_config::SIDECAR_NAME))?
        .args(generated_config::SIDECAR_ARGS)
        .output()
        .await
        .map_err(|e| format!("sidecar failed to run: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "sidecar exited with {}: {}",
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stderr).trim(),
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// F11 / Ctrl+Shift+F toggles the main window's fullscreen state. A profile can
/// open the window in true OS fullscreen (`window.fullscreen`), which on most
/// platforms hides the title bar entirely, so this is the only way out that
/// doesn't depend on the wrapped page's own JS or a click target that isn't
/// there.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn fullscreen_toggle_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    use tauri_plugin_global_shortcut::ShortcutState;

    tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts(["F11", "CmdOrCtrl+Shift+F"])
        .expect("fullscreen shortcuts are valid accelerator strings")
        .with_handler(|app, _shortcut, event| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            if let Some(window) = app.get_webview_window("main") {
                let is_fullscreen = window.is_fullscreen().unwrap_or(false);
                let _ = window.set_fullscreen(!is_fullscreen);
            }
        })
        .build()
}

/// Handles `<scheme>://auth-callback?token=...`. The token is a one-time login
/// token the site minted from the session the system browser just established
/// with the OAuth provider. Verifying it is a same-origin POST, not something a
/// plain navigation can hit — so instead of calling that endpoint from Rust,
/// this navigates the window to `/auth/native-callback` (same origin as the
/// site already loaded here), which spends the token client-side. That POST
/// happens same-origin to this webview, so the resulting session cookie lands
/// in *this* webview's cookie jar — the whole reason the token exists, since
/// the system browser's cookies and this window's cookies are different jars
/// that can't otherwise see each other's session. See ../docs/OAUTH.md.
fn handle_deep_link(app: &tauri::AppHandle, raw_url: &str) {
    let Ok(parsed) = Url::parse(raw_url) else {
        return;
    };
    let is_auth_callback = parsed.host_str() == Some("auth-callback")
        || parsed.path().trim_start_matches('/') == "auth-callback";
    if !is_auth_callback {
        return;
    }
    let Some((_, token)) = parsed.query_pairs().find(|(key, _)| key == "token") else {
        return;
    };

    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let callback_url = format!(
        "{}/auth/native-callback?token={}",
        generated_config::APP_URL,
        urlencoding::encode(&token),
    );
    if let Ok(url) = Url::parse(&callback_url) {
        let _ = window.navigate(url);
        let _ = window.set_focus();
    }
}
