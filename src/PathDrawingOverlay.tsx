import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { penNetwork, pencilNetwork, type PenAnchor } from "./pathDrawing";
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
  }
>(function PathDrawingOverlay({ tool, zoom, temporaryHand, onFinish }, ref) {
  const group = useRef<SVGGElement>(null),
    anchors = useRef<PenAnchor[]>([]),
    stroke = useRef<Vec[]>([]),
    dragging = useRef(false),
    closing = useRef(false),
    [revision, refresh] = useState(0),
    [hover, setHover] = useState<Vec | null>(null);
  const point = (e: { clientX: number; clientY: number }) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      group.current!.getScreenCTM()!.inverse(),
    );
    return { x: p.x, y: p.y };
  };
  const paint = () => refresh((v) => v + 1);
  function finish(closed = false) {
    const network =
      tool === "pen"
        ? penNetwork(anchors.current, closed)
        : pencilNetwork(stroke.current);
    anchors.current = [];
    stroke.current = [];
    dragging.current = false;
    closing.current = false;
    setHover(null);
    paint();
    if (network.vertices.length >= 2) onFinish(network);
  }
  useImperativeHandle(ref, () => ({ finish: () => finish() }));
  useEffect(() => {
    const blur = () => {
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
    <g ref={group} data-path-drawing={tool}>
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
          let x = p.x - a.x,
            y = p.y - a.y;
          if (e.shiftKey) {
            const angle =
                (Math.round(Math.atan2(y, x) / (Math.PI / 4)) * Math.PI) / 4,
              length = Math.hypot(x, y);
            x = Math.cos(angle) * length;
            y = Math.sin(angle) * length;
          }
          if (Math.hypot(x, y) < 2 / zoom) return;
          a.outgoing = { x, y };
          a.incoming = e.altKey ? { x: 0, y: 0 } : { x: -x, y: -y };
          paint();
        }}
        onPointerUp={(e) => {
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
        {tool === "pen" && last && hover && !dragging.current && (
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
            <line
              x1={a.x + a.incoming.x}
              y1={a.y + a.incoming.y}
              x2={a.x + a.outgoing.x}
              y2={a.y + a.outgoing.y}
              stroke="#0d99ff"
              strokeWidth={1 / zoom}
            />
            <circle
              cx={a.x + a.outgoing.x}
              cy={a.y + a.outgoing.y}
              r={2 / zoom}
              fill="#0d99ff"
            />
            <rect
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
