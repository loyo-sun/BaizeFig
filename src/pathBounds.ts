import type { Node } from "./core";
import type { VectorNetwork } from "./vectorNetwork";
function extrema(a: number, b: number, c: number, d: number) {
  const A = -a + 3 * b - 3 * c + d,
    B = 2 * (a - 2 * b + c),
    C = b - a;
  if (Math.abs(A) < 1e-12)
    return Math.abs(B) < 1e-12 ? [] : [-C / B].filter((t) => t > 0 && t < 1);
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  return [
    (-B + Math.sqrt(disc)) / (2 * A),
    (-B - Math.sqrt(disc)) / (2 * A),
  ].filter((t) => t > 0 && t < 1);
}
export function networkBounds(network: VectorNetwork) {
  const points = [...network.vertices];
  for (const s of network.segments) {
    const a = network.vertices[s.a],
      d = network.vertices[s.b],
      b = { x: a.x + s.ha.x, y: a.y + s.ha.y },
      c = { x: d.x + s.hb.x, y: d.y + s.hb.y };
    for (const t of new Set([
      ...extrema(a.x, b.x, c.x, d.x),
      ...extrema(a.y, b.y, c.y, d.y),
    ])) {
      const u = 1 - t;
      points.push({
        x:
          u * u * u * a.x +
          3 * u * u * t * b.x +
          3 * u * t * t * c.x +
          t * t * t * d.x,
        y:
          u * u * u * a.y +
          3 * u * u * t * b.y +
          3 * u * t * t * c.y +
          t * t * t * d.y,
      });
    }
  }
  if (!points.length) return { x: 0, y: 0, width: 1, height: 1 };
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
// Imported source rectangles retain their original sizing semantics.
export function nodeSelectionBounds(n: Node) {
  if (n.type !== "path" || !n.fidelity?.network || n.fidelity.sourceId)
    return { x: 0, y: 0, width: n.width, height: n.height };
  const b = networkBounds(n.fidelity.network),
    sx = n.width / (n.fidelity.size[0] || 1),
    sy = n.height / (n.fidelity.size[1] || 1);
  return {
    x: b.x * sx,
    y: b.y * sy,
    width: Math.max(1, b.width * sx),
    height: Math.max(1, b.height * sy),
  };
}
