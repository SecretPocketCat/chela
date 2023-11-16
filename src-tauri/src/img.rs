use anyhow::{anyhow, Context};
use glob::{glob_with, MatchOptions};
use serde::Serialize;
use std::{
    fs::{create_dir, create_dir_all, metadata},
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::Command,
    time::{Instant, SystemTime},
};

#[derive(Clone, Serialize)]
pub(crate) struct RawImg {
    pub(crate) path: PathBuf,
    pub(crate) preview_path: PathBuf,
    pub(crate) created: SystemTime,
}

pub(crate) fn get_raw_img_paths(path: &Path) -> anyhow::Result<Vec<RawImg>> {
    let glob_pattern = path.join("*.arw");
    let glob_pattern = glob_pattern
        .to_str()
        .ok_or_else(|| anyhow::anyhow!("path is not valid UTF8"))?;

    glob_with(
        &glob_pattern,
        MatchOptions {
            case_sensitive: false,
            ..Default::default()
        },
    )?
    .map(|p| {
        p.ok().map(|p| {
            Ok(RawImg {
                path: p.clone(),
                preview_path: get_preview_path(&p).ok_or(anyhow!("Failed to get preview path"))?,
                created: metadata(p)?.created()?,
            })
        })
    })
    .filter_map(|x| x)
    .collect()
}

// todo: use error handling (anyhow?)
pub(crate) fn create_preview(raw_img: RawImg) -> anyhow::Result<()> {
    if !raw_img.preview_path.exists() {
        let dir = raw_img
            .preview_path
            .parent()
            .ok_or(anyhow::anyhow!("Invalid raw img path: no parent"))?;

        if !dir.exists() {
            create_dir_all(dir)?;
        }

        // todo: compare how long webp and avif take?
        Command::new("magick")
            .raw_arg(format!(
                "\"{}\"",
                raw_img
                    .path
                    .to_str()
                    .ok_or(anyhow!("Invalid raw img path"))?
            ))
            .arg("-quality")
            .arg(75.to_string())
            .arg("-auto-orient")
            .arg("-resize")
            .arg("2000x1400>")
            // todo: check whether making it single-threaded makes a difference
            .arg("-limit")
            .arg("thread")
            .arg(1.to_string())
            .raw_arg(format!(
                "\"{}\"",
                raw_img
                    .preview_path
                    .to_str()
                    .ok_or(anyhow!("Invalid preview path"))?
            ))
            .status()
            .context("Failed to generate jpg")?;
    }

    Ok(())
}

fn get_preview_path(path: &Path) -> Option<PathBuf> {
    let mut preview_path = path.with_extension("jpg");
    let filename = preview_path.file_name()?.to_owned();
    preview_path.pop();
    preview_path.push("_preview");
    preview_path.push(filename);

    Some(preview_path)
}
