import { useMemo } from "react";
import { useMeasure } from "react-use";
import { Image } from "../src-tauri/bindings/Image";

export function PreviewImage({
  active,
  baseUrl,
  image,
  thumbnail,
  className,
}: {
  baseUrl: string;
  image: Image;
  active: boolean;
  thumbnail: boolean;
  className?: string;
}) {
  function getPhotoUrl() {
    return `http://${baseUrl}/preview?path=${encodeURIComponent(
      image.previewPath
    )}`;
  }

  const [imgRef, { width: imgWidth, height: imgHeight }] = useMeasure();

  const stateColorClass = useMemo(() => {
    switch (image.state) {
      case "new":
        return `tw-bg-transparent`;
      case "selected":
        return `tw-bg-positive`;
      case "rejected":
        return `tw-bg-negative`;
    }
  }, [image.state]);

  const stateBorderColorClass = useMemo(() => {
    switch (image.state) {
      case "new":
        return "tw-border-t-border tw-border-l-border tw-border-b-border-dark tw-border-r-border-dark";
      case "selected":
        return "chela--border-outset tw-border-positive";
      case "rejected":
        return "chela--border-outset tw-border-negative";
    }
  }, [image.state]);

  const wrapperClass = useMemo(() => {
    return `${className} tw-transition-all tw-relative tw-w-full tw-h-full tw-flex tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-md ${
      active ? "chela--stripy-bg" : ""
    }`;
  }, [className, active]);

  const borderClass = useMemo(() => {
    return `${stateBorderColorClass} ${
      thumbnail ? "tw-border-4" : " tw-border-[6px]"
    } `;
  }, [active, thumbnail, stateBorderColorClass]);

  const imgClass = useMemo(() => {
    return `tw-transition-all tw-max-w-full tw-max-h-full tw-rounded-md ${borderClass}`;
  }, [borderClass]);

  const flagClass = useMemo(() => {
    return `tw-transition-all tw-absolute tw-translate-x-1/2 -tw-translate-y-1/2  tw-right-0 tw-top-0 tw-rotate-45 ${borderClass} ${getFlagStateClass()}`;
  }, [borderClass, image]);

  function getFlagStateClass() {
    const sizeClass = "tw-w-12 tw-h-12";

    switch (image.state) {
      case "new":
        return `${stateColorClass} tw-w-0 tw-h-0`;
      case "selected":
        return `${stateColorClass} ${sizeClass}`;
      case "rejected":
        return `${stateColorClass} ${sizeClass}`;
    }
  }

  return (
    <div className={wrapperClass}>
      <img ref={imgRef} src={getPhotoUrl()} className={imgClass} />

      <div
        style={{ width: `${imgWidth}px`, height: `${imgHeight}px` }}
        className="tw-absolute tw-overflow-hidden"
      >
        <div className={flagClass}></div>
      </div>
    </div>
  );
}
