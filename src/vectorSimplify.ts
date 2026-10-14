import paper from "paper";
import {
  removeVertices,
  segmentPath,
  validateNetwork,
  type Vec,
  type VectorNetwork,
} from "./vectorNetwork";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
const length = (v: Vec) => Math.hypot(v.x, v.y),
  sub = (a: Vec, b: Vec) => ({ x: a.x - b.x, y: a.y - b.y });
function flattened(d: string, tolerance: number): Vec[] {
  const p = new scope.Path({ pathData: d, insert: false });
  p.flatten(tolerance);
  const out = p.segments.map((s) => ({ x: s.point.x, y: s.point.y }));
  p.remove();
  return out;
}
function polyDistance(p: Vec, points: Vec[]) {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t));
  }
  return best;
}
function fit(
  network: VectorNetwork,
  v: number,
  edges: { index: number; other: number }[],
  tolerance: number,
  reference: string,
) {
  const [l, r] = edges,
    A = network.vertices[l.other],
    B = network.vertices[r.other],
    V = network.vertices[v],
    s1 = network.segments[l.index],
    s2 = network.segments[r.index],
    start = s1.a === v ? s1.hb : s1.ha,
    end = s2.a === v ? s2.hb : s2.ha;
  const into = s1.a === v ? s1.ha : s1.hb,
    out = s2.a === v ? s2.ha : s2.hb,
    inDir = length(into) > 1e-10 ? { x: -into.x, y: -into.y } : sub(V, A),
    outDir = length(out) > 1e-10 ? out : sub(B, V);
  // Preserve intentional corners and cusp nodes.
  if (
    length(inDir) < 1e-9 ||
    length(outDir) < 1e-9 ||
    (inDir.x * outDir.x + inDir.y * outDir.y) /
      (length(inDir) * length(outDir)) <
      Math.cos(Math.PI / 4)
  )
    return null;
  const d =
      segmentPath(network, l.index, s1.b !== v) +
      " " +
      segmentPath(network, r.index, s2.a !== v).replace(/^M[^C]+/, ""),
    points = flattened(d, tolerance / 16);
  if (points.length < 3) return { ha: start, hb: end };
  const parameters = [0];
  for (let i = 1; i < points.length; i++)
    parameters.push(parameters[i - 1] + length(sub(points[i], points[i - 1])));
  const total = parameters[parameters.length - 1];
  if (total < 1e-9) return null;
  const tangentA = length(start) > 1e-9 ? start : sub(V, A),
    tangentB = length(end) > 1e-9 ? end : sub(V, B),
    ua = { x: tangentA.x / length(tangentA), y: tangentA.y / length(tangentA) },
    ub = { x: tangentB.x / length(tangentB), y: tangentB.y / length(tangentB) };
  let c00 = 0,
    c01 = 0,
    c11 = 0,
    x0 = 0,
    x1 = 0;
  points.forEach((p, i) => {
    const t = parameters[i] / total,
      u = 1 - t,
      b0 = u * u * u,
      b1 = 3 * u * u * t,
      b2 = 3 * u * t * t,
      b3 = t * t * t,
      a1 = { x: ua.x * b1, y: ua.y * b1 },
      a2 = { x: ub.x * b2, y: ub.y * b2 },
      q = {
        x: p.x - A.x * (b0 + b1) - B.x * (b2 + b3),
        y: p.y - A.y * (b0 + b1) - B.y * (b2 + b3),
      };
    c00 += a1.x * a1.x + a1.y * a1.y;
    c01 += a1.x * a2.x + a1.y * a2.y;
    c11 += a2.x * a2.x + a2.y * a2.y;
    x0 += a1.x * q.x + a1.y * q.y;
    x1 += a2.x * q.x + a2.y * q.y;
  });
  const det = c00 * c11 - c01 * c01,
    alpha = Math.abs(det) > 1e-12 ? (x0 * c11 - x1 * c01) / det : total / 3,
    beta = Math.abs(det) > 1e-12 ? (c00 * x1 - c01 * x0) / det : total / 3;
  if (alpha < 0 || beta < 0 || alpha > total * 2 || beta > total * 2)
    return null;
  const ha = { x: ua.x * alpha, y: ua.y * alpha },
    hb = { x: ub.x * beta, y: ub.y * beta },
    candidate = flattened(
      `M${A.x} ${A.y} C${A.x + ha.x} ${A.y + ha.y} ${B.x + hb.x} ${B.y + hb.y} ${B.x} ${B.y}`,
      tolerance / 16,
    );
  const referencePoints = flattened(reference, tolerance / 16);
  if (
    referencePoints.some(
      (p) => polyDistance(p, candidate) > tolerance * 0.85,
    ) ||
    candidate.some((p) => polyDistance(p, referencePoints) > tolerance * 0.85)
  )
    return null;
  const rest = new scope.CompoundPath({
      pathData: network.segments
        .map((_, i) =>
          i === l.index || i === r.index ? "" : segmentPath(network, i),
        )
        .join(" "),
      insert: false,
    }),
    old = new scope.Path({ pathData: d, insert: false }),
    next = new scope.Path({
      pathData: `M${A.x} ${A.y} C${A.x + ha.x} ${A.y + ha.y} ${B.x + hb.x} ${B.y + hb.y} ${B.x} ${B.y}`,
      insert: false,
    });
  const safe = old.getCrossings(rest).length === next.getCrossings(rest).length;
  rest.remove();
  old.remove();
  next.remove();
  if (!safe) return null;
  return { ha, hb };
}
export function simplifyNetwork(
  original: VectorNetwork,
  tolerance: number,
): VectorNetwork {
  validateNetwork(original);
  if (!Number.isFinite(tolerance) || tolerance < 0.001 || tolerance > 100)
    throw Error("Tolerance must be between 0.001 and 100");
  let n = structuredClone(original),
    sources = original.segments.map((_, segment) => [
      { segment, reverse: false },
    ]);
  // Protected branch/end/corner nodes survive; shared region references are rewritten together.
  for (let v = n.vertices.length - 1; v >= 0; v--) {
    const edges = n.segments.flatMap((s, index) =>
      s.a === v || s.b === v ? [{ index, other: s.a === v ? s.b : s.a }] : [],
    );
    if (
      edges.length !== 2 ||
      edges[0].other === edges[1].other ||
      edges.some((e) => e.other === v) ||
      n.regions.some((r) =>
        r.loops.some(
          (loop) =>
            loop.length <= 3 &&
            loop.some((e) => edges.some((s) => s.index === e.segment)),
        ),
      )
    )
      continue;
    const directed = (index: number, reverse: boolean) =>
      reverse
        ? [...sources[index]]
            .reverse()
            .map((e) => ({ ...e, reverse: !e.reverse }))
        : sources[index];
    const chain = [
      ...directed(edges[0].index, n.segments[edges[0].index].b !== v),
      ...directed(edges[1].index, n.segments[edges[1].index].a !== v),
    ];
    const reference = chain
      .map((e, i) =>
        segmentPath(original, e.segment, e.reverse).replace(
          /^M[^C]+/,
          i ? "" : "$&",
        ),
      )
      .join(" ");
    const handles = fit(n, v, edges, tolerance, reference);
    if (!handles) continue;
    const next = removeVertices(n, [v], true),
      joined = next.segments[next.segments.length - 1];
    joined.ha = handles.ha;
    joined.hb = handles.hb;
    validateNetwork(next);
    sources = sources.filter((_, i) => !edges.some((e) => e.index === i));
    sources.push(chain);
    n = next;
  }
  return n;
}
