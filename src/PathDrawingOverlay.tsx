import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  penNetwork,
  pencilNetwork,
  dragHandle,
  type HandleDrag,
  type PenAnchor,
} from "./pathDrawing";
import { networkStroke, type Vec, type VectorNetwork } from "./vectorNetwork";
export interface PathDrawingHandle {
  finish: () => void;
}
export const PathDrawingOverlay = forwardRef<
  PathDrawingHandle,
  {
    tool: "pen" | "pencil";
    zoom: number;
    temporaryHand: boolean;
    onFinish: (network: VectorNetwork) => void;
    snapPoint?: (p: Vec, disabled: boolean) => Vec;
    onSnapEnd?: () => void;
  }
>(function PathDrawingOverlay(
  { tool, zoom, temporaryHand, onFinish, snapPoint, onSnapEnd },
  ref,
) {
  const group = useRef<SVGGElement>(null),
    anchors = useRef<PenAnchor[]>([]),
    stroke = useRef<Vec[]>([]),
    dragging = useRef(false),
    closing = useRef(false),
    [revision, refresh] = useState(0),
    [hover, setHover] = useState<Vec | null>(null);
  const creationDrag = useRef<HandleDrag | null>(null);
  const anchorDrag = useRef<{
    index: number;
    kind: "anchor" | "incoming" | "outgoing";
    start: Vec;
    original: PenAnchor;
    handle?: HandleDrag;
  } | null>(null);
  const point = (e: {
    clientX: number;
    clientY: number;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  }) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      group.current!.getScreenCTM()!.inverse(),
    );
    const raw = { x: p.x, y: p.y };
    return tool === "pen" && snapPoint
      ? snapPoint(raw, !!(e.ctrlKey || e.metaKey || e.shiftKey))
      : raw;
  };
  const paint = () => refresh((v) => v + 1);
  function finish(closed = false) {
    onSnapEnd?.();
    const network =
      tool === "pen"
        ? penNetwork(anchors.current, closed)
        : pencilNetwork(stroke.current);
    anchors.current = [];
    stroke.current = [];
    dragging.current = false;
    closing.current = false;
    anchorDrag.current = null;
    setHover(null);
    paint();
    if (network.vertices.length >= 2) onFinish(network);
  }
  useImperativeHandle(ref, () => ({ finish: () => finish() }));
  useEffect(() => {
    const blur = () => {
      anchorDrag.current = null;
      dragging.current = false;
      closing.current = false;
      if (tool === "pencil") stroke.current = [];
      paint();
    };
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, [tool]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select") || target.isContentEditable)
        return;
      if (e.key === "Enter" || e.key === "Escape") {
        if (!anchors.current.length && !stroke.current.length) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
      } else if (
        (e.key === "Backspace" || e.key === "Delete") &&
        anchors.current.length
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        anchors.current.pop();
        paint();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  });
  const snap = (p: Vec) => {
    const a = anchors.current.at(-1);
    if (!a) return p;
    const angle =
        (Math.round(Math.atan2(p.y - a.y, p.x - a.x) / (Math.PI / 4)) *
          Math.PI) /
        4,
      length = Math.hypot(p.x - a.x, p.y - a.y);
    return {
      x: a.x + Math.cos(angle) * length,
      y: a.y + Math.sin(angle) * length,
    };
  };
  const appendSamples = (e: React.PointerEvent) => {
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const event of [...events, e.nativeEvent]) {
      const p = point(event),
        last = stroke.current.at(-1);
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 0.6 / zoom)
        stroke.current.push(p);
    }
  };
  const network =
      tool === "pen"
        ? penNetwork(anchors.current)
        : pencilNetwork(stroke.current),
    paths = [{ d: networkStroke(network) }],
    last = anchors.current.at(-1);
  void revision;
  return (
    <g
      ref={group}
      data-path-drawing={tool}
      onPointerMove={(e) => {
        const d = anchorDrag.current;
        if (!d) return;
        e.stopPropagation();
        const p = point(e),
          a = anchors.current[d.index];
        if (!a) return;
        if (d.kind === "anchor") {
          a.x = d.original.x + p.x - d.start.x;
          a.y = d.original.y + p.y - d.start.y;
        } else {
          const next = dragHandle(d.handle!, p, e.altKey, e.shiftKey);
          a.independent = d.handle!.independent;
          a[d.kind] = next.handle;
          a[d.kind === "incoming" ? "outgoing" : "incoming"] = next.opposite;
        }
        paint();
      }}
      onPointerCancel={() => {
        anchorDrag.current = null;
      }}
      onPointerUp={(e) => {
        onSnapEnd?.();
        if (anchorDrag.current) {
          const d = anchorDrag.current,
            a = anchors.current[d.index],
            close =
              d.kind === "anchor" &&
              d.index === 0 &&
              anchors.current.length >= 3 &&
              Math.hypot(a.x - d.original.x, a.y - d.original.y) < 1 / zoom;
          anchorDrag.current = null;
          e.stopPropagation();
          if (close) finish(true);
          else paint();
        }
      }}
    >
      <rect
        x={-1000000}
        y={-1000000}
        width={2000000}
        height={2000000}
        fill="transparent"
        onPointerDown={(e) => {
          if (temporaryHand || e.button === 1) return;
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          let p = point(e);
          if (tool === "pencil") {
            stroke.current = [p];
            dragging.current = true;
            paint();
            return;
          }
          const first = anchors.current[0];
          if (
            anchors.current.length >= 3 &&
            Math.hypot(p.x - first.x, p.y - first.y) < 8 / zoom
          ) {
            closing.current = true;
            return;
          }
          if (e.shiftKey) p = snap(p);
          if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1 / zoom) return;
          creationDrag.current = {
            start: p,
            original: { x: 0, y: 0 },
            opposite: { x: 0, y: 0 },
            independent: e.altKey,
          };
          anchors.current.push({
            ...p,
            incoming: { x: 0, y: 0 },
            outgoing: { x: 0, y: 0 },
          });
          dragging.current = true;
          paint();
        }}
        onPointerMove={(e) => {
          if (temporaryHand) return;
          const p = e.shiftKey && !dragging.current ? snap(point(e)) : point(e);
          setHover(p);
          if (!dragging.current) return;
          e.stopPropagation();
          if (tool === "pencil") {
            appendSamples(e);
            paint();
            return;
          }
          const a = anchors.current.at(-1)!;
          if (Math.hypot(p.x - a.x, p.y - a.y) < 2 / zoom) return;
          const next = dragHandle(
            creationDrag.current!,
            p,
            e.altKey,
            e.shiftKey,
          );
          a.outgoing = next.handle;
          a.incoming = next.opposite;
          a.independent = creationDrag.current!.independent;
          paint();
        }}
        onPointerUp={(e) => {
          onSnapEnd?.();
          if (
            e.button === 1 ||
            (temporaryHand && !dragging.current && !closing.current)
          )
            return;
          e.stopPropagation();
          if (closing.current) {
            finish(true);
            return;
          }
          if (!dragging.current) return;
          if (tool === "pencil") {
            appendSamples(e);
            const endpoint = point(e),
              last = stroke.current.at(-1);
            if (
              last &&
              Math.hypot(endpoint.x - last.x, endpoint.y - last.y) > 1e-9
            )
              stroke.current.push(endpoint);
            finish();
          } else {
            dragging.current = false;
            paint();
          }
        }}
        onPointerCancel={() => {
          anchors.current = [];
          stroke.current = [];
          dragging.current = false;
          closing.current = false;
          paint();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (tool === "pen") finish();
        }}
      />
      <g pointerEvents="none">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke="#202a24" strokeWidth={1} />
        ))}
        {tool === "pen" &&
          last &&
          hover &&
          !dragging.current &&
          !anchorDrag.current && (
            <path
              d={`M${last.x} ${last.y} C${last.x + last.outgoing.x} ${last.y + last.outgoing.y} ${hover.x} ${hover.y} ${hover.x} ${hover.y}`}
              fill="none"
              stroke="#0d99ff"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom} ${3 / zoom}`}
            />
          )}
        {anchors.current.map((a, i) => (
          <g key={i}>
            <PenHandleGuides anchor={a} zoom={zoom} />
            {(["incoming", "outgoing"] as const).map(
              (kind) =>
                Math.hypot(a[kind].x, a[kind].y) > 0.01 && (
                  <circle
                    key={kind}
                    aria-label={`Pen handle ${i + 1} ${kind}`}
                    data-pen-control="handle"
                    pointerEvents="all"
                    cx={a.x + a[kind].x}
                    cy={a.y + a[kind].y}
                    r={4 / zoom}
                    fill="white"
                    stroke="#0d99ff"
                    strokeWidth={1 / zoom}
                    onPointerDown={(e) => {
                      if (temporaryHand) return;
                      setHover(null);
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.altKey) a.independent = true;
                      anchorDrag.current = {
                        index: i,
                        kind,
                        start: point(e),
                        original: structuredClone(a),
                        handle: {
                          start: point(e),
                          original: { ...a[kind] },
                          opposite: {
                            ...a[kind === "incoming" ? "outgoing" : "incoming"],
                          },
                          independent: !!a.independent || e.altKey,
                        },
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                ),
            )}
            <rect
              aria-label={`Pen anchor ${i + 1}`}
              data-pen-control="anchor"
              pointerEvents="all"
              onPointerDown={(e) => {
                if (temporaryHand) return;
                setHover(null);
                e.preventDefault();
                e.stopPropagation();
                anchorDrag.current = {
                  index: i,
                  kind: "anchor",
                  start: point(e),
                  original: structuredClone(a),
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              x={a.x - 3 / zoom}
              y={a.y - 3 / zoom}
              width={6 / zoom}
              height={6 / zoom}
              fill="white"
              stroke="#0d99ff"
              strokeWidth={1 / zoom}
            />
          </g>
        ))}
      </g>
    </g>
  );
});

export function PenHandleGuides({
  anchor: a,
  zoom,
}: {
  anchor: PenAnchor;
  zoom: number;
}) {
  return (
    <>
      {(["incoming", "outgoing"] as const).map(
        (kind) =>
          Math.hypot(a[kind].x, a[kind].y) > 0.01 && (
            <line
              key={kind}
              data-pen-guide={kind}
              x1={a.x}
              y1={a.y}
              x2={a.x + a[kind].x}
              y2={a.y + a[kind].y}
              stroke="#0d99ff"
              strokeWidth={1 / zoom}
            />
          ),
      )}
    </>
  );
}
