use tokio::sync::RwLock;

use super::state::AppState;
use crate::image::{get_raw_images, RawImage};

#[derive(serde::Serialize)]
pub(super) struct AppConfig {
    preview_api_url: String,
}

#[tauri::command]
pub(super) async fn get_config(app_state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    Ok(AppConfig {
        preview_api_url: app_state.preview_api_url().to_owned(),
    })
}

// the cmd has to be is async to start on a different thread
// blocking file dalog would otherwise block main thread
#[tauri::command]
pub(super) async fn cull_dir(
    window: tauri::Window,
    app_state: tauri::State<'_, AppState>,
) -> Result<Vec<RawImage>, String> {
    let dir = tauri::api::dialog::blocking::FileDialogBuilder::default()
        .set_title("Select culled folder")
        // set the parent to force focus on the dialog
        // this will block interaction with the app until the dialog is closed
        .set_parent(&window)
        // todo: conf
        .set_directory("D:\\Photos\\Culling")
        .pick_folder();

    // let dir = Some(PathBuf::from(
    //     "D:\\Photos\\Culling\\Sony_29_9_2023\\100MSDCF",
    // ));

    match dir {
        Some(p) => {
            let mut paths = get_raw_images(&p).map_err(|_| "Failed to get raw paths".to_owned())?;

            // sort by creation
            paths.sort_by(|a, b| a.created.cmp(&b.created));

            // reset current previews
            let mut previews = app_state.previews().write().await;
            previews.clear();
            previews.extend(paths.iter().map(|img| {
                (
                    img.preview_path.clone(),
                    RwLock::new(if img.preview_path.exists() {
                        None
                    } else {
                        Some(tokio::sync::Notify::new())
                    }),
                )
            }));

            // start gen
            app_state
                .gen_previews_tx()
                .lock()
                .await
                .send(paths.clone())
                .await
                .map_err(|e| e.to_string())?;

            Ok(paths)
        }
        None => Err("Dialog was closed".to_owned()),
    }
}
