#[cfg(debug_assertions)]
use tauri::LogicalSize;
use tauri::Manager;

use crate::{image::process_previews, preview_api};
use std::{collections::HashMap, sync::Arc};

mod commands;
mod state;

pub(crate) fn run_app() -> tauri::Result<()> {
    let (preview_processing_tx, preview_processing_rx) = tokio::sync::mpsc::channel(1);
    let previews = Arc::new(tokio::sync::RwLock::new(HashMap::with_capacity(500)));

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::open_dir,
            commands::open_dir_picker,
            commands::cull_images,
            commands::finish_culling,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                // open devtools (for debug builds only)
                if let Some(win) = app.windows().values().next() {
                    let height = win.outer_size()?.to_logical(win.scale_factor()?).height;
                    win.set_size(LogicalSize::new(1900, height))?;
                    win.open_devtools();
                }
            }

            // preview processing
            // use a channel to report processing progress?
            let p = Arc::clone(&previews);
            tauri::async_runtime::spawn(
                async move { process_previews(preview_processing_rx, p).await },
            );

            // preview API
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                let (address, preview_server) =
                    preview_api::get_preview_api_server(Arc::clone(&previews)).await;

                println!("Preview API: http://localhost:{}", address.port());

                app_handle.manage(state::AppState::new(
                    Arc::clone(&previews),
                    preview_processing_tx,
                    address.to_string(),
                ));

                preview_server.await?;
                Result::<_, anyhow::Error>::Ok(())
            });

            Ok(())
        })
        .run(tauri::generate_context!())
}
