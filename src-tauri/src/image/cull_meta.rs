use super::CullState;
use serde::{Deserialize, Serialize};
use std::path::Path;

pub(crate) const META_EXT: &str = "cull.json";

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CullMeta {
    pub(crate) cull_state: CullState,
}

pub(crate) async fn read_cull_meta_or_default(path: impl AsRef<Path>) -> CullMeta {
    tokio::fs::read_to_string(path.as_ref()).await.map_or_else(
        |_| CullMeta::default(),
        |m| serde_json::from_str(&m).unwrap_or_default(),
    )
}
