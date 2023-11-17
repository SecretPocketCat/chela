// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use img::RawImg;
use num_cpus::get_physical;
use rayon::ThreadPoolBuilder;
use std::{
    collections::HashMap, fs, num::NonZeroUsize, path::PathBuf, thread::available_parallelism,
    time::Instant,
};
use tauri::{api::dialog, http::ResponseBuilder};
use tokio::sync::{mpsc, Mutex, Notify};
use url::Url;

use crate::img::{create_preview, get_raw_img_paths};

mod img;

struct AppState {
    previews: Mutex<HashMap<PathBuf, PreviewGenStatus>>,
    gen_previews_tx: Mutex<mpsc::Sender<Vec<RawImg>>>,
}

impl AppState {
    pub fn new(gen_previews_tx: mpsc::Sender<Vec<RawImg>>) -> Self {
        Self {
            previews: Default::default(),
            gen_previews_tx: Mutex::new(gen_previews_tx),
        }
    }
}

enum PreviewGenStatus {
    Generated,
    // todo: Notify comes from tokio and could be used to await completion
    // when a processing preview is requested
    // https://docs.rs/tokio/latest/tokio/sync/struct.Notify.html
    Processing(Notify),
}

// the cmd is async to start on a different thread
// blocking file dalog would otherwise block main thread
#[tauri::command]
async fn cull_dir(
    window: tauri::Window,
    app_state: tauri::State<'_, AppState>,
) -> Result<Vec<RawImg>, String> {
    // let dir = dialog::blocking::FileDialogBuilder::default()
    //     .set_title("Select culled folder")
    //     // set the parent to force focus on the dialog
    //     // this will block interaction with the app until the dialog is closed
    //     .set_parent(&window)
    //     // todo: conf
    //     .set_directory("D:\\Photos\\Culling")
    //     .pick_folder();

    let dir = Some(PathBuf::from(
        "D:\\Photos\\Culling\\Sony_29_9_2023\\100MSDCF",
    ));

    match dir {
        Some(p) => {
            let mut paths =
                get_raw_img_paths(&p).map_err(|_| "Failed to get raw paths".to_owned())?;

            // sort by creation
            paths.sort_by(|a, b| a.created.cmp(&b.created));

            let mut previews = app_state.previews.lock().await;
            previews.clear();
            previews.extend(paths.iter().map(|img| {
                (
                    img.preview_path.clone(),
                    PreviewGenStatus::Processing(Notify::new()),
                )
            }));

            // start gen
            app_state
                .gen_previews_tx
                .lock()
                .await
                .send(paths.clone())
                .await
                .map_err(|e| e.to_string())?;

            // the bg processing queue should emit an event so that the client can show rerender the img if it was loading before that
            // also might wanna redo that to an axum server and store futures instead?

            Ok(paths)
        }
        None => Err("Dialog was closed".to_owned()),
    }
}

// #[tokio::main]
// async fn main() {
fn main() {
    // tauri::async_runtime::set(tokio::runtime::Handle::current());

    // todo: create an mpsc which will be used to assign work/generate previews?
    // https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html
    let (preview_processing_tx, preview_processing_rx) = mpsc::channel(1);

    tauri::Builder::default()
        .manage(AppState::new(preview_processing_tx))
        .invoke_handler(tauri::generate_handler![cull_dir])
        .register_uri_scheme_protocol("preview", move |_app, request| {
            if request.method().as_str() != http::Method::GET {
                return ResponseBuilder::new()
                    .status(http::StatusCode::METHOD_NOT_ALLOWED.as_u16())
                    .body(Vec::new());
            }

            let uri = request.uri().parse::<Url>()?;

            match uri.query_pairs().find(|p| p.0 == "path") {
                // todo: get & use state here
                // not found in map 404
                // or not loaded - 100
                // or success
                Some(pair) => ResponseBuilder::new()
                    .mimetype("image/webp")
                    .body(fs::read(pair.1.as_ref())?),
                None => ResponseBuilder::new()
                    .status(http::StatusCode::BAD_REQUEST.as_u16())
                    .body(Vec::new()),
            }

            // todo: check path - 404 or somehow wait for the preview - ideally somehow use a future?
        })
        .setup(|_app| {
            // preview processing
            tauri::async_runtime::spawn(
                async move { async_process_model(preview_processing_rx).await },
            );

            // preview API
            // todo: need to access the state - does that have to be arc?

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn async_process_model(
    mut input_rx: mpsc::Receiver<Vec<RawImg>>,
) -> Result<(), anyhow::Error> {
    // leave 3 cores available
    let thread_count = (get_physical() - 3).max(1);
    let thread_pool = ThreadPoolBuilder::new().num_threads(thread_count).build()?;

    while let Some(mut imgs) = input_rx.recv().await {
        let i = Instant::now();

        // also should just use a part of cores, not all to allow the PC to be usable
        thread_pool.scope_fifo(|x| {
            while let Some(img) = imgs.pop() {
                x.spawn_fifo(move |_| {
                    // todo: handle err properly
                    create_preview(img).unwrap();

                    // todo: this needs to notify all
                    // and then change the state to generated
                });
            }
        });

        println!("Processing took {} secs", i.elapsed().as_secs_f32());
    }

    Ok(())
}
