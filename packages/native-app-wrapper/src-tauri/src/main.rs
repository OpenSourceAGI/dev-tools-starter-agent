// Prevents an additional console window from opening on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    native_app_wrapper_lib::run();
}
