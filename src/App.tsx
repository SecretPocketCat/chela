import { useEffect, useState as useFootGun, useMemo } from "react";
import { useAsyncEffect } from "use-async-effect";
import { invoke } from "@tauri-apps/api/tauri";
import { mod } from "./math";
import { AppConfig } from "../src-tauri/bindings/AppConfig";
import { GroupedImages } from "../src-tauri/bindings/GroupedImages";
import { PreviewImage } from "./PreviewImage";
import { CullState } from "../src-tauri/bindings/CullState";

function App() {
  const [imageGroups, setImageGroups] = useFootGun<GroupedImages>();
  const [photoIndex, setPhotoIndex] = useFootGun<number>();
  const [previewUrl, setPreviewUrl] = useFootGun<string>();

  async function cullDir() {
    setImageGroups(await invoke<GroupedImages>("cull_dir"));
    setPhotoIndex(0);
  }

  const images = useMemo(() => {
    return imageGroups?.groups.flat();
  }, [imageGroups]);

  function getPhotoIndex(index: number) {
    return mod(index, images?.length || 1);
  }

  function movePhotoIndex(offset: number) {
    if (images) {
      setPhotoIndex(mod((photoIndex ?? 0) + offset, images.length));
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
      setImgCullState("selected");
      nextPhoto();
    } else if (ev.code === "Backspace") {
      ev.preventDefault();
      setImgCullState("rejected");
      nextPhoto();
    } else if (ev.code === "Delete") {
      ev.preventDefault();
      setImgCullState("rejected");
      prevPhoto();
    }
  }

  function setImgCullState(state: CullState) {
    if (images && photoIndex != undefined) {
      images[photoIndex].state = state;
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  useAsyncEffect(async () => {
    const conf = await invoke<AppConfig>("get_config");
    setPreviewUrl(conf.previewApiUrl);
  }, []);

  return (
    <div className="tw-flex tw-overflow-hidden tw-h-full tw-p-4">
      {images?.length && previewUrl && photoIndex !== undefined ? (
        <div className="tw-grid tw-gap-y-6 chela--cull-layout">
          <div className="tw-flex tw-w-full tw-h-full tw-justify-center tw-items-center">
            <div className="chela--imgs-grid tw-relative tw-grid tw-gap-x-8 tw-w-full tw-h-full">
              {/* Previous preview */}

              <PreviewImage
                baseUrl={previewUrl}
                image={images[getPhotoIndex(photoIndex - 1)]}
                active={false}
                key={getPhotoIndex(photoIndex - 1)}
                thumbnail={false}
              />

              {/* Processed preview */}
              <PreviewImage
                baseUrl={previewUrl}
                image={images[getPhotoIndex(photoIndex)]}
                active={true}
                key={getPhotoIndex(photoIndex)}
                thumbnail={false}
              />

              {/* Next preview */}
              <PreviewImage
                baseUrl={previewUrl}
                image={images[getPhotoIndex(photoIndex + 1)]}
                active={false}
                key={getPhotoIndex(photoIndex + 1)}
                thumbnail={false}
              />
            </div>
          </div>

          {/* img thumbnails */}
          {/* todo: fill height */}
          <div className="tw-h-full tw-flex tw-flex-wrap tw-overflow-hidden tw-gap-x-3">
            {new Array(Math.min(25, images.length)).fill(0).map((_, i) => (
              <PreviewImage
                baseUrl={previewUrl}
                image={images[getPhotoIndex(photoIndex + i)]}
                active={i === 0}
                key={getPhotoIndex(photoIndex + i)}
                thumbnail={true}
              />
            ))}
          </div>
        </div>
      ) : (
        <button onClick={cullDir}>Cull dir</button>
      )}
    </div>
  );
}

export default App;
