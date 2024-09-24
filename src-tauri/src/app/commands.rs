#![allow(clippy::used_underscore_binding)] // tauri commands fail this lint

use std::{collections::HashMap, path::PathBuf, str::FromStr};

use chrono::Datelike;
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
pub(super) struct ImageDir {
    images: Vec<Image>,
    path: PathBuf,
    dir_name: String,
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

#[tauri::command]
pub(super) async fn finish_culling(
    app_state: tauri::State<'_, AppState>,
    edit_dir: String,
) -> Result<(), String> {
    let dir_path = app_state
        .dir()
        .lock()
        .await
        .clone()
        .ok_or_else(|| "Dir not selected".to_owned())?;

    let imgs = get_raw_images(&dir_path).await.map_err(|e| e.to_string())?;

    if imgs.is_empty() {
        return Err("No images to process".to_owned());
    }

    // check all imgs have state
    if imgs.iter().any(|img| img.state == CullState::New) {
        return Err("Some images are not processed".to_owned());
    }

    let min_created = imgs
        .iter()
        .min_by(|a, b| a.created.cmp(&b.created))
        .expect("There's at least 1 img")
        .created
        .date_naive();

    // todo: config
    let mut edit_root = PathBuf::from_str("W:\\Photos\\Edit").map_err(|e| e.to_string())?;
    // year
    edit_root.push(min_created.year().to_string());
    // quarter
    edit_root.push(format!("Q{}", min_created.month() / 4 + 1));
    // named dir
    edit_root.push(edit_dir.clone());

    let mut task_set = tokio::task::JoinSet::new();

    for img in imgs {
        let cull_meta = read_cull_meta_or_default(&img.preview_path.with_extension(META_EXT)).await;

        match cull_meta.cull_state {
            // already handled above
            CullState::New => {}
            // move accepted imgs to an edit folder
            CullState::Selected => {
                let to = edit_root.join(
                    img.path
                        .file_name()
                        .ok_or_else(|| format!("Invalid filename {:?}", img.path))?,
                );

                task_set.spawn(async move {
                    tokio::fs::create_dir_all(
                        &to.parent().ok_or_else(|| "Invalid path".to_owned())?,
                    )
                    .await
                    .map_err(|e| e.to_string())?;

                    tokio::fs::rename(img.path, to)
                        .await
                        .map_err(|e| e.to_string())
                });
            }
            // trash rejected imgs
            CullState::Rejected => {
                trash::delete(&img.path).map_err(|e| e.to_string())?;
            }
        }
    }

    // wait for async FS changes
    while let Some(res) = task_set.join_next().await {
        let _ = res.map_err(|e| e.to_string())?;
    }

    // delete dir (incl. cull meta and previews)
    tokio::fs::remove_dir_all(&dir_path)
        .await
        .map_err(|e| e.to_string())?;

    app_state.dir().lock().await.take();

    Ok(())
}

// the cmd has to be is async to start on a different thread
// blocking file dalog would otherwise block main thread
#[tauri::command]
pub(super) async fn open_dir_picker(
    window: tauri::Window,
    app_state: tauri::State<'_, AppState>,
) -> Result<ImageDir, String> {
    let dir = tauri::api::dialog::blocking::FileDialogBuilder::default()
        .set_title("Select culled folder")
        // set the parent to force focus on the dialog
        // this will block interaction with the app until the dialog is closed
        .set_parent(&window)
        // todo: conf
        .set_directory("D:\\Photos\\Culling")
        .pick_folder();

    match dir {
        Some(p) => open_img_dir(p, app_state).await,
        None => Err("Dialog was closed".to_owned()),
    }
}

#[tauri::command]
pub(super) async fn open_dir(
    app_state: tauri::State<'_, AppState>,
    path: String,
) -> Result<ImageDir, String> {
    let path: PathBuf = path.into();
    if !path.is_dir() {
        return Err(format!("Path '{path:?}' is not a directory"));
    }

    match path.try_exists() {
        Ok(true) => open_img_dir(path, app_state).await,
        Ok(false) => Err(format!("Path '{path:?}' does not exist")),
        Err(e) => Err(e.to_string()),
    }
}

async fn open_img_dir(
    path: PathBuf,
    app_state: tauri::State<'_, AppState>,
) -> Result<ImageDir, String> {
    let mut images = get_raw_images(&path).await.map_err(|e| e.to_string())?;

    if images.is_empty() {
        return Err("No images".to_owned());
    }

    // set dir
    *app_state.dir().lock().await = Some(path.clone());

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

    Ok(ImageDir {
        images,
        dir_name: path
            .file_name()
            .expect("Path is valid")
            .to_str()
            .expect("Path has a valid directory")
            .to_owned(),
        path,
    })
}
