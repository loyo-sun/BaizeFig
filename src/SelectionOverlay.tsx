import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { ancestors, worldTransform, type Document, type Node } from "./core";
import { nodeSelectionBounds } from "./pathBounds";
import { transformPoint, type Matrix } from "./fidelity";
import { useI18n } from "./LanguageContext";
import { rotationCursor } from "./toolCursor";
export function SelectionOverlay({
  doc,
  nodes,
  box,
  zoom,
  scaleMode,
  textMode,
  onPointerDown,
}: {
  doc: Document;
  nodes: Node[];
  box: { x: number; y: number; width: number; height: number };
  zoom: number;
  scaleMode: boolean;
  textMode: boolean;
  onPointerDown: (e: PointerEvent, id: string, handle: string) => void;
}) {
  const { t, language } = useI18n(),
    first = nodes[0],
    local = nodes.length === 1 && !scaleMode ? nodeSelectionBounds(first) : box,
    matrix: Matrix =
      nodes.length === 1 && !scaleMode
        ? worldTransform(doc, first)
        : [1, 0, 0, 1, 0, 0];
  const point = (x: number, y: number) => transformPoint(matrix, x, y),
    corners = [
      point(local.x, local.y),
      point(local.x + local.width, local.y),
      point(local.x + local.width, local.y + local.height),
      point(local.x, local.y + local.height),
    ];
  const editable =
      !textMode &&
      !nodes.some((n) => n.locked || ancestors(doc, n).some((a) => a.locked)),
    bottom = {
      x: (corners[2].x + corners[3].x) / 2,
      y: (corners[2].y + corners[3].y) / 2,
    },
    edge = { x: corners[2].x - corners[3].x, y: corners[2].y - corners[3].y },
    length = Math.hypot(edge.x, edge.y) || 1,
    badge = {
      x: bottom.x - ((edge.y / length) * 16) / zoom,
      y: bottom.y + ((edge.x / length) * 16) / zoom,
    };
  const width = local.width * Math.hypot(matrix[0], matrix[1]),
    height = local.height * Math.hypot(matrix[2], matrix[3]);
  const label =
    language === "en"
      ? `${Math.round(width)}×${Math.round(height)}`
      : `${Math.round(width)} x ${Math.round(height)}`;
  const center = {
    x: (corners[0].x + corners[2].x) / 2,
    y: (corners[0].y + corners[2].y) / 2,
  };
  const resizeCursor = (p: { x: number; y: number }) =>
    ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][
      ((Math.round(Math.atan2(p.y - center.y, p.x - center.x) / (Math.PI / 4)) %
        4) +
        4) %
        4
    ];
  const labelRef = useRef<SVGTextElement>(null),
    [labelWidth, setLabelWidth] = useState(64);
  useLayoutEffect(() => {
    if (labelRef.current)
      setLabelWidth(
        Math.max(
          24,
          Math.ceil(labelRef.current.getComputedTextLength() * zoom + 12),
        ),
      );
  }, [label, zoom]);
  return (
    <g className="selection-overlay">
      {[0, 1].map((i) => (
        <polygon
          key={i}
          points={corners.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--ui-selection)"
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
      ))}
      {editable && (
        <>
          {corners.map((p, i) => {
            const size = 20 / zoom,
              wx = corners[1].x - corners[0].x,
              wy = corners[1].y - corners[0].y,
              hx = corners[3].x - corners[0].x,
              hy = corners[3].y - corners[0].y,
              w = Math.hypot(wx, wy) || 1,
              h = Math.hypot(hx, hy) || 1,
              sx = i === 0 || i === 3 ? -1 : 1,
              sy = i < 2 ? -1 : 1,
              u = { x: (wx / w) * size * sx, y: (wy / w) * size * sx },
              v = { x: (hx / h) * size * sy, y: (hy / h) * size * sy };
            return (
              <polygon
                key={"rotate" + i}
                aria-label={
                  t("Rotate selection") + " " + ["nw", "ne", "se", "sw"][i]
                }
                points={[
                  p,
                  { x: p.x + u.x, y: p.y + u.y },
                  { x: p.x + u.x + v.x, y: p.y + u.y + v.y },
                  { x: p.x + v.x, y: p.y + v.y },
                ]
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="transparent"
                style={{ cursor: rotationCursor }}
                onPointerDown={(e) => onPointerDown(e, first.id, "rotate")}
              />
            );
          })}
          {["n", "e", "s", "w"].map((handle, i) => {
            const a = corners[i],
              b = corners[(i + 1) % 4];
            return (
              <line
                key={handle}
                aria-label={t("Resize {direction}", { direction: handle })}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="transparent"
                strokeWidth={8 / zoom}
                style={{
                  cursor: resizeCursor({
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2,
                  }),
                }}
                onPointerDown={(e) => onPointerDown(e, first.id, handle)}
              />
            );
          })}
          {corners.map((p, i) => {
            const handle = ["nw", "ne", "se", "sw"][i];
            return (
              <g key={handle}>
                <circle
                  aria-label={t("Resize {direction}", { direction: handle })}
                  cx={p.x}
                  cy={p.y}
                  r={10 / zoom}
                  fill="transparent"
                  style={{ cursor: resizeCursor(p) }}
                  onPointerDown={(e) => onPointerDown(e, first.id, handle)}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4 / zoom}
                  fill="var(--ui-handle)"
                  stroke="var(--ui-selection)"
                  strokeWidth={1 / zoom}
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </>
      )}
      <g pointerEvents="none">
        <rect
          x={badge.x - labelWidth / 2 / zoom}
          y={badge.y - 8 / zoom}
          width={labelWidth / zoom}
          height={16 / zoom}
          rx={2 / zoom}
          fill="var(--ui-selection)"
        />
        <text
          ref={labelRef}
          x={badge.x}
          y={badge.y + 3 / zoom}
          fontSize={12 / zoom}
          fontWeight={500}
          textAnchor="middle"
          fill="white"
        >
          {label}
        </text>
      </g>
    </g>
  );
}
