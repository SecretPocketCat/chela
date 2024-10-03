use anyhow::{anyhow, Context};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::{
    collections::{HashMap, VecDeque},
    fs::create_dir_all,
    path::PathBuf,
    process::Command,
    sync::Arc,
    thread,
    time::Duration,
};
use tokio::sync::Notify;

use super::Image;

pub(crate) type PreviewMap =
    Arc<tokio::sync::RwLock<HashMap<PathBuf, tokio::sync::RwLock<Option<Notify>>>>>;

// https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags#CREATE_NO_WINDOW
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub(crate) fn create_preview(raw_img: &Image) -> anyhow::Result<()> {
    if !raw_img.preview_path.exists() {
        let dir = raw_img
            .preview_path
            .parent()
            .ok_or(anyhow::anyhow!("Invalid raw img path: no parent"))?;

        if !dir.exists() {
            create_dir_all(dir)?;
        }

        let img_path = raw_img
            .path
            .to_str()
            .ok_or(anyhow!("Invalid raw img path {:?}", raw_img.path))?;
        let preview_path = raw_img
            .preview_path
            .to_str()
            .ok_or(anyhow!("Invalid preview path"))?;
        let mut cmd = Command::new("magick");
        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(CREATE_NO_WINDOW)
                .raw_arg(format!("\"{}\"", img_path));
        }
        #[cfg(not(target_os = "windows"))]
        {
            cmd.arg(img_path);
        }
        cmd.arg("-auto-orient")
            .arg("-resize")
            .arg("2000x1400>")
            .arg("-limit")
            .arg("thread")
            .arg(1.to_string());
        #[cfg(target_os = "windows")]
        {
            cmd.raw_arg(format!("\"{}\"", preview_path))
        }
        #[cfg(not(target_os = "windows"))]
        {
            cmd.arg(preview_path);
        }
        cmd.status().context(format!(
            "Failed to generate preview {:?}",
            raw_img.preview_path
        ))?;
    }

    Ok(())
}

pub(crate) async fn process_previews(
    mut input_rx: tokio::sync::mpsc::Receiver<VecDeque<Image>>,
    previews: PreviewMap,
) -> anyhow::Result<()> {
    // leave 3 cores available
    let thread_count = (num_cpus::get_physical() - 3).max(1);
    let thread_pool = rayon::ThreadPoolBuilder::new()
        .num_threads(thread_count)
        .build()?;

    while let Some(mut imgs) = input_rx.recv().await {
        if let Some(first) = imgs.pop_back() {
            // also should just use a part of cores, not all to allow the PC to be usable
            thread_pool.scope_fifo(|scope| {
                // start with the last image which will be previewed at the start
                imgs.push_front(first);

                while let Some(img) = imgs.pop_front() {
                    let previews = Arc::clone(&previews);
                    scope.spawn_fifo(move |_| {
                        let path: PathBuf = img.preview_path.clone();

                        if !previews.blocking_read().contains_key(&path) {
                            // the culled dir has changed
                            // bail out early to stop the preview gen for the old dir
                            return;
                        }

                        create_preview(&img).unwrap_or_else(|_| {
                            panic!("Preview {:?} has failed to generate", &path)
                        });

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
    }

    Ok(())
}
