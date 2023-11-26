import { FaFlagCheckered, FaRightFromBracket } from "react-icons/fa6";

export function BoundaryIcon({
  start,
  thumbnail,
}: {
  start?: boolean;
  thumbnail?: boolean;
}) {
  const size = thumbnail ? 75 : 150;
  return (
    <div
      className={`tw-flex tw-items-center tw-justify-center ${
        thumbnail && !start ? "tw-mr-16" : ""
      }`}
    >
      <div
        className={`chela--stripy-bg tw-flex tw-items-center tw-justify-center ${
          thumbnail ? "tw-border-4" : "tw-border-[6px]"
        } ${
          start
            ? "tw-border-border-light tw-border-b-border-dark tw-border-r-border-dark"
            : "tw-border-positive chela--border-outset"
        } tw-rounded-md tw-p-8 tw-aspect-square`}
      >
        {start ? (
          <FaRightFromBracket size={size} />
        ) : (
          <FaFlagCheckered size={size} className="tw-rotate-12 tw-translate-y-2" />
        )}
      </div>
    </div>
  );
}
