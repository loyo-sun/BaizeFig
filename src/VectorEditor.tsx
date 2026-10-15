import {
  offsetNetwork,
  offsetNodePatch,
  type OffsetJoin,
} from "./vectorOffset";
import { simplifyNetwork } from "./vectorSimplify";
import { RegionPaintEditor } from "./RegionPaintEditor";
import React, { useEffect, useRef, useState } from "react";
import type { Document, Node } from "./core";
import { NodeShape } from "./Canvas";
import { worldTransform } from "./core";
import { multiply, inverse, transformPoint } from "./fidelity";
import { editableNetwork, networkPatch } from "./vectorGeometry";
import {
  joinVertices,
  smoothJoinVertices,
  removeVertices,
  segmentPath,
  splitSegment,
  type Vec,
  type VectorNetwork,
} from "./vectorNetwork";
import { useI18n } from "./LanguageContext";
export function VectorEditor({
  doc,
  node,
  zoom,
  view,
  width,
  onCommit,
  onClose,
  onUndo,
  onRedo,
  onPan,
  onSplit,
  panTool,
  onTemporaryHandChange,
  onPanningChange,
  snapPoint,
  onSnapEnd,
}: {
  snapPoint?: (p: Vec, disabled: boolean) => Vec;
  onSnapEnd?: () => void;
  doc: Document;
  node: Node;
  zoom: number;
  width: number;
  view: { x: number; y: number };
  onCommit: (patch: Partial<Node>) => void;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPan: (position: { x: number; y: number }) => void;
  panTool: boolean;
  onSplit: () => void;
  onTemporaryHandChange: (held: boolean) => void;
  onPanningChange: (active: boolean) => void;
}) {
  const { t } = useI18n(),
    [picked, setPicked] = useState<number[]>([]),
    [draft, setDraft] = useState<VectorNetwork | null>(null),
    [mode, setMode] = useState<"free" | "aligned" | "mirrored">("free"),
    [connect, setConnect] = useState(false),
    [region, setRegion] = useState(0),
    [paintPanel, setPaintPanel] = useState(false),
    [operationError, setOperationError] = useState(""),
    [simplifyTolerance, setSimplifyTolerance] = useState(0.5),
    [offsetDistance, setOffsetDistance] = useState(8),
    [offsetJoin, setOffsetJoin] = useState<OffsetJoin>("miter");
  const network = draft ?? editableNetwork(node),
    latest = useRef(network);
  latest.current = network;
  const drag = useRef<{
      network: VectorNetwork;
      start: Vec;
      vertices: number[];
      segment?: number;
      end?: "ha" | "hb";
      independent?: boolean;
      frozen?: VectorNetwork;
      marquee?: boolean;
      pan?: { screen: Vec; view: Vec };
    } | null>(null),
    group = useRef<SVGGElement>(null),
    panKey = useRef(false);
  const m = multiply(worldTransform(doc, node), [
    node.fidelity?.size[0] ? node.width / node.fidelity.size[0] : 1,
    0,
    0,
    node.fidelity?.size[1] ? node.height / node.fidelity.size[1] : 1,
    0,
    0,
  ]);
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
    if (snapPoint && !panKey.current && !panTool) {
      const world = transformPoint(m, p.x, p.y),
        snapped = snapPoint(world, !!(e.ctrlKey || e.metaKey || e.shiftKey));
      return transformPoint(inverse(m), snapped.x, snapped.y);
    }
    return { x: p.x, y: p.y };
  };
  const save = (next: VectorNetwork) => {
    onCommit(networkPatch(node, next));
    setDraft(null);
  };
  const action = (fn: () => void) => {
    try {
      setOperationError("");
      fn();
    } catch (error) {
      setOperationError(t((error as Error).message));
    }
  };
  const remove = (heal = false) => {
    if (picked.length) {
      save(removeVertices(network, picked, heal));
      setPicked([]);
    }
  };
  useEffect(() => {
    setPicked([]);
    setDraft(null);
  }, [node.id]);
  useEffect(() => {
    const blur = () => {
      panKey.current = false;
      drag.current = null;
      setDraft(null);
      onTemporaryHandChange(false);
      onPanningChange(false);
    };
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("blur", blur);
      onTemporaryHandChange(false);
      onPanningChange(false);
    };
  }, [node.id]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,select,textarea") || target.isContentEditable)
        return;
      const k = e.key.toLowerCase();
      if (k === " ") {
        if (e.shiftKey) return;
        panKey.current = true;
        onTemporaryHandChange(true);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (k === "escape" || k === "enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (drag.current) {
          drag.current = null;
          onPanningChange(false);
          setDraft(null);
        } else onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && ["z", "y"].includes(k)) {
        setDraft(null);
        setPicked([]);
        e.preventDefault();
        e.stopImmediatePropagation();
        k === "y" || e.shiftKey ? onRedo() : onUndo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopImmediatePropagation();
        remove(e.shiftKey);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && k === "j") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (picked.length === 2)
          action(() =>
            save(
              (e.shiftKey ? smoothJoinVertices : joinVertices)(
                network,
                picked[0],
                picked[1],
              ),
            ),
          );
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const next = structuredClone(network),
          d = e.shiftKey ? 10 : 1;
        for (const i of picked) {
          next.vertices[i].x +=
            k === "arrowleft" ? -d : k === "arrowright" ? d : 0;
          next.vertices[i].y +=
            k === "arrowup" ? -d : k === "arrowdown" ? d : 0;
        }
        if (picked.length) save(next);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && k === "a") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPicked(network.vertices.map((_, i) => i));
        return;
      }
      // Keep layer/tool shortcuts from deleting or moving the whole shape in node mode.
      if (!e.metaKey && !e.ctrlKey) {
        e.stopImmediatePropagation();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") {
        panKey.current = false;
        onTemporaryHandChange(false);
      }
    };
    window.addEventListener("keyup", up, true);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("keyup", up, true);
    };
  });
  function startPan(e: React.PointerEvent) {
    if (!panKey.current && !panTool && e.button !== 1) return false;
    e.preventDefault();
    e.stopPropagation();
    drag.current = {
      network,
      start: point(e),
      vertices: [],
      pan: { screen: { x: e.clientX, y: e.clientY }, view: { ...view } },
    };
    onPanningChange(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    return true;
  }
  const begin = (
    e: React.PointerEvent,
    vertex: number,
    segment?: number,
    end?: "ha" | "hb",
  ) => {
    if (startPan(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;
    if (
      connect &&
      segment === undefined &&
      picked.length === 1 &&
      picked[0] !== vertex
    ) {
      action(() => save(joinVertices(network, picked[0], vertex)));
      setPicked([vertex]);
      return;
    }
    const ids = e.shiftKey
      ? picked.includes(vertex)
        ? picked.filter((i) => i !== vertex)
        : [...picked, vertex]
      : picked.includes(vertex)
        ? picked
        : [vertex];
    setPicked(ids);
    if (end && e.altKey) setMode("free");
    drag.current = {
      network: structuredClone(network),
      start: point(e),
      vertices: ids,
      segment,
      end,
      independent: e.altKey,
      frozen: e.altKey ? structuredClone(network) : undefined,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    if (d.pan) {
      onPan({
        x: d.pan.view.x + e.clientX - d.pan.screen.x,
        y: d.pan.view.y + e.clientY - d.pan.screen.y,
      });
      return;
    }
    const p = point(e),
      next = structuredClone(d.network),
      dx = p.x - d.start.x,
      dy = p.y - d.start.y;
    if (d.marquee) {
      setPicked(
        network.vertices.flatMap((v, i) =>
          v.x >= Math.min(p.x, d.start.x) &&
          v.x <= Math.max(p.x, d.start.x) &&
          v.y >= Math.min(p.y, d.start.y) &&
          v.y <= Math.max(p.y, d.start.y)
            ? [i]
            : [],
        ),
      );
      return;
    }
    if (d.segment !== undefined && d.end) {
      const s = next.segments[d.segment],
        v = d.end === "ha" ? s.a : s.b,
        handle = s[d.end];
      handle.x += dx;
      handle.y += dy;
      if (e.altKey && !d.independent) {
        setMode("free");
        d.independent = true;
        d.frozen = structuredClone(latest.current);
      }
      if (d.independent && d.frozen) {
        for (let i = 0; i < next.segments.length; i++) {
          for (const end of ["ha", "hb"] as const) {
            const attached =
              end === "ha" ? next.segments[i].a : next.segments[i].b;
            if (attached === v && !(i === d.segment && end === d.end))
              next.segments[i][end] = { ...d.frozen.segments[i][end] };
          }
        }
      }
      if (mode !== "free" && !d.independent) {
        const attached = next.segments
          .flatMap((s, i) => [
            { i, end: "ha" as const, v: s.a },
            { i, end: "hb" as const, v: s.b },
          ])
          .filter((a) => a.v === v && !(a.i === d.segment && a.end === d.end));
        if (attached.length === 1) {
          const other = next.segments[attached[0].i][attached[0].end],
            length =
              mode === "mirrored"
                ? Math.hypot(handle.x, handle.y)
                : Math.hypot(other.x, other.y),
            norm = Math.hypot(handle.x, handle.y) || 1;
          other.x = (-handle.x / norm) * length;
          other.y = (-handle.y / norm) * length;
        }
      }
    } else
      for (const i of d.vertices) {
        next.vertices[i].x += dx;
        next.vertices[i].y += dy;
      }
    latest.current = next;
    setDraft(next);
  };
  const end = (e: React.PointerEvent) => {
    onSnapEnd?.();
    onPanningChange(false);
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    drag.current = null;
    if (
      !d.marquee &&
      !d.pan &&
      JSON.stringify(d.network) !== JSON.stringify(latest.current)
    )
      save(latest.current);
  };
  function handleStyle(style: "corner" | "smooth") {
    const n = structuredClone(network);
    for (const v of picked) {
      const edges = n.segments
        .flatMap((s) => [
          { s, key: "ha" as const, v: s.a, other: s.b },
          { s, key: "hb" as const, v: s.b, other: s.a },
        ])
        .filter((e) => e.v === v);
      for (const e of edges) {
        if (style === "corner") e.s[e.key] = { x: 0, y: 0 };
        else {
          const from = n.vertices[v],
            to = n.vertices[e.other],
            d = { x: to.x - from.x, y: to.y - from.y };
          e.s[e.key] = { x: d.x / 3, y: d.y / 3 };
        }
      }
      if (style === "smooth" && edges.length === 2) {
        const a = n.vertices[edges[0].other],
          b = n.vertices[edges[1].other],
          len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        edges.forEach((e, i) => {
          const old = e.s[e.key],
            r = Math.hypot(old.x, old.y) * (i ? 1 : -1);
          e.s[e.key] = {
            x: ((b.x - a.x) / len) * r,
            y: ((b.y - a.y) / len) * r,
          };
        });
      }
    }
    save(n);
  }
  const r = 5 / zoom;
  return (
    <>
      <g
        ref={group}
        transform={`matrix(${m.join(" ")})`}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={(e) => {
          e.stopPropagation();
          drag.current = null;
          onPanningChange(false);
          setDraft(null);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <g pointerEvents="none">
          <NodeShape
            node={{
              ...node,
              ...networkPatch(node, network),
              width: node.fidelity?.size[0] ?? node.width,
              height: node.fidelity?.size[1] ?? node.height,
            }}
          />
        </g>
        <rect
          x={-100000}
          y={-100000}
          width={200000}
          height={200000}
          fill="transparent"
          onPointerDown={(e) => {
            if (startPan(e)) return;
            e.stopPropagation();
            if (connect) {
              const n = structuredClone(network),
                v = n.vertices.push(point(e)) - 1;
              if (picked.length === 1)
                n.segments.push({
                  a: picked[0],
                  b: v,
                  ha: { x: 0, y: 0 },
                  hb: { x: 0, y: 0 },
                });
              save(n);
              setPicked([v]);
            } else {
              setPicked([]);
              drag.current = {
                network: structuredClone(network),
                start: point(e),
                vertices: [],
                marquee: true,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
        />
        {network.segments.map((s, i) => (
          <path
            key={i}
            aria-label={t("Vector segment {number}", { number: i + 1 })}
            d={segmentPath(network, i)}
            fill="none"
            stroke="#0d99ff"
            strokeWidth={1 / zoom}
            pointerEvents="stroke"
            style={{ cursor: "crosshair" }}
            onPointerDown={(e) => {
              if (!startPan(e)) e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              const p = point(e),
                a = network.vertices[s.a],
                b = network.vertices[s.b];
              let best = 0.5,
                dist = Infinity;
              for (let j = 1; j < 100; j++) {
                const t = j / 100,
                  u = 1 - t,
                  x =
                    u * u * u * a.x +
                    3 * u * u * t * (a.x + s.ha.x) +
                    3 * u * t * t * (b.x + s.hb.x) +
                    t * t * t * b.x,
                  y =
                    u * u * u * a.y +
                    3 * u * u * t * (a.y + s.ha.y) +
                    3 * u * t * t * (b.y + s.hb.y) +
                    t * t * t * b.y,
                  d = (x - p.x) ** 2 + (y - p.y) ** 2;
                if (d < dist) {
                  dist = d;
                  best = t;
                }
              }
              save(splitSegment(network, i, best));
              setPicked([network.vertices.length]);
            }}
          />
        ))}
        {network.segments.flatMap((s, i) =>
          (["ha", "hb"] as const).map((end) => {
            const v = end === "ha" ? s.a : s.b;
            if (!picked.includes(v)) return null;
            const a = network.vertices[v],
              h = s[end],
              x = a.x + h.x,
              y = a.y + h.y;
            return (
              <g key={`${i}-${end}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={x}
                  y2={y}
                  stroke="#0d99ff"
                  strokeWidth={1 / zoom}
                  pointerEvents="none"
                />
                <circle
                  aria-label={t("Control handle {number}", {
                    number: `${i + 1}-${end}`,
                  })}
                  cx={x}
                  cy={y}
                  r={r * 0.8}
                  fill="#fff"
                  stroke="#0d99ff"
                  strokeWidth={1 / zoom}
                  style={{ cursor: "move" }}
                  onPointerDown={(e) => begin(e, v, i, end)}
                />
              </g>
            );
          }),
        )}
        {network.vertices.map((v, i) => (
          <rect
            key={i}
            aria-label={t("Vector node {number}", { number: i + 1 })}
            x={v.x - r}
            y={v.y - r}
            width={r * 2}
            height={r * 2}
            fill={picked.includes(i) ? "#0d99ff" : "#fff"}
            stroke="#0d99ff"
            strokeWidth={1 / zoom}
            style={{ cursor: "move" }}
            onPointerDown={(e) => begin(e, i)}
          />
        ))}
      </g>
      <foreignObject
        x={(16 - view.x) / zoom}
        y={(16 - view.y) / zoom}
        width={width / zoom}
        height={300 / zoom}
        style={{ overflow: "visible", pointerEvents: "none" }}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div
          className="vector-toolbar"
          style={{
            width,
            pointerEvents: "auto",
            transform: `scale(${1 / zoom})`,
            transformOrigin: "top left",
          }}
        >
          {operationError && (
            <div className="vector-operation-error" role="alert">
              {operationError}
            </div>
          )}
          <strong>{t("Edit vector")}</strong>
          <button
            onClick={() => handleStyle("corner")}
            disabled={!picked.length}
          >
            {t("Corner")}
          </button>
          <button
            onClick={() => handleStyle("smooth")}
            disabled={!picked.length}
          >
            {t("Smooth")}
          </button>
          <select
            aria-label={t("Handle mode")}
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="free">{t("Free handles")}</option>
            <option value="aligned">{t("Aligned handles")}</option>
            <option value="mirrored">{t("Mirrored handles")}</option>
          </select>
          <button
            disabled={picked.length !== 2}
            onClick={() =>
              action(() => save(joinVertices(network, picked[0], picked[1])))
            }
          >
            {t("Join nodes")}
          </button>
          <button
            disabled={picked.length !== 2}
            onClick={() =>
              action(() =>
                save(smoothJoinVertices(network, picked[0], picked[1])),
              )
            }
          >
            {t("Smooth join selection")}
          </button>
          <button onClick={() => setConnect(!connect)} aria-pressed={connect}>
            {t("Draw connections")}
          </button>
          <button
            disabled={!picked.length}
            onClick={() => {
              const n = structuredClone(network),
                affected = new Set<number>();
              for (const v of picked) {
                const incident = n.segments.flatMap((s, i) =>
                  s.a === v || s.b === v ? [i] : [],
                );
                incident.forEach((i) => affected.add(i));
                for (const i of incident.slice(1)) {
                  const s = n.segments[i],
                    copy = n.vertices.push({ ...n.vertices[v] }) - 1;
                  if (s.a === v) s.a = copy;
                  else s.b = copy;
                }
              }
              n.regions = n.regions.filter((r) =>
                r.loops.every((l) => l.every((e) => !affected.has(e.segment))),
              );
              save(n);
              setPicked([]);
            }}
          >
            {t("Split vector")}
          </button>
          <button disabled={!picked.length} onClick={() => remove(true)}>
            {t("Delete and heal")}
          </button>
          <button onClick={onSplit}>{t("Split vector into layers")}</button>
          <button onClick={onClose}>{t("Done")}</button>
          <label>
            {t("Simplify tolerance")}
            <input
              aria-label={t("Simplify tolerance")}
              type="number"
              min={0.001}
              max={100}
              step={0.1}
              value={simplifyTolerance}
              onChange={(e) => setSimplifyTolerance(Number(e.target.value))}
            />
          </label>
          <button
            onClick={() =>
              action(() => {
                const next = simplifyNetwork(network, simplifyTolerance);
                if (next.vertices.length !== network.vertices.length) {
                  save(next);
                  setPicked([]);
                }
              })
            }
          >
            {t("Simplify vector")}
          </button>
          <label>
            {t("Offset distance")}
            <input
              aria-label={t("Offset distance")}
              type="number"
              min={-10000}
              max={10000}
              value={offsetDistance}
              onChange={(e) => setOffsetDistance(Number(e.target.value))}
            />
          </label>
          <select
            aria-label={t("Offset joins")}
            value={offsetJoin}
            onChange={(e) => setOffsetJoin(e.target.value as OffsetJoin)}
          >
            <option value="miter">{t("Miter joins")}</option>
            <option value="round">{t("Round joins")}</option>
            <option value="square">{t("Square joins")}</option>
          </select>
          <button
            disabled={offsetDistance === 0}
            onClick={() =>
              action(() => {
                const next = offsetNetwork(network, offsetDistance, {
                  join: offsetJoin,
                });
                if (!next.segments.length)
                  throw Error(
                    "Offset removes all geometry. Choose a smaller distance.",
                  );
                onCommit(offsetNodePatch(node, next));
                setDraft(null);
                setPicked([]);
                setRegion(0);
              })
            }
          >
            {t("Offset vector")}
          </button>
          <div className="vector-region-style">
            <span>{t("Region")}</span>
            <select
              aria-label={t("Region")}
              value={region}
              onChange={(e) => setRegion(Number(e.target.value))}
            >
              {network.regions.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
            {network.regions[region] && (
              <>
                <input
                  type="color"
                  aria-label={t("Region color")}
                  value={
                    network.regions[region].color?.slice(0, 7) ??
                    node.fill.slice(0, 7)
                  }
                  onChange={(e) => {
                    const n = structuredClone(network);
                    n.regions[region].color = e.target.value;
                    n.regions[region].paints = undefined;
                    save(n);
                  }}
                />
                <select
                  aria-label={t("Winding rule")}
                  value={network.regions[region].rule}
                  onChange={(e) => {
                    const n = structuredClone(network);
                    n.regions[region].rule = e.target.value as
                      "nonzero" | "evenodd";
                    save(n);
                  }}
                >
                  <option value="nonzero">{t("Nonzero")}</option>
                  <option value="evenodd">{t("Even odd")}</option>
                </select>
              </>
            )}
            <small>
              {t(
                "Double-click a segment to add a node. Alt-drag a handle to break symmetry.",
              )}
            </small>
            {network.regions[region] && (
              <button onClick={() => setPaintPanel(!paintPanel)}>
                {t("Region fills")}
              </button>
            )}
          </div>
          {paintPanel && network.regions[region] && (
            <RegionPaintEditor
              paints={
                network.regions[region].paints ?? [
                  {
                    type: "solid",
                    opacity: 1,
                    color: network.regions[region].color ?? node.fill,
                  },
                ]
              }
              onChange={(paints) => {
                const n = structuredClone(network);
                n.regions[region].paints = paints.length
                  ? paints
                  : [{ type: "solid", color: "#000000", opacity: 0 }];
                n.regions[region].color = undefined;
                save(n);
              }}
            />
          )}
        </div>
      </foreignObject>
    </>
  );
}
