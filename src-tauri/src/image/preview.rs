use super::raw::RawImage;
use anyhow::{anyhow, Context};
use std::{
    collections::HashMap, fs::create_dir_all, os::windows::process::CommandExt, path::PathBuf,
    process::Command, sync::Arc,
};
use tokio::sync::Notify;

pub(crate) type PreviewMap = Arc<tokio::sync::Mutex<HashMap<PathBuf, PreviewGenStatus>>>;

pub(crate) enum PreviewGenStatus {
    Generated,
    // todo: Notify comes from tokio and could be used to await completion
    // when a processing preview is requested
    // https://docs.rs/tokio/latest/tokio/sync/struct.Notify.html
    Processing(Notify),
}

pub(crate) fn create_preview(raw_img: RawImage) -> anyhow::Result<()> {
    if !raw_img.preview_path.exists() {
        let dir = raw_img
            .preview_path
            .parent()
            .ok_or(anyhow::anyhow!("Invalid raw img path: no parent"))?;

        if !dir.exists() {
            create_dir_all(dir)?;
        }

        Command::new("magick")
            .raw_arg(format!(
                "\"{}\"",
                raw_img
                    .path
                    .to_str()
                    .ok_or(anyhow!("Invalid raw img path {:?}", raw_img.path))?
            ))
            .arg("-auto-orient")
            .arg("-resize")
            .arg("2000x1400>")
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
            .context(format!(
                "Failed to generate preview {:?}",
                raw_img.preview_path
            ))?;
    }

    Ok(())
}

pub(crate) async fn process_previews(
    mut input_rx: tokio::sync::mpsc::Receiver<Vec<RawImage>>,
) -> Result<(), anyhow::Error> {
    // leave 3 cores available
    let thread_count = (num_cpus::get_physical() - 3).max(1);
    let thread_pool = rayon::ThreadPoolBuilder::new()
        .num_threads(thread_count)
        .build()?;

    while let Some(mut imgs) = input_rx.recv().await {
        // also should just use a part of cores, not all to allow the PC to be usable
        thread_pool.scope_fifo(|x| {
            while let Some(img) = imgs.pop() {
                x.spawn_fifo(move |_| {
                    // todo: handle err properly
                    create_preview(img).unwrap();

                    // todo: this needs to notify all
                    // and then change the state to generated
                });
            }
        });
    }

    Ok(())
}
