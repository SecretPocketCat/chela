use std::{collections::VecDeque, path::PathBuf};

use crate::image::{Image, PreviewMap};

pub(super) struct AppState {
    previews: PreviewMap,
    dir: tokio::sync::Mutex<Option<PathBuf>>,
    gen_previews_tx: tokio::sync::Mutex<tokio::sync::mpsc::Sender<VecDeque<Image>>>,
    preview_api_url: String,
}

impl AppState {
    pub fn new(
        previews: PreviewMap,
        gen_previews_tx: tokio::sync::mpsc::Sender<VecDeque<Image>>,
        preview_api_url: String,
    ) -> Self {
        Self {
            dir: tokio::sync::Mutex::new(None),
            previews,
            gen_previews_tx: tokio::sync::Mutex::new(gen_previews_tx),
            preview_api_url,
        }
    }

    pub(super) fn previews(&self) -> &PreviewMap {
        &self.previews
    }

    pub(super) fn gen_previews_tx(
        &self,
    ) -> &tokio::sync::Mutex<tokio::sync::mpsc::Sender<VecDeque<Image>>> {
        &self.gen_previews_tx
    }

    pub(super) fn preview_api_url(&self) -> &str {
        &self.preview_api_url
    }

    pub(super) fn dir(&self) -> &tokio::sync::Mutex<Option<PathBuf>> {
        &self.dir
    }
}
