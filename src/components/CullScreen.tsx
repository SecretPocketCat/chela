import { useEffect, useMemo, useState } from "react";
import { mod } from "../utils/math";
import { ImageDir } from "../../src-tauri/bindings/ImageDir";
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
import { FinishCullDialog } from "./FinishCullDialog";
import { indexOrUndefined } from "../utils/array";
import { useSuccessToast, useErrorToast } from "../hooks/toast";
import { FaChevronDown } from "react-icons/fa";

export type ImageStateMap = Map<CullState, number>;

export function CullScreen({
  imageDir,
  onCullFinished,
}: {
  imageDir: ImageDir;
  onCullFinished: () => void;
}) {
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const [imageIndex, setImageIndex] = useState(0);
  const [showRejected, setShowRejected] = useState(false);

  const images = useMemo(() => {
    return imageDir.images.flat();
  }, [imageDir]);

  function isImageVisible(image: Image, showRejected: boolean) {
    return showRejected || image.state !== "rejected";
  }

  const visibleImages = showRejected
    ? images
    : images.filter((i) => isImageVisible(i, showRejected));

  const visibleImageIndex = useMemo(() => {
    const index = indexOrUndefined(visibleImages.indexOf(images[imageIndex]));
    if (index != undefined) {
      return index;
    } else {
      const nextVisibleImg = images.find(
        (img, i) => isImageVisible(img, showRejected) && i >= imageIndex,
      );
      return nextVisibleImg ? visibleImages.indexOf(nextVisibleImg) : 0;
    }
  }, [imageIndex, images, visibleImages, showRejected]);

  useEffect(() => {
    setUnprocessedIndex();
    setImageIndex(images.findIndex((i) => i.state === "new") ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  function setUnprocessedIndex() {
    const index = images.findIndex((img, i) => i > 0 && img.state === "new") ?? 0;
    setImageIndex(index);
  }

  // kbd bindings
  const [disableCullBindings, setDisableCullBindings] = useState(false);

  async function onKeyDown(ev: KeyboardEvent) {
    if (disableCullBindings) {
      return;
    }

    if (["ArrowLeft", "KeyN"].includes(ev.code)) {
      ev.preventDefault();
      prevImage();
    } else if (["ArrowRight", "KeyO"].includes(ev.code)) {
      ev.preventDefault();
      nextImage();
    } else if (ev.code === "Tab") {
      ev.preventDefault();
      setUnprocessedIndex();
    } else if (ev.code === "Escape") {
      ev.preventDefault();
      await setImgCullState("new");
    } else if (ev.code === "Space") {
      ev.preventDefault();
      await setImgCullState("selected");
      nextImage();
    } else if (ev.code === "Backspace") {
      ev.preventDefault();
      await setImgCullState("rejected");
      nextImage();
    } else if (ev.code === "Delete") {
      ev.preventDefault();
      const rejected = !showRejected;
      setShowRejected(rejected);
      // const currImg = images[imageIndex]
      // images.filter((i) => isImageVisible(i, rejected));
      // setImageIndex();
    } else if (ev.code === "Enter") {
      ev.preventDefault();

      if (finished) {
        setShowFinishDialog(true);
      } else {
        errorToast("Not done yet", `${stateCounts.get("new")} imgs are not processed`);
      }
    }
  }

  function getVisibleImageIndex(index: number) {
    return mod(index, visibleImages.length || 1);
  }

  function moveImageIndex(offset: number) {
    setImageIndex(
      images.indexOf(
        visibleImages[mod((visibleImageIndex ?? 0) + offset, visibleImages.length)],
      ),
    );
  }

  function nextImage() {
    moveImageIndex(1);
  }

  function prevImage() {
    moveImageIndex(-1);
  }

  async function setImgCullState(state: CullState) {
    const img = images[imageIndex];
    img.state = state;

    const culled: CulledImages = {
      [img.previewPath]: state,
    };

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

  // progress
  const stateCounts: ImageStateMap = images.reduce((map, img) => {
    map.set(img.state, (map.get(img.state) ?? 0) + 1);
    return map;
  }, new Map<CullState, number>());

  // finish dialog
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  useEffect(() => {
    setDisableCullBindings(showFinishDialog);
  }, [showFinishDialog]);

  const finished = useMemo(() => !stateCounts.get("new"), [stateCounts]);

  useEffect(() => {
    if (finished) {
      successToast("Culling done");
    }
  }, [finished, successToast]);

  return (
    <div className="tw-grid tw-w-full chela--cull-layout tw-overflow-hidden">
      <div className="tw-flex tw-w-full tw-h-full tw-justify-center tw-items-center tw-py-3 tw-px-4 tw-overflow-hidden">
        <div className="chela--imgs-grid tw-relative tw-grid tw-gap-x-8 tw-w-full tw-h-full tw-overflow-hidden">
          {/* Previous preview */}
          {visibleImages.length >= 3 ? (
            visibleImageIndex < getVisibleImageIndex(visibleImageIndex - 1) ? (
              <BoundaryIcon start />
            ) : (
              <PreviewImage
                image={visibleImages[getVisibleImageIndex(visibleImageIndex - 1)]}
                active={false}
                key={getVisibleImageIndex(visibleImageIndex - 1)}
                thumbnail={false}
              />
            )
          ) : (
            <div></div>
          )}

          {/* Processed preview */}
          <PreviewImage
            image={visibleImages[getVisibleImageIndex(visibleImageIndex)]}
            active={true}
            key={getVisibleImageIndex(visibleImageIndex)}
            thumbnail={false}
          />

          {/* Next preview */}
          {images.length >= 2 ? (
            getVisibleImageIndex(visibleImageIndex + 1) < visibleImageIndex ? (
              <BoundaryIcon />
            ) : (
              <PreviewImage
                image={visibleImages[getVisibleImageIndex(visibleImageIndex + 1)]}
                active={false}
                key={getVisibleImageIndex(visibleImageIndex + 1)}
                thumbnail={false}
              />
            )
          ) : (
            <div></div>
          )}
        </div>
      </div>

      <FaChevronDown
        className="tw-absolute tw-bottom-3 tw-h-8 tw-w-8 tw-text-primary -tw-translate-x-1/2 tw-transition-all"
        style={{
          left: `${((imageIndex + 1) / imageDir.images.length) * 100}%`,
        }}
      />
      <ProgressBar stateCounts={stateCounts} />

      <FinishCullDialog
        stateCounts={stateCounts}
        cullDirName={imageDir.dirName}
        showDialog={showFinishDialog}
        onCloseDialog={() => setShowFinishDialog(false)}
        onCullFinished={onCullFinished}
      />
    </div>
  );
}
