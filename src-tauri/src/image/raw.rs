use super::{read_cull_meta_or_default, Image, META_EXT};
use anyhow::anyhow;
use glob::{glob_with, MatchOptions};
use std::path::{Path, PathBuf};
use tokio_stream::StreamExt;

pub(crate) async fn get_raw_images(path: &Path) -> anyhow::Result<Vec<Image>> {
    let glob_pattern = path.join("**/*.arw");
    let glob_pattern = glob_pattern
        .to_str()
        .ok_or_else(|| anyhow::anyhow!("path is not valid UTF8"))?;

    let paths = glob_with(
        glob_pattern,
        MatchOptions {
            case_sensitive: false,
            ..Default::default()
        },
    )?;
    let mut res = Vec::with_capacity(paths.size_hint().0);
    let mut stream = tokio_stream::iter(paths);

    // todo: use join set instead?
    while let Some(p) = stream.next().await {
        let p = p?;
        let preview_path = get_preview_path(&p).ok_or(anyhow!("Failed to get preview path"))?;
        let (meta, cull_meta) = tokio::join!(
            tokio::fs::metadata(&p),
            read_cull_meta_or_default(preview_path.with_extension(META_EXT))
        );

        let meta = meta?;

        res.push(Image {
            preview_path,
            path: p,
            created: meta.created()?.min(meta.modified()?).into(),
            // todo: get serialized state - DB or maybe just a json/toml?
            state: cull_meta.cull_state,
        });
    }

    Ok(res)
}

fn get_preview_path(path: &Path) -> Option<PathBuf> {
    let mut preview_path = path.with_extension("webp");
    let filename = preview_path.file_name()?.to_owned();
    preview_path.pop();
    preview_path.push("_cull");
    preview_path.push(filename);

    Some(preview_path)
}
