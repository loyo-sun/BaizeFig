import type { VectorPath } from "./fidelity";
import type { ImportedPaint } from "./appearance";
export type Vec = { x: number; y: number };
export interface VectorNetwork {
  vertices: Vec[];
  segments: { a: number; b: number; ha: Vec; hb: Vec }[];
  regions: {
    loops: { segment: number; reverse: boolean }[][];
    rule: "evenodd" | "nonzero";
    color?: string;
    paints?: ImportedPaint[];
  }[];
}
export function validateNetwork(n: VectorNetwork) {
  const point = (p: Vec) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  if (
    !n ||
    !Array.isArray(n.vertices) ||
    !Array.isArray(n.segments) ||
    !Array.isArray(n.regions) ||
    n.vertices.length > 40000 ||
    n.segments.length > 80000 ||
    n.regions.length > 20000 ||
    !n.vertices.every(point) ||
    !n.segments.every(
      (s) =>
        Number.isInteger(s.a) &&
        Number.isInteger(s.b) &&
        !!n.vertices[s.a] &&
        !!n.vertices[s.b] &&
        point(s.ha) &&
        point(s.hb),
    ) ||
    !n.regions.every(
      (r) =>
        ["evenodd", "nonzero"].includes(r.rule) &&
        Array.isArray(r.loops) &&
        r.loops.every(
          (loop) =>
            Array.isArray(loop) &&
            loop.length <= n.segments.length &&
            loop.every((e, i) => {
              const s = n.segments[e.segment],
                next = n.segments[loop[(i + 1) % loop.length].segment];
              return (
                !!s &&
                !!next &&
                typeof e.reverse === "boolean" &&
                (e.reverse ? s.a : s.b) ===
                  (loop[(i + 1) % loop.length].reverse ? next.b : next.a)
              );
            }),
        ),
    )
  )
    throw Error("Invalid vector network");
}
export function segmentPath(n: VectorNetwork, index: number, reverse = false) {
  const s = n.segments[index],
    a = n.vertices[reverse ? s.b : s.a],
    b = n.vertices[reverse ? s.a : s.b],
    ha = reverse ? s.hb : s.ha,
    hb = reverse ? s.ha : s.hb;
  return `M${a.x} ${a.y} C${a.x + ha.x} ${a.y + ha.y} ${b.x + hb.x} ${b.y + hb.y} ${b.x} ${b.y}`;
}
export function networkGeometry(n: VectorNetwork): VectorPath[] {
  const paths: VectorPath[] = n.regions.map((r, region) => ({
    d: r.loops
      .map(
        (loop) =>
          loop
            .map((e, i) =>
              segmentPath(n, e.segment, e.reverse).replace(
                /^M[^C]+/,
                i ? "" : "$&",
              ),
            )
            .join(" ") + " Z",
      )
      .join(" "),
    rule: r.rule,
    color: r.color,
    paints: r.paints,
    region,
  }));
  return paths;
}
export function networkStroke(n: VectorNetwork) {
  const used = new Set<number>(),
    adjacency: number[][] = n.vertices.map(() => []),
    paths: string[] = [];
  n.segments.forEach((s, i) => {
    adjacency[s.a].push(i);
    if (s.b !== s.a) adjacency[s.b].push(i);
  });
  function trail(start: number, index: number) {
    let current = start,
      edge = index,
      d = "",
      count = 0;
    while (!used.has(edge)) {
      used.add(edge);
      const s = n.segments[edge],
        reverse = s.b === current;
      d +=
        segmentPath(n, edge, reverse).replace(/^M[^C]+/, count++ ? "" : "$&") +
        " ";
      current = reverse ? s.a : s.b;
      if (current === start) {
        d += "Z";
        break;
      }
      if (adjacency[current].length !== 2) break;
      const next = adjacency[current].find((i) => !used.has(i));
      if (next === undefined) break;
      edge = next;
    }
    paths.push(d);
  }
  adjacency.forEach((edges, v) => {
    if (edges.length !== 2)
      for (const i of edges) if (!used.has(i)) trail(v, i);
  });
  n.segments.forEach((s, i) => {
    if (!used.has(i)) trail(s.a, i);
  });
  return paths.join(" ");
}
export function splitSegment(
  original: VectorNetwork,
  index: number,
  t = 0.5,
): VectorNetwork {
  const n = structuredClone(original),
    s = n.segments[index];
  if (!s || t <= 0 || t >= 1) throw Error("Invalid segment");
  const a = n.vertices[s.a],
    b = n.vertices[s.b],
    c = { x: a.x + s.ha.x, y: a.y + s.ha.y },
    d = { x: b.x + s.hb.x, y: b.y + s.hb.y };
  const mix = (a: Vec, b: Vec) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    }),
    sub = (a: Vec, b: Vec) => ({ x: a.x - b.x, y: a.y - b.y });
  const ac = mix(a, c),
    cd = mix(c, d),
    db = mix(d, b),
    left = mix(ac, cd),
    right = mix(cd, db),
    p = mix(left, right),
    v = n.vertices.push(p) - 1,
    j = n.segments.length;
  n.segments[index] = { a: s.a, b: v, ha: sub(ac, a), hb: sub(left, p) };
  n.segments.push({ a: v, b: s.b, ha: sub(right, p), hb: sub(db, b) });
  for (const r of n.regions)
    for (let i = 0; i < r.loops.length; i++)
      r.loops[i] = r.loops[i].flatMap((e) =>
        e.segment !== index
          ? [e]
          : e.reverse
            ? [{ segment: j, reverse: true }, e]
            : [e, { segment: j, reverse: false }],
      );
  return n;
}
export function removeVertices(
  original: VectorNetwork,
  ids: number[],
  heal = false,
): VectorNetwork {
  const n = structuredClone(original),
    removed = new Set<number>();
  for (const v of ids) {
    const edges = n.segments
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => !removed.has(i) && (s.a === v || s.b === v));
    if (heal && edges.length === 2) {
      const [l, r] = edges,
        a = l.s.a === v ? l.s.b : l.s.a,
        b = r.s.a === v ? r.s.b : r.s.a;
      const index =
        n.segments.push({
          a,
          b,
          ha: l.s.a === v ? l.s.hb : l.s.ha,
          hb: r.s.a === v ? r.s.hb : r.s.ha,
        }) - 1;
      for (const region of n.regions)
        for (let i = 0; i < region.loops.length; i++) {
          const loop = region.loops[i],
            start = loop.findIndex(
              (e) => e.segment === l.i || e.segment === r.i,
            );
          if (
            start >= 0 &&
            loop.some((e) => e.segment === l.i) &&
            loop.some((e) => e.segment === r.i)
          ) {
            const rotated = [...loop.slice(start), ...loop.slice(0, start)];
            const first = rotated[0],
              s = n.segments[first.segment],
              from = first.reverse ? s.b : s.a;
            if (from === v) {
              rotated.unshift(rotated.pop()!);
            }
            const e = rotated[0],
              q = n.segments[e.segment],
              from2 = e.reverse ? q.b : q.a;
            region.loops[i] = [
              { segment: index, reverse: from2 !== a },
              ...rotated.filter((e) => e.segment !== l.i && e.segment !== r.i),
            ];
          }
        }
    }
    for (const e of edges) removed.add(e.i);
  }
  n.regions = n.regions.filter((r) =>
    r.loops.every((loop) => loop.every((e) => !removed.has(e.segment))),
  );
  const smap = new Map<number, number>(),
    vmap = new Map<number, number>();
  n.vertices = n.vertices.filter(
    (_, i) => !ids.includes(i) && (vmap.set(i, vmap.size), true),
  );
  n.segments = n.segments
    .filter((_, i) => !removed.has(i) && (smap.set(i, smap.size), true))
    .map((s) => ({ ...s, a: vmap.get(s.a)!, b: vmap.get(s.b)! }));
  n.regions.forEach((r) =>
    r.loops.forEach((l) =>
      l.forEach((e) => (e.segment = smap.get(e.segment)!)),
    ),
  );
  return n;
}
export function joinVertices(
  original: VectorNetwork,
  a: number,
  b: number,
): VectorNetwork {
  const n = structuredClone(original);
  if (a === b || !n.vertices[a] || !n.vertices[b])
    throw Error("Select two unconnected nodes");
  const segment =
    n.segments.push({ a, b, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } }) - 1;
  // Find an existing trail. Closing a trail creates a fillable face, including branches.
  const queue = [b],
    prev = new Map<number, { from: number; edge: number }>(),
    visited = new Set([b]);
  for (let head = 0; head < queue.length && !visited.has(a); head++) {
    const v = queue[head];
    for (let i = 0; i < segment; i++) {
      const s = n.segments[i];
      if (s.a !== v && s.b !== v) continue;
      const other = s.a === v ? s.b : s.a;
      if (!visited.has(other)) {
        visited.add(other);
        prev.set(other, { from: v, edge: i });
        queue.push(other);
      }
    }
  }
  const trail: { segment: number; reverse: boolean }[] = [];
  if (visited.has(a)) {
    let current = a;
    while (current !== b) {
      const p = prev.get(current)!;
      trail.unshift({
        segment: p.edge,
        reverse: n.segments[p.edge].b === p.from,
      });
      current = p.from;
    }
  }
  if (trail.length)
    n.regions.push({
      loops: [[{ segment, reverse: false }, ...trail]],
      rule: "nonzero",
    });
  return n;
}
