import { useRef, useState, type PointerEvent } from "react";
import type { Guide } from "./core";
import { useI18n } from "./LanguageProvider";
export function rulerTicks(offset: number, zoom: number, length: number) {
  const rough = 70 / zoom,
    power = 10 ** Math.floor(Math.log10(rough)),
    step = ([1, 2, 5, 10].find((n) => n * power >= rough) ?? 10) * power;
  const start = Math.ceil(-offset / zoom / step) * step;
  return Array.from(
    { length: Math.max(0, Math.min(200, Math.ceil(length / zoom / step) + 1)) },
    (_, i) => ({
      value: start + i * step,
      pixel: offset + (start + i * step) * zoom,
    }),
  ).filter((t) => t.pixel >= 22 && t.pixel <= length);
}
export function CanvasAids({
  guides,
  page,
  view,
  width,
  height,
  onChange,
}: {
  guides: Guide[];
  page: string;
  view: { x: number; y: number; zoom: number };
  width: number;
  height: number;
  onChange: (guides: Guide[]) => void;
}) {
  const { t } = useI18n(),
    drag = useRef<Guide | null>(null),
    dragStart = useRef(0),
    [preview, setPreview] = useState<Guide | null>(null);
  function coordinate(e: PointerEvent<SVGElement>, axis: "x" | "y") {
    const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    return axis === "x"
      ? (e.clientX - r.left - view.x) / view.zoom
      : (e.clientY - r.top - view.y) / view.zoom;
  }
  function begin(e: PointerEvent<SVGElement>, axis: "x" | "y", guide?: Guide) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const value = guide ?? {
      id: crypto.randomUUID(),
      pageId: page,
      axis,
      position: coordinate(e, axis),
    };
    drag.current = value;
    dragStart.current = coordinate(e, axis);
    setPreview(value);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<SVGElement>) {
    const g = drag.current;
    if (!g) return;
    e.stopPropagation();
    setPreview({
      ...g,
      position: g.position + coordinate(e, g.axis) - dragStart.current,
    });
  }
  function end(e: PointerEvent<SVGElement>) {
    const g = drag.current;
    if (!g) return;
    e.stopPropagation();
    const position = g.position + coordinate(e, g.axis) - dragStart.current,
      r = e.currentTarget.ownerSVGElement!.getBoundingClientRect(),
      inside =
        e.clientX >= r.left + 22 &&
        e.clientY >= r.top + 22 &&
        e.clientX <= r.right &&
        e.clientY <= r.bottom;
    onChange([
      ...guides.filter((a) => a.id !== g.id),
      ...(inside ? [{ ...g, position }] : []),
    ]);
    drag.current = null;
    setPreview(null);
  }
  const events = {
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: () => {
      drag.current = null;
      setPreview(null);
    },
  };
  return (
    <g pointerEvents="none" aria-label={t("Rulers and guides")}>
      {[
        ...guides.filter((g) => g.pageId === page && g.id !== preview?.id),
        ...(preview ? [preview] : []),
      ].map((g) => {
        const p = g.position * view.zoom + (g.axis === "x" ? view.x : view.y);
        return (
          <g key={g.id}>
            <line
              data-guide-id={g.id}
              x1={g.axis === "x" ? p : 22}
              x2={g.axis === "x" ? p : width}
              y1={g.axis === "y" ? p : 22}
              y2={g.axis === "y" ? p : height}
              stroke="#0d99ff"
              strokeWidth={1}
              strokeDasharray="5 3"
            />
            <line
              aria-label={t("Move guide")}
              x1={g.axis === "x" ? p : 22}
              x2={g.axis === "x" ? p : width}
              y1={g.axis === "y" ? p : 22}
              y2={g.axis === "y" ? p : height}
              stroke="transparent"
              strokeWidth={7}
              pointerEvents="stroke"
              style={{ cursor: g.axis === "x" ? "ew-resize" : "ns-resize" }}
              onPointerDown={(e) => begin(e, g.axis, g)}
              {...events}
            />
          </g>
        );
      })}
      <rect
        x={22}
        width={Math.max(0, width - 22)}
        height={22}
        fill="#fafafa"
        stroke="#ddd"
        pointerEvents="all"
        aria-label={t("Drag from horizontal ruler to add a guide")}
        onPointerDown={(e) => begin(e, "y")}
        {...events}
      />
      <rect
        y={22}
        width={22}
        height={Math.max(0, height - 22)}
        fill="#fafafa"
        stroke="#ddd"
        pointerEvents="all"
        aria-label={t("Drag from vertical ruler to add a guide")}
        onPointerDown={(e) => begin(e, "x")}
        {...events}
      />
      {rulerTicks(view.x, view.zoom, width).map((v) => (
        <g key={`x${v.value}`}>
          <line x1={v.pixel} x2={v.pixel} y1={16} y2={22} stroke="#999" />
          <text x={v.pixel + 3} y={11} fontSize={8} fill="#666">
            {v.value}
          </text>
        </g>
      ))}
      {rulerTicks(view.y, view.zoom, height).map((v) => (
        <g key={`y${v.value}`}>
          <line x1={16} x2={22} y1={v.pixel} y2={v.pixel} stroke="#999" />
          <text
            transform={`translate(10 ${v.pixel + 3}) rotate(-90)`}
            fontSize={8}
            fill="#666"
          >
            {v.value}
          </text>
        </g>
      ))}
      <rect width={22} height={22} fill="#f4f4f4" />
    </g>
  );
}
export type Box = { x: number; y: number; width: number; height: number };
export function measureGaps(a: Box, b: Box) {
  return {
    x: Math.max(0, b.x - a.x - a.width, a.x - b.x - b.width),
    y: Math.max(0, b.y - a.y - a.height, a.y - b.y - b.height),
  };
}
export function MeasureOverlay({
  a,
  b,
  zoom,
}: {
  a: Box;
  b: Box;
  zoom: number;
}) {
  const gap = measureGaps(a, b),
    right = a.x < b.x,
    below = a.y < b.y;
  const x1 = right ? a.x + a.width : b.x + b.width,
    x2 = right ? b.x : a.x,
    y1 = below ? a.y + a.height : b.y + b.height,
    y2 = below ? b.y : a.y,
    cy = Math.max(a.y, b.y) + Math.min(a.height, b.height) / 2,
    cx = Math.max(a.x, b.x) + Math.min(a.width, b.width) / 2;
  return (
    <g pointerEvents="none" fill="#e44" stroke="#e44" strokeWidth={1 / zoom}>
      {gap.x > 0 && (
        <>
          <line x1={x1} x2={x2} y1={cy} y2={cy} />
          <text
            x={(x1 + x2) / 2}
            y={cy - 5 / zoom}
            textAnchor="middle"
            fontSize={11 / zoom}
            stroke="none"
          >
            {Math.round(gap.x * 100) / 100}
          </text>
        </>
      )}
      {gap.y > 0 && (
        <>
          <line x1={cx} x2={cx} y1={y1} y2={y2} />
          <text
            x={cx + 5 / zoom}
            y={(y1 + y2) / 2}
            fontSize={11 / zoom}
            stroke="none"
          >
            {Math.round(gap.y * 100) / 100}
          </text>
        </>
      )}
    </g>
  );
}
