use super::{read_cull_meta_or_default, Image, META_EXT};
use anyhow::anyhow;
use std::path::{Path, PathBuf};
use tokio_stream::StreamExt;

pub(crate) async fn get_images(path: &Path) -> anyhow::Result<Vec<Image>> {
    let paths = globwalk::GlobWalkerBuilder::from_patterns(path, &["*.arw"])
        .case_insensitive(true)
        .build()?
        .into_iter();
    let mut paths = paths.peekable();
    if paths.peek().is_none() {
        // no raw imgs, look for jpgs and pngs
        paths = globwalk::GlobWalkerBuilder::from_patterns(path, &["*.jpg", "*.jpeg", "*.png"])
            .case_insensitive(true)
            .build()?
            .into_iter()
            .peekable();
    }

    let mut res = Vec::with_capacity(paths.size_hint().0);
    let mut stream = tokio_stream::iter(paths);

    // todo: use join set instead?
    while let Some(entry) = stream.next().await {
        let entry = entry?;
        if entry.file_type().is_dir() {
            continue;
        }
        let p = entry.into_path();

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
