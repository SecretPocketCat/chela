import { useEffect, useMemo, useState } from "react";
import { mod } from "../utils/math";
import { GroupedImages } from "../../src-tauri/bindings/GroupedImages";
import { PreviewImage } from "./PreviewImage";
import { ProgressBar } from "./ProgressBar";
import { CullState } from "../../src-tauri/bindings/CullState";
import { Image } from "../../src-tauri/bindings/Image";
import { useSetAtom } from "jotai";
import { titleAtom } from "../store/navStore";

export function CullScreen({ groupedImages }: { groupedImages: GroupedImages }) {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [groupedImages]);

  const images = useMemo(() => {
    return groupedImages.groups.flat();
  }, [groupedImages]);

  // kbd bindings
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

  // groups
  const visibleGroups = useMemo(() => {
    const res: Image[][] = [];
    let imgTreshold = Math.min(25, images.length);

    function addGroups(fill: boolean) {
      let currentImgInd = 0;

      for (let i = 0; i < groupedImages.groups.length; i++) {
        const g = groupedImages.groups[i];
        const imgGroupIndex = imageIndex - currentImgInd;
        const prevThumbnailsCount = 10;

        if ((!fill && imgGroupIndex < g.length) || (fill && imgGroupIndex >= g.length)) {
          // limit the group size if the selected image (first group) wouldn't be visible
          const sliceFrom =
            res.length == 0
              ? Math.max(
                  0,
                  // show N previous thumbnails from the current group
                  imgGroupIndex - prevThumbnailsCount,
                )
              : 0;
          // clamp to treshold
          const clampedGroup = g.slice(sliceFrom, sliceFrom + imgTreshold);
          res.push(clampedGroup);
          imgTreshold -= clampedGroup.length;
        }

        if (imgTreshold <= 0) {
          break;
        }

        currentImgInd += g.length;
      }
    }

    addGroups(false);
    if (imgTreshold > 0) {
      addGroups(true);
    }

    return res.filter((g) => g.length);
  }, [images, groupedImages, imageIndex]);

  return (
    <div className="tw-grid tw-w-full chela--cull-layout">
      <div className="tw-flex tw-w-full tw-h-full tw-justify-center tw-items-center tw-py-3 tw-px-4">
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
      <div className="tw-h-full tw-flex tw-overflow-hidden tw-gap-x-5 tw-px-4 tw-pb-2">
        {visibleGroups.map((g, groupInd) => (
          <div
            className={`tw-h-full tw-flex tw-flex-shrink-0 tw-gap-x-1.5 tw-rounded-md tw-overflow-hidden ${
              g.length > 1
                ? "tw-bg-border tw-border-4 tw-border-border-light tw-p-1.5"
                : "tw-py-2"
            }`}
            key={g[0].path}
          >
            {g.map((img, imgInd) => {
              return (
                <PreviewImage
                  image={img}
                  active={images.indexOf(img) === imageIndex}
                  key={img.path}
                  thumbnail
                  grouped={g.length > 1}
                  className={`g:${groupInd}, img:${imgInd}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <ProgressBar images={images} />
    </div>
  );
}
