use anyhow::anyhow;
use glob::{glob_with, MatchOptions};
use serde::Serialize;
use std::{
    fs::metadata,
    path::{Path, PathBuf},
    time::SystemTime,
};

#[derive(Clone, Serialize)]
pub(crate) struct RawImage {
    pub(crate) path: PathBuf,
    pub(crate) preview_path: PathBuf,
    pub(crate) created: SystemTime,
}

pub(crate) fn get_raw_images(path: &Path) -> anyhow::Result<Vec<RawImage>> {
    let glob_pattern = path.join("*.arw");
    let glob_pattern = glob_pattern
        .to_str()
        .ok_or_else(|| anyhow::anyhow!("path is not valid UTF8"))?;

    glob_with(
        glob_pattern,
        MatchOptions {
            case_sensitive: false,
            ..Default::default()
        },
    )?
    .filter_map(|p| {
        p.ok().map(|p| {
            let meta = metadata(&p)?;
            Ok(RawImage {
                preview_path: get_preview_path(&p).ok_or(anyhow!("Failed to get preview path"))?,
                path: p,
                created: meta.created()?.min(meta.modified()?),
            })
        })
    })
    .collect()
}

fn get_preview_path(path: &Path) -> Option<PathBuf> {
    let mut preview_path = path.with_extension("webp");
    let filename = preview_path.file_name()?.to_owned();
    preview_path.pop();
    preview_path.push("_preview");
    preview_path.push(filename);

    Some(preview_path)
}
