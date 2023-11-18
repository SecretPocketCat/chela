use super::raw::RawImage;
use anyhow::{anyhow, Context};
use std::{
    collections::HashMap, fs::create_dir_all, os::windows::process::CommandExt, path::PathBuf,
    process::Command, sync::Arc, thread, time::Duration,
};
use tokio::sync::Notify;

pub(crate) type PreviewMap =
    Arc<tokio::sync::RwLock<HashMap<PathBuf, tokio::sync::RwLock<Option<Notify>>>>>;

// todo: don't take ownership of ram image - maybe just take &Path s for raw & preview?
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
    previews: PreviewMap,
) -> anyhow::Result<()> {
    // leave 3 cores available
    let thread_count = (num_cpus::get_physical() - 3).max(1);
    let thread_pool = rayon::ThreadPoolBuilder::new()
        .num_threads(thread_count)
        .build()?;

    while let Some(mut imgs) = input_rx.recv().await {
        // also should just use a part of cores, not all to allow the PC to be usable
        thread_pool.scope_fifo(|scope| {
            while let Some(img) = imgs.pop() {
                let previews = Arc::clone(&previews);
                scope.spawn_fifo(move |_| {
                    let path: PathBuf = img.preview_path.clone();

                    if !previews.blocking_read().contains_key(&path) {
                        // the culled dir has changed
                        // bail out early to stop the preview gen for the old dir
                        return;
                    }

                    // todo: handle err properly
                    create_preview(img).unwrap();

                    if let Some(process_notification) = previews.blocking_read().get(&path) {
                        // retry requiring the write guard to prevent deadlock if reads come
                        // before getting the write guard but after notifying current readers
                        loop {
                            match process_notification.try_write() {
                                Ok(mut notify) => {
                                    // mark as processed
                                    notify.take();
                                    break;
                                }
                                Err(_) => {
                                    // notify ongoing readers the preview is ready
                                    if let Some(notify) =
                                        process_notification.blocking_read().as_ref()
                                    {
                                        notify.notify_waiters();
                                        thread::sleep(Duration::from_millis(10));
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    }

    Ok(())
}
