import type { SnapGuide } from "./snapping";
export function SnapOverlay({
  guides,
  zoom,
}: {
  guides: SnapGuide[];
  zoom: number;
}) {
  return (
    <g pointerEvents="none" aria-label="Snap guides">
      {guides.map((g, i) => (
        <line
          key={i}
          data-snap-axis={g.axis}
          x1={g.axis === "x" ? g.value : g.from - 12 / zoom}
          x2={g.axis === "x" ? g.value : g.to + 12 / zoom}
          y1={g.axis === "y" ? g.value : g.from - 12 / zoom}
          y2={g.axis === "y" ? g.value : g.to + 12 / zoom}
          stroke="#f24eaa"
          strokeWidth={1 / zoom}
          strokeDasharray={`${3 / zoom} ${2 / zoom}`}
        />
      ))}
    </g>
  );
}
