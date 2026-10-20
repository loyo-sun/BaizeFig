import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  penNetwork,
  penCloseTarget,
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
  const closingDrag = useRef<(HandleDrag & { moved: boolean }) | null>(null);
  const gestureBefore = useRef<PenAnchor[] | null>(null);
  const anchorDrag = useRef<{
    index: number;
    kind: "anchor" | "incoming" | "outgoing";
    start: Vec;
    original: PenAnchor;
    handle?: HandleDrag;
  } | null>(null);
  const point = (
    e: {
      clientX: number;
      clientY: number;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
    },
    snapEnabled = true,
  ) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      group.current!.getScreenCTM()!.inverse(),
    );
    const raw = { x: p.x, y: p.y };
    return snapEnabled && tool === "pen" && snapPoint
      ? snapPoint(raw, !!(e.ctrlKey || e.metaKey || e.shiftKey))
      : raw;
  };
  const paint = () => refresh((v) => v + 1);
  function cancelGesture() {
    if (gestureBefore.current) anchors.current = gestureBefore.current;
    gestureBefore.current = null;
    anchorDrag.current = null;
    creationDrag.current = null;
    dragging.current = false;
    closing.current = false;
    closingDrag.current = null;
    stroke.current = [];
    setHover(null);
    onSnapEnd?.();
    paint();
  }
  function beginClosing(e: React.PointerEvent) {
    const first = anchors.current[0];
    closing.current = true;
    closingDrag.current = {
      start: point(e, false),
      moved: false,
      original: { ...first.incoming },
      opposite: { ...first.outgoing },
      independent: true,
    };
    setHover(first);
    onSnapEnd?.();
  }
  function moveClosing(e: React.PointerEvent) {
    const drag = closingDrag.current, first = anchors.current[0];
    if (!drag || !first || temporaryHand) return;
    const p = point(e, false);
    if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) * zoom < 2) return;
    drag.moved = true;
    first.incoming = dragHandle(drag, p, true, e.shiftKey).handle;
    first.independent = true;
    setHover(first);
    paint();
  }
  function moveAnchor(e: React.PointerEvent) {
    const d = anchorDrag.current;
    if (!d || temporaryHand) return;
    e.stopPropagation();
    const p = point(e, d.kind === "anchor"),
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
  }
  function moveCreation(e: React.PointerEvent) {
    const a = anchors.current.at(-1);
    if (!a || !creationDrag.current || temporaryHand) return;
    const p = point(e, false);
    if (
      Math.hypot(p.x - a.x, p.y - a.y) < 2 / zoom &&
      !Math.hypot(a.outgoing.x, a.outgoing.y)
    )
      return;
    const next = dragHandle(creationDrag.current, p, e.altKey, e.shiftKey);
    a.outgoing = next.handle;
    a.incoming = next.opposite;
    a.independent = creationDrag.current.independent;
    paint();
  }
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
    closingDrag.current = null;
    anchorDrag.current = null;
    creationDrag.current = null;
    gestureBefore.current = null;
    setHover(null);
    paint();
    if (network.vertices.length >= 2) onFinish(network);
  }
  useImperativeHandle(ref, () => ({ finish: () => finish() }));
  useEffect(() => {
    const blur = cancelGesture;
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
        cancelGesture();
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
    last = anchors.current.at(-1),
    closeTarget = hover && penCloseTarget(anchors.current, hover, zoom);
  void revision;
  return (
    <g
      ref={group}
      data-path-drawing={tool}
      onPointerMove={(e) => {
        if (closing.current) moveClosing(e);
        else moveAnchor(e);
      }}
      onPointerCancel={cancelGesture}
      onPointerUp={(e) => {
        onSnapEnd?.();
        if (closing.current) {
          e.stopPropagation();
          moveClosing(e);
          finish(true);
          return;
        }
        if (anchorDrag.current) {
          moveAnchor(e);
          gestureBefore.current = null;
          anchorDrag.current = null;
          e.stopPropagation();
          paint();
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
          gestureBefore.current = structuredClone(anchors.current);
          let p = point(e);
          if (tool === "pencil") {
            stroke.current = [p];
            dragging.current = true;
            paint();
            return;
          }
          if (penCloseTarget(anchors.current, point(e, false), zoom)) {
            beginClosing(e);
            return;
          }
          if (e.shiftKey) p = snap(p);
          if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1 / zoom) return;
          creationDrag.current = {
            start: point(e, false),
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
          if (closing.current) {
            e.stopPropagation();
            moveClosing(e);
            return;
          }
          const close = !dragging.current && tool === "pen"
            ? penCloseTarget(anchors.current, point(e, false), zoom) : undefined;
          const p = close ?? (e.shiftKey && !dragging.current ? snap(point(e)) : point(e));
          setHover(p);
          if (close) onSnapEnd?.();
          if (!dragging.current) return;
          e.stopPropagation();
          if (tool === "pencil") {
            appendSamples(e);
            paint();
            return;
          }
          moveCreation(e);
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
            moveClosing(e);
            finish(true);
            return;
          }
          if (!dragging.current) return;
          if (tool === "pencil") {
            if (!temporaryHand) {
              appendSamples(e);
              const endpoint = point(e),
                last = stroke.current.at(-1);
              if (
                last &&
                Math.hypot(endpoint.x - last.x, endpoint.y - last.y) > 1e-9
              )
                stroke.current.push(endpoint);
            }
            finish();
          } else {
            moveCreation(e);
            creationDrag.current = null;
            gestureBefore.current = null;
            dragging.current = false;
            paint();
          }
        }}
        onPointerCancel={cancelGesture}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (tool === "pen") finish();
        }}
      />
      <g pointerEvents="none">
        {closeTarget && !dragging.current && !anchorDrag.current && (
          <circle data-pen-close-hint="" cx={closeTarget.x} cy={closeTarget.y}
            r={8 / zoom} fill="#0d99ff22" stroke="#0d99ff" strokeWidth={1.5 / zoom} />
        )}
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke="#202a24" strokeWidth={1} />
        ))}
        {tool === "pen" &&
          last &&
          hover &&
          !dragging.current &&
          !anchorDrag.current && (
            <path
              d={`M${last.x} ${last.y} C${last.x + last.outgoing.x} ${last.y + last.outgoing.y} ${hover.x + (closeTarget ? closeTarget.incoming.x : 0)} ${hover.y + (closeTarget ? closeTarget.incoming.y : 0)} ${hover.x} ${hover.y}`}
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
                      if (temporaryHand || e.button !== 0) return;
                      gestureBefore.current = structuredClone(anchors.current);
                      setHover(null);
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.altKey) a.independent = true;
                      anchorDrag.current = {
                        index: i,
                        kind,
                        start: point(e, false),
                        original: structuredClone(a),
                        handle: {
                          start: point(e, false),
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
              data-pen-close={i === 0 && anchors.current.length >= 3 ? "true" : undefined}
              pointerEvents="all"
              onPointerEnter={() => {
                if (i === 0 && anchors.current.length >= 3 && !temporaryHand)
                  setHover(a);
              }}
              onPointerDown={(e) => {
                if (temporaryHand || e.button !== 0) return;
                gestureBefore.current = structuredClone(anchors.current);
                setHover(null);
                e.preventDefault();
                e.stopPropagation();
                if (i === 0 && anchors.current.length >= 3) {
                  beginClosing(e);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  return;
                }
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
