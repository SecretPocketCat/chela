#![allow(clippy::used_underscore_binding)] // tauri commands fail this lint

use std::{collections::HashMap, path::PathBuf};

use tokio::sync::RwLock;

use super::state::AppState;
use crate::image::{get_raw_images, read_cull_meta_or_default, CullState, Image, META_EXT};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(super) struct AppConfig {
    preview_api_url: String,
}

#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(super) struct GroupedImages {
    groups: Vec<Vec<Image>>,
}

#[derive(Deserialize, TS)]
#[ts(export)]
pub(super) struct CulledImages(HashMap<PathBuf, CullState>);

#[tauri::command]
pub(super) async fn get_config(app_state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    Ok(AppConfig {
        preview_api_url: app_state.preview_api_url().to_owned(),
    })
}

#[tauri::command]
pub(super) async fn cull_images(culled: CulledImages) -> Result<(), String> {
    // todo: join all writes (parallel using tokio)
    // todo: first read meta (should already exist from preview gen)
    // todo: update state & write the files back

    for (mut path, state) in culled.0 {
        path.set_extension(META_EXT);

        let mut cull_meta = read_cull_meta_or_default(&path).await;

        if cull_meta.cull_state != state {
            cull_meta.cull_state = state;
            tokio::fs::write(
                path,
                serde_json::to_vec_pretty(&cull_meta).map_err(|e| e.to_string())?,
            )
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// the cmd has to be is async to start on a different thread
// blocking file dalog would otherwise block main thread
#[tauri::command]
pub(super) async fn open_dir(
    window: tauri::Window,
    app_state: tauri::State<'_, AppState>,
) -> Result<GroupedImages, String> {
    let dir = tauri::api::dialog::blocking::FileDialogBuilder::default()
        .set_title("Select culled folder")
        // set the parent to force focus on the dialog
        // this will block interaction with the app until the dialog is closed
        .set_parent(&window)
        // todo: conf
        .set_directory("D:\\Photos\\Culling")
        .pick_folder();

    match dir {
        Some(p) => {
            let mut images = get_raw_images(&p).await.map_err(|e| e.to_string())?;

            if images.is_empty() {
                return Err("No images".to_owned());
            }

            // sort by creation
            images.sort_by(|a, b| a.created.cmp(&b.created));

            // reset current previews
            let mut previews = app_state.previews().write().await;
            previews.clear();
            previews.extend(images.iter().map(|img| {
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
                .send(images.clone().into())
                .await
                .map_err(|e| e.to_string())?;

            // group images
            let mut groups = Vec::new();
            let mut curr_group: Vec<Image> = Vec::new();

            for img in images {
                match curr_group.last() {
                    Some(last) => {
                        // todo: config
                        if (img.created - last.created).num_milliseconds() > 3000 {
                            groups.push(curr_group);
                            curr_group = Vec::new();
                        }

                        curr_group.push(img);
                    }
                    None => {
                        curr_group.push(img);
                    }
                }
            }

            if !curr_group.is_empty() {
                groups.push(curr_group);
            }

            Ok(GroupedImages { groups })
        }
        None => Err("Dialog was closed".to_owned()),
    }
}
