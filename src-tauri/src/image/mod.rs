use chrono::prelude::*;
use serde::Serialize;
use std::path::PathBuf;
use ts_rs::TS;

mod preview;
mod raw;

#[derive(Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct Image {
    pub(crate) path: PathBuf,
    pub(crate) preview_path: PathBuf,
    pub(crate) created: DateTime<Utc>,
    pub(crate) state: CullState,
}

#[derive(Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) enum CullState {
    New,
    Selected,
    Rejected,
}

pub(crate) use preview::{process_previews, PreviewMap};
pub(crate) use raw::get_raw_images;
