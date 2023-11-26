import { useEffect, useMemo, useState } from "react";
import { mod } from "../utils/math";
import { GroupedImages } from "../../src-tauri/bindings/GroupedImages";
import { CulledImages } from "../../src-tauri/bindings/CulledImages";
import { PreviewImage } from "./PreviewImage";
import { ProgressBar } from "./ProgressBar";
import { CullState } from "../../src-tauri/bindings/CullState";
import { Image } from "../../src-tauri/bindings/Image";
import { useSetAtom } from "jotai";
import { titleAtom } from "../store/navStore";
import { invoke } from "@tauri-apps/api";
import { forgetFnReturn } from "../utils/function";
import { BoundaryIcon } from "./BoundaryIcon";

export function CullScreen({ groupedImages }: { groupedImages: GroupedImages }) {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [groupedImages]);

  const images = useMemo(() => {
    return groupedImages.groups.flat();
  }, [groupedImages]);

  // kbd bindings
  async function onKeyDown(ev: KeyboardEvent) {
    const groupBinding = ev.shiftKey;

    if (ev.code === "ArrowLeft") {
      ev.preventDefault();
      prevImage(groupBinding);
    } else if (ev.code === "ArrowRight") {
      ev.preventDefault();
      nextImage(groupBinding);
    } else if (ev.code === "Tab") {
      ev.preventDefault();
      if (ev.shiftKey) {
        prevImage(false);
      } else {
        nextImage(false);
      }
    } else if (ev.code === "Space") {
      ev.preventDefault();
      await setImgCullState("selected", groupBinding);
      nextImage(groupBinding);
    } else if (ev.code === "Backspace") {
      ev.preventDefault();
      await setImgCullState("rejected", false);
      nextImage(false);
    } else if (ev.code === "Delete") {
      ev.preventDefault();
      await setImgCullState("rejected", false);
      prevImage(false);
    }
  }

  function getImageIndex(index: number) {
    return mod(index, images.length || 1);
  }

  function moveImageIndex(offset: number, group: boolean) {
    let imgIndex = imageIndex;

    if (group) {
      // use the group start or end image index
      // by offsetting that the selected image moves to the next/previous group
      imgIndex =
        offset > 0
          ? selectedGroupIndices.endImageIndex
          : selectedGroupIndices.startImageIndex;
    }

    setImageIndex(mod((imgIndex ?? 0) + offset, images.length));
  }

  function nextImage(group: boolean) {
    moveImageIndex(1, group);
  }

  function prevImage(group: boolean) {
    moveImageIndex(-1, group);
  }

  async function setImgCullState(state: CullState, group: boolean) {
    const img = images[imageIndex];
    img.state = state;

    const culled: CulledImages = {
      [img.previewPath]: state,
    };

    if (group) {
      // set all unculled group imgs to rejected
      groupedImages.groups[selectedGroupIndices.groupIndex]
        .filter((img) => img.state === "new")
        .forEach((img) => {
          img.state = "rejected";
          culled[img.previewPath] = img.state;
        });
    }

    await invoke<void>("cull_images", {
      culled,
    });
  }

  useEffect(() => {
    const handler = forgetFnReturn(onKeyDown);
    document.addEventListener("keydown", handler);

    return () => {
      document.removeEventListener("keydown", handler);
    };
  });

  // title
  const setTitle = useSetAtom(titleAtom);
  useEffect(() => {
    setTitle(`${imageIndex + 1}/${images.length}`);
  }, [images.length, imageIndex, setTitle]);

  // groups
  interface ImageIndices {
    imageIndex: number;
    groupIndex: number;
    startImageIndex: number;
    endImageIndex: number;
  }

  const imageIndicesMap = useMemo(() => {
    const res = new Map<Image, ImageIndices>();
    let imgIndex = 0;

    groupedImages.groups.forEach((g, groupIndex) => {
      const startImageIndex = imgIndex;
      const endImageIndex = imgIndex + g.length - 1;

      g.forEach((img) => {
        res.set(img, {
          imageIndex: imgIndex++,
          groupIndex,
          startImageIndex,
          endImageIndex,
        });
      });
    });

    return res;
  }, [groupedImages]);

  const selectedGroupIndices = useMemo(() => {
    return imageIndicesMap.get(images[imageIndex])!;
  }, [images, imageIndicesMap, imageIndex]);

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
            imageIndex === 0 ? (
              <BoundaryIcon start />
            ) : (
              <PreviewImage
                image={images[getImageIndex(imageIndex - 1)]}
                active={false}
                key={getImageIndex(imageIndex - 1)}
                thumbnail={false}
              />
            )
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
            imageIndex === images.length - 1 ? (
              <BoundaryIcon />
            ) : (
              <PreviewImage
                image={images[getImageIndex(imageIndex + 1)]}
                active={false}
                key={getImageIndex(imageIndex + 1)}
                thumbnail={false}
              />
            )
          ) : (
            <div></div>
          )}
        </div>
      </div>

      {/* img thumbnails */}
      <div className="tw-h-full tw-flex tw-overflow-hidden tw-gap-x-5 tw-px-4 tw-pb-2">
        {visibleGroups.map((g, groupInd) => (
          <>
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
                    active={imageIndicesMap.get(img)?.imageIndex === imageIndex}
                    key={img.path}
                    thumbnail
                    grouped={g.length > 1}
                    className={`g:${groupInd}, img:${imgInd}`}
                  />
                );
              })}
            </div>
            {imageIndicesMap.get(g[g.length - 1])?.imageIndex === images.length - 1 ? (
              <BoundaryIcon thumbnail />
            ) : undefined}
          </>
        ))}
      </div>

      <ProgressBar images={images} />
    </div>
  );
}
