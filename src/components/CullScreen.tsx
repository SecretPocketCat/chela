import { useEffect, useMemo, useState } from "react";
import { mod } from "../utils/math";
import { GroupedImages } from "../../src-tauri/bindings/GroupedImages";
import { PreviewImage } from "./PreviewImage";
import { ProgressBar } from "./ProgressBar";
import { CullState } from "../../src-tauri/bindings/CullState";
import { useSetAtom } from "jotai";
import { titleAtom } from "../store/navStore";

export function CullScreen({ groupedImages }: { groupedImages: GroupedImages }) {
  const [imageIndex, setImageIndex] = useState(0);

  const images = useMemo(() => {
    return groupedImages?.groups.flat();
  }, [groupedImages]);

  function getImageIndex(index: number) {
    return mod(index, images.length || 1);
  }

  function moveImageIndex(offset: number) {
    setImageIndex(mod((imageIndex ?? 0) + offset, images.length));
  }

  function nextImage() {
    moveImageIndex(1);
  }

  function prevImage() {
    moveImageIndex(-1);
  }

  // todo: add tab + tab+Shift & group bindings with shift
  function onKeyDown(ev: KeyboardEvent) {
    if (ev.code === "ArrowLeft") {
      ev.preventDefault();
      prevImage();
    } else if (ev.code === "ArrowRight") {
      ev.preventDefault();
      nextImage();
    } else if (ev.code === "Space") {
      ev.preventDefault();
      setImgCullState("selected");
      nextImage();
    } else if (ev.code === "Backspace") {
      ev.preventDefault();
      setImgCullState("rejected");
      nextImage();
    } else if (ev.code === "Delete") {
      ev.preventDefault();
      setImgCullState("rejected");
      prevImage();
    }
  }

  function setImgCullState(state: CullState) {
    images[imageIndex].state = state;
  }

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  // title
  const setTitle = useSetAtom(titleAtom);
  useEffect(() => {
    setTitle(`${imageIndex + 1}/${images.length}`);
  }, [images.length, imageIndex, setTitle]);

  return (
    <div className="tw-grid tw-gap-y-2 tw-w-full chela--cull-layout">
      <div className="tw-flex tw-w-full tw-h-full tw-justify-center tw-items-center tw-py-3  tw-px-4">
        <div className="chela--imgs-grid tw-relative tw-grid tw-gap-x-8 tw-w-full tw-h-full">
          {/* Previous preview */}
          {images.length >= 3 ? (
            <PreviewImage
              image={images[getImageIndex(imageIndex - 1)]}
              active={false}
              key={getImageIndex(imageIndex - 1)}
              thumbnail={false}
            />
          ) : (
            <div></div>
          )}

          {/* Processed preview */}
          <PreviewImage
            image={images[getImageIndex(imageIndex)]}
            active={true}
            key={getImageIndex(imageIndex)}
            thumbnail={false}
          />

          {/* Next preview */}
          {images.length >= 2 ? (
            <PreviewImage
              image={images[getImageIndex(imageIndex + 1)]}
              active={false}
              key={getImageIndex(imageIndex + 1)}
              thumbnail={false}
            />
          ) : (
            <div></div>
          )}
        </div>
      </div>

      {/* img thumbnails */}
      {/* todo: groups */}
      <div className="tw-h-full tw-flex tw-flex-wrap tw-overflow-hidden tw-gap-x-3 tw-px-4">
        {new Array(Math.min(25, images.length)).fill(0).map((_, i) => (
          <PreviewImage
            image={images[getImageIndex(imageIndex + i)]}
            active={i === 0}
            key={getImageIndex(imageIndex + i)}
            thumbnail={true}
          />
        ))}
      </div>

      <ProgressBar images={images} />
    </div>
  );
}
