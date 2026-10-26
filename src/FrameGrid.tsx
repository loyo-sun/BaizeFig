import { memo } from "react";
import { ancestors, worldTransform, type Document, type Node } from "./core";
export function frameGridRects(n: Node) {
  const grid = n.frameGrid;
  if (!grid?.visible) return [];
  const size = grid.axis === "columns" ? n.width : n.height,
    cell = (size - 2 * grid.margin - (grid.count - 1) * grid.gap) / grid.count;
  if (cell <= 0) return [];
  return Array.from({ length: grid.count }, (_, i) =>
    grid.axis === "columns"
      ? {
          x: grid.margin + i * (cell + grid.gap),
          y: 0,
          width: cell,
          height: n.height,
        }
      : {
          x: 0,
          y: grid.margin + i * (cell + grid.gap),
          width: n.width,
          height: cell,
        },
  );
}
export const FrameGrid = memo(function FrameGrid({
  doc,
  page,
}: {
  doc: Document;
  page: string;
}) {
  return (
    <g pointerEvents="none">
      {doc.nodes
        .filter(
          (n) =>
            n.pageId === page &&
            n.visible &&
            n.frameGrid?.visible &&
            !ancestors(doc, n).some((a) => !a.visible),
        )
        .map((n) => (
          <g
            key={n.id}
            transform={`matrix(${worldTransform(doc, n).join(" ")})`}
            data-frame-grid={n.id}
          >
            {frameGridRects(n).map((r, i) => (
              <rect key={i} {...r} fill="#f24eaa" opacity={0.09} />
            ))}
          </g>
        ))}
    </g>
  );
});
