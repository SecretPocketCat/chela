use tauri::Manager;

use crate::{app::state::AppState, image::process_previews, preview_api};
use std::{borrow::BorrowMut, collections::HashMap, sync::Arc};

mod commands;
mod state;

// #[tokio::main]
// async fn main() {
pub(crate) fn run_app() -> tauri::Result<()> {
    // tauri::async_runtime::set(tokio::runtime::Handle::current());

    // todo: create an mpsc which will be used to assign work/generate previews?
    // https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html
    let (preview_processing_tx, preview_processing_rx) = tokio::sync::mpsc::channel(1);
    let previews = Arc::new(tokio::sync::RwLock::new(HashMap::with_capacity(500)));

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::cull_dir
        ])
        // .register_uri_scheme_protocol("preview", move |_app, request| {
        //     if request.method().as_str() != http::Method::GET {
        //         return ResponseBuilder::new()
        //             .status(http::StatusCode::METHOD_NOT_ALLOWED.as_u16())
        //             .body(Vec::new());
        //     }
        //     let uri = request.uri().parse::<Url>()?;
        //     match uri.query_pairs().find(|p| p.0 == "path") {
        //         // todo: get & use state here
        //         // not found in map 404
        //         // or not loaded - 100
        //         // or success
        //         Some(pair) => ResponseBuilder::new()
        //             .mimetype("image/webp")
        //             .body(fs::read(pair.1.as_ref())?),
        //         None => ResponseBuilder::new()
        //             .status(http::StatusCode::BAD_REQUEST.as_u16())
        //             .body(Vec::new()),
        //     }
        //     // todo: check path - 404 or somehow wait for the preview - ideally somehow use a future?
        // })
        .setup(|app| {
            // preview processing
            let p = Arc::clone(&previews);
            tauri::async_runtime::spawn(
                async move { process_previews(preview_processing_rx, p).await },
            );

            // preview API
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                // // todo: need to access the state - does that have to be arc?

                let preview_server = preview_api::get_preview_api_server(Arc::clone(&previews));

                println!(
                    "Preview API: http://localhost:{}",
                    preview_server.local_addr().port()
                );

                app_handle.manage(state::AppState::new(
                    Arc::clone(&previews),
                    preview_processing_tx,
                    preview_server.local_addr().to_string(),
                ));

                // todo: pass the preview api url to the tauri client
                // _app.emit_all(event, payload)

                preview_server.await?;
                Result::<_, anyhow::Error>::Ok(())
            });

            Ok(())
        })
        .run(tauri::generate_context!())
}
