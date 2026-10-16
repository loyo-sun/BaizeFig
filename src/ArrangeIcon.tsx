import type { ArrangeMode } from "./arrange";
// Distribution diagrams use three different-size objects to distinguish
// edge alignment from centers and equal gaps at toolbar size.
export function ArrangeIcon({ mode }: { mode: ArrangeMode }) {
  const vertical = ["pack-y", "space-y", "top", "middle", "bottom"].includes(
    mode,
  );
  const edge = ["left", "top"].includes(mode)
    ? 0
    : ["right", "bottom"].includes(mode)
      ? 2
      : 1;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {mode === "round" ? (
        <>
          <rect
            x="5"
            y="5"
            width="14"
            height="14"
            rx="1"
            strokeDasharray="2 2"
          />
          <path d="M9 12h6M12 9v6" />
        </>
      ) : mode === "tidy" ? (
        <>
          {[5, 14].flatMap((x) =>
            [5, 14].map((y) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" rx="1" />
            )),
          )}
        </>
      ) : (
        <g transform={vertical ? "translate(24 0) rotate(90)" : undefined}>
          {[4, 10, 17].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={7 - i}
              width={i === 1 ? 4 : 3}
              height={10 + 2 * i}
              rx=".5"
            />
          ))}
          {mode.startsWith("pack") ? (
            <path d="M2 3h6m-3-2 3 2-3 2M22 3h-6m3-2-3 2 3 2" />
          ) : mode.startsWith("space") ? (
            <path d="M7 3h3m4 0h3M7 1v4m3-4v4m4-4v4m3-4v4" />
          ) : (
            [4, 10, 17].map((x, i) => (
              <path
                key={x}
                d={`M${x + (edge === 0 ? 0 : edge === 2 ? (i === 1 ? 4 : 3) : i === 1 ? 2 : 1.5)} 2v20`}
                strokeDasharray="1 2"
              />
            ))
          )}
        </g>
      )}
    </svg>
  );
}
