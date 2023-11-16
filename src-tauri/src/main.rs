// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use img::RawImg;
use lazy_static::lazy_static;
use rayon::{ThreadPool, ThreadPoolBuilder};
use std::{fs, num::NonZeroUsize, thread::available_parallelism};
use tauri::{api::dialog, http::ResponseBuilder};
use url::Url;

use crate::img::{create_preview, get_raw_img_paths};

mod img;

lazy_static! {
    static ref PREVIEW_THREAD_POOL: ThreadPool = {
        let core_count = available_parallelism()
            .unwrap_or(NonZeroUsize::new(4).unwrap())
            .get();
        let thread_count = core_count / 2;

        ThreadPoolBuilder::new()
            .num_threads(thread_count)
            .build()
            .unwrap()
    };
}

// the cmd is async to start on a different thread
// blocking file dalog would otherwise block main thread
#[tauri::command(async)]
fn cull_dir(window: tauri::Window) -> Result<Vec<RawImg>, String> {
    let dir = dialog::blocking::FileDialogBuilder::default()
        .set_title("Select culled folder")
        // set the parent to force focus on the dialog
        // this will block interaction with the app until the dialog is closed
        .set_parent(&window)
        // todo: conf
        .set_directory("D:\\Photos\\Culling")
        .pick_folder();

    match dir {
        Some(p) => {
            // todo: handle res
            let mut paths = get_raw_img_paths(&p).unwrap();
            // sort by creation
            paths.sort_by(|a, b| a.created.cmp(&b.created));

            let res = paths.to_vec();

            // pre-gen the first 4 & the last 2 img
            let mut initial_imgs = Vec::with_capacity(4);
            initial_imgs.extend(paths.drain(0..4));
            initial_imgs.extend(paths.drain((paths.len() - 2)..));

            PREVIEW_THREAD_POOL.scope(|x| {
                for img in initial_imgs.iter().take(10) {
                    x.spawn(|_| {
                        create_preview(img.clone()).unwrap();
                    });
                }
            });

            Ok(res)
        }
        None => Err("Dialog was closed".to_owned()),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![cull_dir])
        .register_uri_scheme_protocol("preview", move |_app, request| {
            if request.method().as_str() != http::Method::GET {
                return ResponseBuilder::new()
                    .status(http::StatusCode::METHOD_NOT_ALLOWED.as_u16())
                    .body(Vec::new());
            }

            let uri = request.uri().parse::<Url>()?;

            match uri.query_pairs().find(|p| p.0 == "path") {
                Some(pair) => ResponseBuilder::new()
                    .mimetype("image/jpeg")
                    .body(fs::read(pair.1.as_ref())?),
                None => ResponseBuilder::new()
                    .status(http::StatusCode::BAD_REQUEST.as_u16())
                    .body(Vec::new()),
            }

            // todo: check path - 404 or somehow wait for the preview - ideally somehow use a future?
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
