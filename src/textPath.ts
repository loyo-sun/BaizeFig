import { segmentPath, type VectorNetwork } from "./vectorNetwork";
export interface PathText {
  network: VectorNetwork;
  offset: number;
  reverse: boolean;
}
export interface SavedGlyph {
  d: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  start: number;
}
// One continuous, unbranched baseline. Preserve the start vertex when reversing a loop.
export function baselineTrail(n: VectorNetwork, reverse = false) {
  const adjacency: number[][] = n.vertices.map(() => []);
  n.segments.forEach((s, i) => {
    adjacency[s.a].push(i);
    adjacency[s.b].push(i);
  });
  if (!n.segments.length || adjacency.some((a) => a.length > 2))
    throw Error("Invalid text baseline");
  const ends = adjacency.flatMap((a, i) => (a.length === 1 ? [i] : []));
  if (ends.length !== 0 && ends.length !== 2)
    throw Error("Invalid text baseline");
  let vertex = ends.length ? (reverse ? ends[1] : ends[0]) : n.segments[0].a;
  const used = new Set<number>(),
    trail: { segment: number; reverse: boolean }[] = [];
  while (used.size < n.segments.length) {
    const options = adjacency[vertex].filter((i) => !used.has(i));
    const edge =
      reverse && !trail.length && !ends.length ? options.at(-1) : options[0];
    if (edge === undefined) throw Error("Disconnected text baseline");
    const s = n.segments[edge],
      back = s.a === s.b ? reverse : s.b === vertex;
    used.add(edge);
    trail.push({ segment: edge, reverse: back });
    vertex = back ? s.a : s.b;
  }
  return { trail, closed: ends.length === 0 };
}
export function textBaselineD(p: PathText) {
  const { trail, closed } = baselineTrail(p.network, p.reverse);
  return (
    trail
      .map((e, i) =>
        segmentPath(p.network, e.segment, e.reverse).replace(
          /^M[^C]+/,
          i ? "" : "$&",
        ),
      )
      .join(" ") + (closed ? " Z" : "")
  );
}
export function nearestBaselineOffset(
  p: PathText,
  point: { x: number; y: number },
) {
  const { trail } = baselineTrail(p.network, p.reverse);
  let total = 0,
    best = Infinity,
    bestLength = 0;
  for (const edge of trail) {
    const s = p.network.segments[edge.segment],
      a = p.network.vertices[edge.reverse ? s.b : s.a],
      b = p.network.vertices[edge.reverse ? s.a : s.b];
    const ha = edge.reverse ? s.hb : s.ha,
      hb = edge.reverse ? s.ha : s.hb;
    let previous = a;
    for (let i = 1; i <= 128; i++) {
      const t = i / 128,
        u = 1 - t;
      const next = {
        x:
          u * u * u * a.x +
          3 * u * u * t * (a.x + ha.x) +
          3 * u * t * t * (b.x + hb.x) +
          t * t * t * b.x,
        y:
          u * u * u * a.y +
          3 * u * u * t * (a.y + ha.y) +
          3 * u * t * t * (b.y + hb.y) +
          t * t * t * b.y,
      };
      const dx = next.x - previous.x,
        dy = next.y - previous.y,
        len = Math.hypot(dx, dy);
      const f = len
        ? Math.max(
            0,
            Math.min(
              1,
              ((point.x - previous.x) * dx + (point.y - previous.y) * dy) /
                (len * len),
            ),
          )
        : 0;
      const distance = Math.hypot(
        point.x - previous.x - f * dx,
        point.y - previous.y - f * dy,
      );
      if (distance < best) {
        best = distance;
        bestLength = total + f * len;
      }
      total += len;
      previous = next;
    }
  }
  return total ? bestLength / total : 0;
}
