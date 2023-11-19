use tauri::Manager;

use crate::{image::process_previews, preview_api};
use std::{collections::HashMap, sync::Arc};

mod commands;
mod state;

pub(crate) fn run_app() -> tauri::Result<()> {
    let (preview_processing_tx, preview_processing_rx) = tokio::sync::mpsc::channel(1);
    let previews = Arc::new(tokio::sync::RwLock::new(HashMap::with_capacity(500)));

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::cull_dir
        ])
        .setup(|app| {
            // preview processing
            // use a channel to report processing progress?
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

                preview_server.await?;
                Result::<_, anyhow::Error>::Ok(())
            });

            Ok(())
        })
        .run(tauri::generate_context!())
}
