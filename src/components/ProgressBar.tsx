import { useMemo, CSSProperties } from "react";
import { Image } from "../../src-tauri/bindings/Image";

interface ProgressPart {
  className: string;
  style: CSSProperties;
  count: number;
}

export function ProgressBar({ images }: { images: Image[] }) {
  const progressParts = useMemo(() => {
    return images.length
      ? [
          getProgressPartClass(
            images.filter((i) => i.state === "selected").length,
            "tw-bg-positive",
            "tw-text-dark",
          ),
          getProgressPartClass(
            images.filter((i) => i.state === "rejected").length,
            "tw-bg-negative",
            "tw-text-dark",
          ),
          getProgressPartClass(
            images.filter((i) => i.state === "new").length,
            "tw-bg-border",
          ),
        ]
      : [];
    // todo: optimize the deep compare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(images)]);

  function getProgressPartClass(
    count: number,
    bgClass: string,
    textClass: string = "",
  ): ProgressPart {
    return {
      className: `${bgClass} ${textClass} ${
        count ? "" : "tw-w-0"
      } tw-transition-all tw-flex tw-basis-0 tw-items-center tw-justify-center tw-overflow-hidden`,
      style: {
        flexGrow: count,
      },
      count,
    };
  }

  return (
    <div className="tw-flex tw-w-full">
      {progressParts.map((p, i) => (
        <div className={p.className} style={p.style} key={i}>
          {p.count}
        </div>
      ))}
    </div>
  );
}
