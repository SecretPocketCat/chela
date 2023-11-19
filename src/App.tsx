import { useEffect, useState as useFootGun } from "react";
import { useAsyncEffect } from "use-async-effect";
import { invoke } from "@tauri-apps/api/tauri";
import { mod } from "./math";

function App() {
  const [photos, setPhotos] = useFootGun<any[]>();
  const [photoIndex, setPhotoIndex] = useFootGun<number>();
  const [previewUrl, setPreviewUrl] = useFootGun<string>();

  async function cullDir() {
    const culledPhotos = await invoke<any[]>("cull_dir");
    setPhotos(culledPhotos);
    setPhotoIndex(0);
    console.warn(culledPhotos);
  }

  function getPhotoUrl(index: number) {
    console.warn("index", getPhotoIndex(index));
    return previewUrl && photos
      ? `http://${previewUrl}/preview?path=${encodeURIComponent(
          photos[getPhotoIndex(index)].preview_path
        )}`
      : undefined;
  }

  function getPhotoIndex(index: number) {
    return mod(index, photos?.length || 1);
  }

  function movePhotoIndex(offset: number) {
    if (photos) {
      setPhotoIndex(mod((photoIndex ?? 0) + offset, photos.length));
    }
  }

  function nextPhoto() {
    movePhotoIndex(1);
  }

  function prevPhoto() {
    movePhotoIndex(-1);
  }

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.code === "ArrowLeft") {
      ev.preventDefault();
      prevPhoto();
    } else if (ev.code === "ArrowRight") {
      ev.preventDefault();
      nextPhoto();
    } else if (ev.code === "Space") {
      ev.preventDefault();
      nextPhoto();
    } else if (ev.code === "Backspace") {
      ev.preventDefault();
      nextPhoto();
    } else if (ev.code === "Delete") {
      ev.preventDefault();
      prevPhoto();
    }

    console.warn(ev.code);
  }

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  // todo: this reruns on every render - redo
  useAsyncEffect(async () => {
    const conf = await invoke<any>("get_config");
    console.warn("conf", conf);
    setPreviewUrl(conf.preview_api_url);
  });

  return (
    <div className="flex gap-6">
      {photoIndex !== undefined ? (
        <>
          <img
            src={getPhotoUrl(photoIndex)}
            className="object-contain max-h-[95vh]"
          />
          <img
            src={getPhotoUrl(photoIndex + 1)}
            className="object-contain  max-h-[95vh]"
          />
        </>
      ) : undefined}

      <button type="submit" onClick={cullDir}>
        Cull dir
      </button>
    </div>
  );
}

export default App;
