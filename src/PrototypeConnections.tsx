import { useEffect, useId, useRef, useState } from "react";
import { bounds, ancestors, type Document, type Node } from "./core";
import {
  connectorPath,
  prototypeLinks,
  prototypeTarget,
} from "./prototypeWires";
import { useI18n } from "./LanguageContext";
export function PrototypeConnections({
  doc,
  page,
  selected,
  zoom,
  point,
  onConnect,
  onSelect,
}: {
  doc: Document;
  page: string;
  selected: string[];
  zoom: number;
  point: (e: { clientX: number; clientY: number }) => { x: number; y: number };
  onConnect: (source: Node, target: Node) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n(),
    marker = useId().replace(/:/g, "");
  const source = doc.nodes.find(
    (n) =>
      selected.includes(n.id) &&
      n.visible &&
      !n.locked &&
      !ancestors(doc, n).some((a) => a.locked),
  );
  const gesture = useRef(false),
    [end, setEnd] = useState<{ x: number; y: number } | null>(null),
    [target, setTarget] = useState<Node>();
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && gesture.current) {
        e.preventDefault();
        e.stopPropagation();
        gesture.current = false;
        setEnd(null);
        setTarget(undefined);
      }
    }
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, []);
  const box = source ? bounds(doc, [source]) : null;
  const start = box
    ? { x: box.x + box.width + 10 / zoom, y: box.y + box.height / 2 }
    : null;
  return (
    <g
      className="prototype-connections"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <defs>
        <marker
          id={marker}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path
            d="M 1 1 L 9 5 L 1 9"
            fill="none"
            stroke="var(--ui-selection)"
            strokeWidth={1.5}
          />
        </marker>
      </defs>
      {prototypeLinks(doc, page).map((link, i) => (
        <g key={`${link.source}-${link.target}-${i}`}>
          <path
            d={connectorPath(link.a, link.b)}
            fill="none"
            stroke="var(--ui-selection)"
            strokeWidth={1.5 / zoom}
            markerEnd={`url(#${marker})`}
            pointerEvents="none"
          />
          <path
            aria-label={t("Select prototype connection")}
            d={connectorPath(link.a, link.b)}
            fill="none"
            stroke="transparent"
            strokeWidth={12 / zoom}
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(link.source);
            }}
          />
        </g>
      ))}
      {target && (
        <rect
          {...bounds(doc, [target])}
          fill="#9747ff11"
          stroke="var(--ui-selection)"
          strokeWidth={2 / zoom}
          pointerEvents="none"
        />
      )}
      {start && source && (
        <>
          <line
            x1={box!.x + box!.width}
            y1={start.y}
            x2={start.x}
            y2={start.y}
            stroke="var(--ui-selection)"
            strokeWidth={1 / zoom}
          />
          <circle
            aria-label={t("Connect prototype")}
            cx={start.x}
            cy={start.y}
            r={6 / zoom}
            fill="var(--ui-handle)"
            stroke="var(--ui-selection)"
            strokeWidth={2 / zoom}
            style={{ cursor: "crosshair" }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              gesture.current = true;
              setEnd(start);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!gesture.current) return;
              e.stopPropagation();
              const p = point(e);
              setEnd(p);
              setTarget(prototypeTarget(doc, page, source.id, p));
            }}
            onPointerUp={(e) => {
              if (!gesture.current) return;
              e.stopPropagation();
              const destination = prototypeTarget(
                doc,
                page,
                source.id,
                point(e),
              );
              gesture.current = false;
              setEnd(null);
              setTarget(undefined);
              if (destination) onConnect(source, destination);
            }}
            onPointerCancel={() => {
              gesture.current = false;
              setEnd(null);
              setTarget(undefined);
            }}
          />
          {end && (
            <path
              d={connectorPath(start, end)}
              fill="none"
              stroke="var(--ui-selection)"
              strokeWidth={1.5 / zoom}
              strokeDasharray={`${4 / zoom} ${3 / zoom}`}
              pointerEvents="none"
            />
          )}
        </>
      )}
    </g>
  );
}
