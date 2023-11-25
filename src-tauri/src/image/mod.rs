use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use ts_rs::TS;

mod cull_meta;
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

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) enum CullState {
    #[default]
    New,
    Selected,
    Rejected,
}

pub(crate) use cull_meta::*;
pub(crate) use preview::{process_previews, PreviewMap};
pub(crate) use raw::get_raw_images;
