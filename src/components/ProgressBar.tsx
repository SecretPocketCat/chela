import { useMemo, CSSProperties } from "react";
import { ImageStateMap } from "./CullScreen";

interface ProgressPart {
  className: string;
  style: CSSProperties;
  count: number;
}

export function ProgressBar({ stateCounts }: { stateCounts: ImageStateMap }) {
  const progressParts = useMemo(() => {
    return [
      getProgressPartClass(
        stateCounts.get("selected") ?? 0,
        "tw-bg-positive",
        "tw-text-dark",
      ),
      getProgressPartClass(
        stateCounts.get("rejected") ?? 0,
        "tw-bg-negative",
        "tw-text-dark",
      ),
      getProgressPartClass(stateCounts.get("new") ?? 0, "tw-bg-border"),
    ];
  }, [stateCounts]);

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
