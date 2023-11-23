import { useMemo } from "react";
import { useMeasure } from "react-use";
import { Spinner } from "@chakra-ui/react";
import { Image } from "../../src-tauri/bindings/Image";
import { useAtomValue } from "jotai";
import { configAtom } from "../store/configStore";

export function PreviewImage({
  active,
  image,
  thumbnail,
  grouped,
  className,
}: {
  image: Image;
  active: boolean;
  thumbnail: boolean;
  grouped?: boolean;
  className?: string;
}) {
  const conf = useAtomValue(configAtom);

  function getPreviewUrl() {
    return `http://${conf.previewApiUrl}/preview?path=${encodeURIComponent(
      image.previewPath,
    )}`;
  }

  const [imgRef, { width: imgWidth, height: imgHeight }] = useMeasure<HTMLImageElement>();

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
    if (thumbnail && active) {
      return "chela--border-outset tw-border-primary";
    }

    switch (image.state) {
      case "new":
        return `tw-border-solid tw-border-border-light ${
          grouped
            ? "tw-border-b-dark tw-border-r-dark"
            : "tw-border-b-border tw-border-r-border"
        } `;
      case "selected":
        return "chela--border-outset tw-border-positive";
      case "rejected":
        return "chela--border-outset tw-border-negative";
    }
  }, [image.state, grouped, active, thumbnail]);

  // todo: better size for thumbnails
  const wrapperClass = useMemo(() => {
    return `${className} tw-transition-all tw-relative tw-h-full tw-flex tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-md ${
      active && !thumbnail ? "chela--stripy-bg" : ""
    } ${thumbnail ? `tw-min-w-[100px]` : ""}`;
  }, [className, active, thumbnail]);

  const borderClass = useMemo(() => {
    return `${stateBorderColorClass} ${thumbnail ? "tw-border-4" : " tw-border-[6px]"} `;
  }, [thumbnail, stateBorderColorClass]);

  const imgClass = useMemo(() => {
    return `tw-z-[1] tw-transition-all tw-max-w-full tw-max-h-full tw-rounded-md ${borderClass}`;
  }, [borderClass]);

  const flagClass = useMemo(() => {
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

    return `tw-transition-all tw-absolute tw-translate-x-1/2 -tw-translate-y-1/2 tw-right-0 tw-top-0 tw-rotate-45 ${borderClass} ${
      image.state === "new" ? "!tw-border-0" : ""
    } ${getFlagStateClass()}`;
  }, [borderClass, image.state, stateColorClass]);

  function getSpinnerSize() {
    return thumbnail ? 65 : 250;
  }

  return (
    <div className={wrapperClass}>
      <img ref={imgRef} src={getPreviewUrl()} className={imgClass} />

      <div
        style={{ width: `${imgWidth}px`, height: `${imgHeight}px` }}
        className="tw-absolute tw-overflow-hidden tw-flex tw-items-center tw-justify-center tw-z-[2]"
      >
        <div className={flagClass}></div>
      </div>

      <div
        style={{
          width: `${imgWidth || getSpinnerSize()}px`,
          height: `${imgHeight || getSpinnerSize()}px`,
        }}
        className="tw-absolute tw-overflow-hidden tw-flex tw-items-center tw-justify-center"
      >
        <Spinner
          color="gray.300"
          opacity={thumbnail ? 0.5 : 0.8}
          size={thumbnail ? "lg" : "xl"}
          thickness={thumbnail ? "8px" : "20px"}
          speed={`${0.55 + Math.random() * 0.15}s`}
          height={getSpinnerSize()}
          width={getSpinnerSize()}
        />
      </div>
    </div>
  );
}
