use crate::image::{PreviewMap, RawImage};

pub(super) struct AppState {
    previews: PreviewMap,
    gen_previews_tx: tokio::sync::Mutex<tokio::sync::mpsc::Sender<Vec<RawImage>>>,
}

impl AppState {
    pub fn new(
        previews: PreviewMap,
        gen_previews_tx: tokio::sync::mpsc::Sender<Vec<RawImage>>,
    ) -> Self {
        Self {
            previews,
            gen_previews_tx: tokio::sync::Mutex::new(gen_previews_tx),
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
}
