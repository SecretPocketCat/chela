use crate::image::{PreviewMap, RawImage};

pub(super) struct AppState {
    previews: PreviewMap,
    gen_previews_tx: tokio::sync::Mutex<tokio::sync::mpsc::Sender<Vec<RawImage>>>,
    preview_api_url: String,
}

impl AppState {
    pub fn new(
        previews: PreviewMap,
        gen_previews_tx: tokio::sync::mpsc::Sender<Vec<RawImage>>,
        preview_api_url: String,
    ) -> Self {
        Self {
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
    ) -> &tokio::sync::Mutex<tokio::sync::mpsc::Sender<Vec<RawImage>>> {
        &self.gen_previews_tx
    }

    pub(super) fn preview_api_url(&self) -> &str {
        &self.preview_api_url
    }
}
