// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::http::ResponseBuilder;
mod img;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    let path = "C:/Projects/gallery/temp/cull_cache/DSC05362.ARW";
    let img = img::load_img(path).unwrap();

    // todo: let's start just by saving this as a jpg or whatever
    // then try to downscale it (ideally by a factor?)
    // then look into a format that's fast to encode

    // println!("{img_len}");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        // todo: make the scheme just img?
        // .register_uri_scheme_protocol("reqimg", move |app, request| {
        //     if request.method() != http::Method::GET {
        //         return ResponseBuilder::new()
        //             .status(http::StatusCode::METHOD_NOT_ALLOWED)
        //             .body(Vec::new());
        //     }
        //     // todo: not found
        //     // todo: serve the img?
        //     ResponseBuilder::new()
        //         .mimetype(format!("image/{}", &extension).as_str())
        //         .body(data)
        // })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
