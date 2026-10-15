import { makeNode, worldTransform, type Document } from "./core";
import { inverse, transformPoint } from "./fidelity";
import type { VectorNetwork, Vec } from "./vectorNetwork";
import { networkBounds } from "./pathBounds";
export interface PenAnchor extends Vec {
  incoming: Vec;
  outgoing: Vec;
  independent?: boolean;
}
export interface HandleDrag {
  start: Vec;
  original: Vec;
  opposite: Vec;
  independent: boolean;
}
export function dragHandle(
  drag: HandleDrag,
  pointer: Vec,
  alt: boolean,
  shift = false,
) {
  drag.independent ||= alt;
  let x = drag.original.x + pointer.x - drag.start.x,
    y = drag.original.y + pointer.y - drag.start.y;
  if (shift) {
    const angle = (Math.round(Math.atan2(y, x) / (Math.PI / 4)) * Math.PI) / 4,
      length = Math.hypot(x, y);
    x = Math.cos(angle) * length;
    y = Math.sin(angle) * length;
  }
  const handle = { x, y };
  if (!drag.independent) drag.opposite = { x: -x, y: -y };
  return { handle, opposite: { ...drag.opposite } };
}
export function penNetwork(
  anchors: PenAnchor[],
  closed = false,
): VectorNetwork {
  return {
    vertices: anchors.map(({ x, y }) => ({ x, y })),
    segments: anchors
      .slice(0, closed ? anchors.length : Math.max(0, anchors.length - 1))
      .map((a, i) => ({
        a: i,
        b: (i + 1) % anchors.length,
        ha: { ...a.outgoing },
        hb: { ...anchors[(i + 1) % anchors.length].incoming },
      })),
    regions: closed
      ? [
          {
            loops: [anchors.map((_, segment) => ({ segment, reverse: false }))],
            rule: "nonzero",
          },
        ]
      : [],
  };
}
export function pencilNetwork(points: Vec[]): VectorNetwork {
  // Interpolating cubic segments keep every sampled pointer position on the curve.
  const anchors = points.map((p, i) => {
    const previous = points[Math.max(0, i - 1)],
      next = points[Math.min(points.length - 1, i + 1)],
      dx = (next.x - previous.x) / 6,
      dy = (next.y - previous.y) / 6;
    const length = Math.hypot(dx, dy),
      limit =
        Math.min(
          i ? Math.hypot(p.x - previous.x, p.y - previous.y) : Infinity,
          i + 1 < points.length
            ? Math.hypot(next.x - p.x, next.y - p.y)
            : Infinity,
        ) / 3,
      scale = length ? Math.min(1, limit / length) : 0;
    return {
      ...p,
      incoming: { x: -dx * scale, y: -dy * scale },
      outgoing: { x: dx * scale, y: dy * scale },
    };
  });
  return penNetwork(anchors);
}
export function drawnPath(
  doc: Document,
  pageId: string,
  network: VectorNetwork,
  parentId: string | null,
) {
  const parent = doc.nodes.find((n) => n.id === parentId),
    m = parent ? inverse(worldTransform(doc, parent)) : undefined;
  const local: VectorNetwork = structuredClone(network);
  if (m) {
    local.vertices = local.vertices.map((v) => transformPoint(m, v.x, v.y));
    for (const s of local.segments)
      for (const k of ["ha", "hb"] as const) {
        const v = s[k];
        s[k] = { x: m[0] * v.x + m[2] * v.y, y: m[1] * v.x + m[3] * v.y };
      }
  }
  const box = networkBounds(local),
    { x, y } = box,
    width = Math.max(1, box.width),
    height = Math.max(1, box.height);
  local.vertices = local.vertices.map((v) => ({ x: v.x - x, y: v.y - y }));
  return makeNode("path", pageId, {
    parentId,
    x,
    y,
    width,
    height,
    fill: "none",
    stroke: "#202a24",
    strokeWidth: 1,
    fidelity: { size: [width, height], network: local },
  });
}
