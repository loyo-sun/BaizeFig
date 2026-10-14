import paper from "paper";
import ClipperLib from "clipper-lib";
import type { Node } from "./core";
import { localTransform } from "./core";
import { multiply } from "./fidelity";
import { parsePaths, networkPatch } from "./vectorGeometry";
import {
  networkGeometry,
  networkStroke,
  validateNetwork,
  type Vec,
  type VectorNetwork,
} from "./vectorNetwork";
export type OffsetJoin = "miter" | "round" | "square";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
function append(target: VectorNetwork, source: VectorNetwork) {
  const v = target.vertices.length,
    s = target.segments.length;
  target.vertices.push(...source.vertices);
  target.segments.push(
    ...source.segments.map((e) => ({ ...e, a: e.a + v, b: e.b + v })),
  );
  target.regions.push(
    ...source.regions.map((r) => ({
      ...r,
      loops: r.loops.map((l) =>
        l.map((e) => ({ ...e, segment: e.segment + s })),
      ),
    })),
  );
}
function parallel(
  points: Vec[],
  distance: number,
  join: OffsetJoin,
  tolerance: number,
  miterLimit: number,
): Vec[] {
  const p = points.filter(
    (p, i) =>
      !i || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 1e-9,
  );
  if (p.length < 2) return p;
  const directions = p.slice(1).map((b, i) => {
      const a = p[i],
        l = Math.hypot(b.x - a.x, b.y - a.y);
      return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
    }),
    normal = (i: number) => ({
      x: -directions[i].y * distance,
      y: directions[i].x * distance,
    }),
    first = normal(0),
    out: Vec[] = [{ x: p[0].x + first.x, y: p[0].y + first.y }];
  for (let i = 1; i < p.length - 1; i++) {
    const a = directions[i - 1],
      b = directions[i],
      n = normal(i - 1),
      m = normal(i),
      P = { x: p[i].x + n.x, y: p[i].y + n.y },
      Q = { x: p[i].x + m.x, y: p[i].y + m.y },
      cross = a.x * b.y - a.y * b.x,
      dot = a.x * b.x + a.y * b.y;
    if (Math.abs(cross) < 1e-10) {
      out.push(P);
      if (dot < 0) out.push(Q);
      continue;
    }
    const t = ((Q.x - P.x) * b.y - (Q.y - P.y) * b.x) / cross,
      intersection = { x: P.x + a.x * t, y: P.y + a.y * t },
      inner = cross * distance > 0;
    if (
      inner ||
      (join === "miter" &&
        Math.hypot(intersection.x - p[i].x, intersection.y - p[i].y) <=
          Math.abs(distance) * miterLimit)
    ) {
      out.push(intersection);
      continue;
    }
    if (join === "round") {
      const turn = Math.atan2(cross, dot),
        start = Math.atan2(n.y, n.x),
        steps = Math.max(
          1,
          Math.ceil(
            Math.abs(turn) /
              Math.max(
                0.01,
                2 * Math.acos(Math.max(-1, 1 - tolerance / Math.abs(distance))),
              ),
          ),
        );
      for (let j = 0; j <= steps; j++) {
        const angle = start + (turn * j) / steps;
        out.push({
          x: p[i].x + Math.cos(angle) * Math.abs(distance),
          y: p[i].y + Math.sin(angle) * Math.abs(distance),
        });
      }
    } else out.push(P, Q);
  }
  const last = normal(directions.length - 1);
  out.push({ x: p[p.length - 1].x + last.x, y: p[p.length - 1].y + last.y });
  return out;
}
export function offsetNetwork(
  original: VectorNetwork,
  distance: number,
  {
    join = "miter",
    tolerance = 0.05,
    miterLimit = 4,
  }: { join?: OffsetJoin; tolerance?: number; miterLimit?: number } = {},
): VectorNetwork {
  validateNetwork(original);
  if (
    !Number.isFinite(distance) ||
    Math.abs(distance) > 10000 ||
    !Number.isFinite(tolerance) ||
    tolerance < 0.001 ||
    tolerance > 10 ||
    !Number.isFinite(miterLimit) ||
    miterLimit < 1 ||
    miterLimit > 100 ||
    !["miter", "round", "square"].includes(join)
  )
    throw Error("Invalid offset settings");
  if (distance === 0) return structuredClone(original);
  const scale = 10000,
    result: VectorNetwork = { vertices: [], segments: [], regions: [] };
  for (const source of networkGeometry(original)) {
    const item = new scope.CompoundPath({ pathData: source.d, insert: false });
    item.fillRule = source.rule;
    const resolved = item.unite(item, { insert: false });
    resolved.reorient(source.rule === "nonzero", true);
    const paths =
        resolved instanceof scope.Path
          ? [resolved]
          : (resolved.children as paper.Path[]),
      co = new ClipperLib.ClipperOffset(miterLimit, tolerance * scale);
    for (const path of paths) {
      path.flatten(tolerance);
      if (path.segments.length >= 3)
        co.AddPath(
          path.segments.map((s) => ({
            X: Math.round(s.point.x * scale),
            Y: Math.round(s.point.y * scale),
          })),
          join === "miter"
            ? ClipperLib.JoinType.jtMiter
            : join === "round"
              ? ClipperLib.JoinType.jtRound
              : ClipperLib.JoinType.jtSquare,
          ClipperLib.EndType.etClosedPolygon,
        );
    }
    const output: ClipperLib.Paths = [];
    co.Execute(output, distance * scale);
    const d = output
      .map(
        (poly) =>
          "M" +
          poly.map((p) => `${p.X / scale} ${p.Y / scale}`).join(" L") +
          " Z",
      )
      .join(" ");
    if (d) append(result, parsePaths([{ ...source, d, rule: "nonzero" }]));
    item.remove();
    if (resolved !== item) resolved.remove();
  }
  const used = new Set(
      original.regions.flatMap((r) =>
        r.loops.flatMap((l) => l.map((e) => e.segment)),
      ),
    ),
    open = {
      ...original,
      segments: original.segments.filter((_, i) => !used.has(i)),
      regions: [],
    };
  const degree = new Map<number, number>();
  for (const s of open.segments) {
    degree.set(s.a, (degree.get(s.a) ?? 0) + 1);
    degree.set(s.b, (degree.get(s.b) ?? 0) + 1);
  }
  if ([...degree.values()].some((v) => v > 2))
    throw Error("Outline branched open paths before offsetting");
  const lines = new scope.CompoundPath({
    pathData: networkStroke(open),
    insert: false,
  });
  for (const path of lines.children as paper.Path[]) {
    path.flatten(tolerance);
    if (path.closed) {
      const co = new ClipperLib.ClipperOffset(miterLimit, tolerance * scale);
      co.AddPath(
        path.segments.map((s) => ({
          X: Math.round(s.point.x * scale),
          Y: Math.round(s.point.y * scale),
        })),
        join === "miter"
          ? ClipperLib.JoinType.jtMiter
          : join === "round"
            ? ClipperLib.JoinType.jtRound
            : ClipperLib.JoinType.jtSquare,
        ClipperLib.EndType.etClosedPolygon,
      );
      const out: ClipperLib.Paths = [];
      co.Execute(out, distance * scale);
      const d = out
        .map(
          (poly) =>
            "M" +
            poly.map((p) => `${p.X / scale} ${p.Y / scale}`).join(" L") +
            " Z",
        )
        .join(" ");
      if (d) append(result, parsePaths([{ d, rule: "nonzero" }]));
      continue;
    }
    const points = parallel(
      path.segments.map((s) => ({ x: s.point.x, y: s.point.y })),
      distance,
      join,
      tolerance,
      miterLimit,
    );
    if (points.length > 1)
      append(
        result,
        parsePaths([
          {
            d: points
              .map((p, i) => (i ? "L" : "M") + p.x + " " + p.y)
              .join(" "),
            rule: "nonzero",
          },
        ]),
      );
  }
  lines.remove();
  validateNetwork(result);
  return result;
}

export function offsetNodePatch(
  node: Node,
  network: VectorNetwork,
): Partial<Node> {
  const shape = new scope.CompoundPath({
      pathData: networkStroke(network),
      insert: false,
    }),
    box = shape.bounds;
  shape.remove();
  const original = localTransform(node),
    sx = node.fidelity?.size[0] ? node.width / node.fidelity.size[0] : 1,
    sy = node.fidelity?.size[1] ? node.height / node.fidelity.size[1] : 1,
    next = structuredClone(network);
  for (const v of next.vertices) {
    v.x -= box.x;
    v.y -= box.y;
  }
  for (const region of next.regions)
    for (const paint of region.paints ?? []) {
      if (paint.space === "user")
        paint.transform = multiply(paint.transform ?? [1, 0, 0, 1, 0, 0], [
          1,
          0,
          0,
          1,
          box.x,
          box.y,
        ]);
      if (paint.geometry) {
        paint.geometry.matrix[4] -= box.x;
        paint.geometry.matrix[5] -= box.y;
      }
    }
  const width = box.width * sx,
    height = box.height * sy,
    base = localTransform({ ...node, x: 0, y: 0, width, height }),
    patch = networkPatch(node, next);
  return {
    ...patch,
    x:
      original[4] +
      original[0] * box.x * sx +
      original[2] * box.y * sy -
      base[4],
    y:
      original[5] +
      original[1] * box.x * sx +
      original[3] * box.y * sy -
      base[5],
    width,
    height,
    fidelity: { ...patch.fidelity!, size: [box.width, box.height] },
  };
}
