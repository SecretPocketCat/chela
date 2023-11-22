// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(clippy::cast_precision_loss)]

mod app;
mod image;
mod preview_api;

fn main() -> tauri::Result<()> {
    app::run_app()
}
