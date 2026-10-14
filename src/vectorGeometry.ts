import type { ImportedPaint } from "./appearance";
import { dashContours, bevelStroke } from "./strokeContours";
import paper from "paper";
import ClipperLib from "clipper-lib";
import {
  type Document,
  type Node,
  worldTransform,
  roots,
  descendants,
  execute,
  ancestors,
} from "./core";
import { inverse, multiply, type Matrix, type VectorPath } from "./fidelity";
import {
  networkGeometry,
  networkStroke,
  type VectorNetwork,
} from "./vectorNetwork";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
const pathsOf = (item: paper.PathItem): paper.Path[] =>
  item instanceof scope.Path ? [item] : (item.children as paper.Path[]);
export function parsePaths(paths: VectorPath[]): VectorNetwork {
  const n: VectorNetwork = { vertices: [], segments: [], regions: [] };
  for (const source of paths.filter((p) => !p.strokeOutline)) {
    const shape = new scope.CompoundPath({ pathData: source.d, insert: false });
    const loops: VectorNetwork["regions"][number]["loops"] = [];
    for (const path of pathsOf(shape)) {
      const start = n.vertices.length,
        indices: number[] = [];
      path.segments.forEach((s) =>
        n.vertices.push({ x: s.point.x, y: s.point.y }),
      );
      for (let i = 0; i < path.segments.length - (path.closed ? 0 : 1); i++) {
        const a = path.segments[i],
          b = path.segments[(i + 1) % path.segments.length];
        indices.push(
          n.segments.push({
            a: start + i,
            b: start + ((i + 1) % path.segments.length),
            ha: { x: a.handleOut.x, y: a.handleOut.y },
            hb: { x: b.handleIn.x, y: b.handleIn.y },
          }) - 1,
        );
      }
      if (path.closed && indices.length)
        loops.push(indices.map((segment) => ({ segment, reverse: false })));
    }
    if (loops.length)
      n.regions.push({
        loops,
        rule: source.rule,
        color: source.color,
        paints: source.paints,
      });
    shape.remove();
  }
  return n;
}
export function shapePaths(n: Node): VectorPath[] {
  const f = n.fidelity;
  if (f?.network) return networkGeometry(f.network);
  if (f?.paths) return structuredClone(f.paths);
  const w = n.width,
    h = n.height;
  let item: paper.PathItem;
  if (n.type === "ellipse")
    item = new scope.Path.Ellipse({
      rectangle: new scope.Rectangle(0, 0, w, h),
      insert: false,
    });
  else if (n.type === "line" || n.type === "path") {
    const points = n.points?.length
      ? n.points
      : [
          { x: 0, y: 0 },
          { x: w, y: h },
        ];
    item = new scope.Path({
      segments: points.map((p) => new scope.Point(p.x, p.y)),
      insert: false,
    });
  } else if (n.type === "polygon" || n.type === "star") {
    const count = f?.pointCount ?? (n.type === "polygon" ? 3 : 5),
      total = n.type === "star" ? count * 2 : count;
    item = new scope.Path({
      segments: Array.from({ length: total }, (_, i) => {
        const a = (i * Math.PI * 2) / total - Math.PI / 2,
          r = n.type === "star" && i % 2 ? (f?.innerRatio ?? 0.44) : 1;
        return new scope.Point(
          w / 2 + ((Math.cos(a) * w) / 2) * r,
          h / 2 + ((Math.sin(a) * h) / 2) * r,
        );
      }),
      closed: true,
      insert: false,
    });
  } else if (
    ["rectangle", "frame", "group", "component", "instance"].includes(n.type)
  ) {
    const c = f?.corners ?? [n.radius, n.radius, n.radius, n.radius],
      scale = Math.min(
        1,
        w / Math.max(c[0] + c[1], c[2] + c[3], 1),
        h / Math.max(c[0] + c[3], c[1] + c[2], 1),
      ),
      [tl, tr, br, bl] = c.map((v) => v * scale);
    item = new scope.CompoundPath({
      pathData: `M${tl} 0 L${w - tr} 0 Q${w} 0 ${w} ${tr} L${w} ${h - br} Q${w} ${h} ${w - br} ${h} L${bl} ${h} Q0 ${h} 0 ${h - bl} L0 ${tl} Q0 0 ${tl} 0 Z`,
      insert: false,
    });
  } else throw Error("This layer cannot be converted to paths");
  const d = item.pathData;
  item.remove();
  return [{ d, rule: "nonzero" }];
}
export function editableNetwork(n: Node): VectorNetwork {
  if (n.fidelity?.network) return structuredClone(n.fidelity.network);
  const result = parsePaths(shapePaths(n));
  if (!result.vertices.length) throw Error("No editable vector nodes");
  return result;
}
export function networkPatch(n: Node, network: VectorNetwork): Partial<Node> {
  return {
    type: "path",
    points: undefined,
    fidelity: {
      ...n.fidelity,
      size: n.fidelity?.size ?? [n.width, n.height],
      network,
      paths: networkGeometry(network),
      booleanOperation: undefined,
    },
  };
}
export function transformedPath(d: string, m: Matrix) {
  const p = new scope.CompoundPath({ pathData: d, insert: false });
  p.transform(new scope.Matrix(...m));
  const out = p.pathData;
  p.remove();
  return out;
}
// Stroke offsets are generated with a 0.05 local-unit curve tolerance, not a raster image.
export function strokeOutline(n: Node): VectorPath[] {
  if (n.strokeWidth <= 0 || n.stroke === "none") return [];
  const scale = 10000,
    f = n.fidelity,
    center = f?.network
      ? networkStroke(f.network)
      : shapePaths(n)
          .filter((p) => !p.strokeOutline)
          .map((p) => p.d)
          .join(" ");
  const shape = new scope.CompoundPath({ pathData: center, insert: false });
  const co = new ClipperLib.ClipperOffset(
    f?.strokeMiterLimit ?? 4,
    0.01 * scale,
  );
  const allClosed = pathsOf(shape).every((p) => p.closed),
    radius =
      n.strokeWidth /
      (allClosed && f?.strokeAlign && f.strokeAlign !== "center" ? 1 : 2),
    bevel: ClipperLib.Paths = [];
  for (const path of pathsOf(shape)) {
    path.flatten(0.05);
    for (const contour of dashContours(
      path.segments.map((s) => ({ x: s.point.x, y: s.point.y })),
      path.closed,
      f?.strokeDash,
      f?.strokeDashOffset,
    )) {
      if (contour.points.length < 2) continue;
      if (f?.strokeJoin === "bevel") {
        bevel.push(
          ...bevelStroke(
            contour.points,
            contour.closed,
            radius,
            f.strokeCap ?? "butt",
            scale,
          ),
        );
        continue;
      }
      co.AddPath(
        contour.points.map((p) => ({
          X: Math.round(p.x * scale),
          Y: Math.round(p.y * scale),
        })),
        f?.strokeJoin === "round"
          ? ClipperLib.JoinType.jtRound
          : ClipperLib.JoinType.jtMiter,
        contour.closed
          ? ClipperLib.EndType.etClosedLine
          : f?.strokeCap === "round"
            ? ClipperLib.EndType.etOpenRound
            : f?.strokeCap === "square"
              ? ClipperLib.EndType.etOpenSquare
              : ClipperLib.EndType.etOpenButt,
      );
    }
  }
  let out: ClipperLib.Paths = [];
  co.Execute(out, radius * scale);
  shape.remove();
  if (bevel.length) {
    const clipper = new ClipperLib.Clipper();
    clipper.AddPaths(bevel, ClipperLib.PolyType.ptSubject, true);
    out = [];
    clipper.Execute(
      ClipperLib.ClipType.ctUnion,
      out,
      ClipperLib.PolyFillType.pftNonZero,
      ClipperLib.PolyFillType.pftNonZero,
    );
  }
  if (f?.strokeAlign && f.strokeAlign !== "center") {
    const fill = new scope.CompoundPath({
        pathData: shapePaths(n)
          .filter((p) => !p.strokeOutline)
          .map((p) => p.d)
          .join(" "),
        insert: false,
      }),
      stroke = new scope.CompoundPath({
        pathData: out
          .map(
            (poly) =>
              "M" +
              poly.map((p) => `${p.X / scale} ${p.Y / scale}`).join(" L") +
              " Z",
          )
          .join(" "),
        insert: false,
      });
    const closed = pathsOf(fill).every((p) => p.closed);
    if (closed) {
      fill.fillRule = shapePaths(n)[0]?.rule ?? "nonzero";
      const result =
        f.strokeAlign === "inside"
          ? stroke.intersect(fill, { insert: false })
          : stroke.subtract(fill, { insert: false });
      const d = result.pathData;
      fill.remove();
      stroke.remove();
      result.remove();
      return d ? [{ d, rule: "nonzero", color: n.stroke }] : [];
    }
    fill.remove();
    stroke.remove();
  }
  return out.length
    ? [
        {
          d: out
            .map(
              (poly) =>
                "M" +
                poly.map((p) => `${p.X / scale} ${p.Y / scale}`).join(" L") +
                " Z",
            )
            .join(" "),
          rule: "nonzero",
          color: n.stroke,
        },
      ]
    : [];
}
function localScale(n: Node): Matrix {
  return [
    n.fidelity?.size[0] ? n.width / n.fidelity.size[0] : 1,
    0,
    0,
    n.fidelity?.size[1] ? n.height / n.fidelity.size[1] : 1,
    0,
    0,
  ];
}
function silhouette(doc: Document, n: Node, to: Matrix): paper.PathItem {
  const children = doc.nodes.filter((c) => c.parentId === n.id && c.visible),
    mode = n.fidelity?.booleanOperation;
  if (mode) {
    let result: paper.PathItem | undefined;
    for (const child of children) {
      const p = silhouette(doc, child, to);
      if (!result) result = p;
      else {
        const old = result;
        result =
          mode === "union"
            ? old.unite(p, { insert: false })
            : mode === "subtract"
              ? old.subtract(p, { insert: false })
              : mode === "intersect"
                ? old.intersect(p, { insert: false })
                : old.exclude(p, { insert: false });
        old.remove();
        p.remove();
      }
    }
    return result ?? new scope.CompoundPath({ insert: false });
  }
  if (
    n.type === "text" ||
    n.image ||
    n.fidelity?.mask ||
    n.fidelity?.effects?.some((e) => e.visible)
  )
    throw Error(
      "Flatten requires vector layers without masks, images or effects",
    );
  if (["group", "component", "instance"].includes(n.type) && children.length) {
    let result: paper.PathItem = new scope.CompoundPath({ insert: false });
    for (const child of children) {
      const p = silhouette(doc, child, to),
        old = result;
      result = old.unite(p, { insert: false });
      old.remove();
      p.remove();
    }
    return result;
  }
  const entries = shapePaths(n).filter(
      (p) =>
        p.strokeOutline || p.paints?.length || (p.color ?? n.fill) !== "none",
    ),
    m = multiply(to, multiply(worldTransform(doc, n), localScale(n)));
  if (!entries.some((p) => p.strokeOutline) && n.strokeWidth > 0)
    entries.push(...strokeOutline(n));
  let result: paper.PathItem = new scope.CompoundPath({ insert: false });
  for (const entry of entries) {
    const p = new scope.CompoundPath({
      pathData: transformedPath(entry.d, m),
      insert: false,
    });
    p.fillRule = entry.rule;
    const old = result;
    result = old.unite(p, { insert: false });
    old.remove();
    p.remove();
  }
  return result;
}
export function bakePaints(
  paints: ImportedPaint[] | undefined,
  d: string,
  m: Matrix,
  n: Node,
): ImportedPaint[] | undefined {
  if (!paints) return undefined;
  const shape = new scope.CompoundPath({ pathData: d, insert: false }),
    box = shape.bounds;
  shape.remove();
  return paints.map((p) => {
    if (p.type === "solid") return structuredClone(p);
    if (p.type === "image")
      return {
        ...structuredClone(p),
        geometry: {
          matrix: p.geometry ? multiply(m, p.geometry.matrix) : m,
          width: p.geometry?.width ?? n.fidelity?.size[0] ?? n.width,
          height: p.geometry?.height ?? n.fidelity?.size[1] ?? n.height,
        },
      };
    const origin: Matrix =
      p.space === "user"
        ? [1, 0, 0, 1, 0, 0]
        : [box.width || 1, 0, 0, box.height || 1, box.x, box.y];
    try {
      return {
        ...structuredClone(p),
        space: "user" as const,
        transform: inverse(
          multiply(
            m,
            multiply(origin, inverse(p.transform ?? [1, 0, 0, 1, 0, 0])),
          ),
        ),
      };
    } catch {
      return structuredClone(p);
    }
  });
}
export function convertToPaths(
  original: Document,
  ids: string[],
  operation: "flatten" | "outline",
): { doc: Document; selection: string[] } {
  const selected = roots(original, ids);
  if (!selected.length) throw Error("Select at least one layer");
  if (
    selected.some(
      (n) => n.locked || ancestors(original, n).some((p) => p.locked),
    )
  )
    throw Error("Unlock layers before editing vectors");
  if (
    selected.some(
      (n) =>
        n.type === "component" ||
        n.type === "instance" ||
        ancestors(original, n).some((p) => p.type === "instance"),
    )
  )
    throw Error("Detach instance before changing its layer structure");
  if (operation === "outline") {
    let doc = original;
    for (const n of selected) {
      const outlines: VectorPath[] =
        n.fidelity?.paths
          ?.filter((p) => p.strokeOutline)
          .map((p) => ({
            ...p,
            strokeOutline: false,
            color: p.color ?? n.stroke,
          })) ?? [];
      if (!outlines.length) outlines.push(...strokeOutline(n));
      if (!outlines.length) throw Error("No stroke to outline");
      const fills =
        n.fill === "none"
          ? []
          : shapePaths(n)
              .filter((p) => !p.strokeOutline)
              .map((p) => ({
                ...p,
                color: p.color ?? n.fill,
                paints: p.paints ?? (p.color ? undefined : n.fidelity?.paints),
              }));
      const paths = [...fills, ...outlines];
      doc = execute(doc, {
        type: "update",
        ids: [n.id],
        patch: {
          ...networkPatch(n, parsePaths(paths)),
          stroke: "none",
          strokeWidth: 0,
          fill: n.fill === "none" ? n.stroke : n.fill,
          fidelity: {
            ...n.fidelity,
            size: n.fidelity?.size ?? [n.width, n.height],
            paths,
            network: parsePaths(paths),
            paints: undefined,
          },
        },
      }).doc;
    }
    return { doc, selection: selected.map((n) => n.id) };
  }
  if (new Set(selected.map((n) => n.parentId)).size !== 1)
    throw Error("Select layers with the same parent");
  const base = selected[0],
    to = inverse(worldTransform(original, base)),
    deleted = new Set(
      selected
        .slice(1)
        .flatMap((n) => [n.id, ...descendants(original, [n.id])]),
    );
  const paths: VectorPath[] = [];
  function collect(n: Node, clips: string[] = []) {
    const start = paths.length;
    if (
      n.opacity !== 1 ||
      (n.fidelity?.blendMode && n.fidelity.blendMode !== "normal")
    )
      throw Error("Set layer opacity to 100% before flattening");
    if (
      n.type === "text" ||
      n.image ||
      n.fidelity?.mask ||
      n.fidelity?.effects?.some((e) => e.visible)
    )
      throw Error(
        "Flatten requires vector layers without masks, images or effects",
      );
    if (n.fidelity?.booleanOperation) {
      const p = silhouette(original, n, to);
      paths.push({
        d: p.pathData,
        rule: p.fillRule as "nonzero" | "evenodd",
        color: n.fill,
        paints: bakePaints(
          n.fidelity.paints,
          `M0 0 L${n.width} 0 L${n.width} ${n.height} L0 ${n.height} Z`,
          multiply(to, worldTransform(original, n)),
          n,
        ),
      });
      p.remove();
    } else {
      const m = multiply(
          to,
          multiply(worldTransform(original, n), localScale(n)),
        ),
        children = original.nodes.filter(
          (c) => c.parentId === n.id && c.visible,
        );
      if (
        !["group", "component", "instance"].includes(n.type) ||
        n.fill !== "none"
      ) {
        for (const p of shapePaths(n))
          if (
            p.strokeOutline ||
            n.fill !== "none" ||
            (p.color && p.color !== "none")
          )
            paths.push({
              ...p,
              d: transformedPath(p.d, m),
              color: p.color ?? (p.strokeOutline ? n.stroke : n.fill),
              strokeOutline: false,
              paints: bakePaints(
                p.paints ??
                  (!p.color && !p.strokeOutline
                    ? n.fidelity?.paints
                    : undefined),
                p.d,
                m,
                n,
              ),
            });
        if (!n.fidelity?.paths?.some((p) => p.strokeOutline))
          for (const p of strokeOutline(n))
            paths.push({ ...p, d: transformedPath(p.d, m) });
      }
      const childClips =
        n.type === "frame" && n.fidelity?.clipsContent !== false
          ? [...clips, ...shapePaths(n).map((p) => transformedPath(p.d, m))]
          : clips;
      for (const child of children) collect(child, childClips);
    }
    for (let i = start; i < paths.length; i++) {
      const entry = paths[i];
      for (const clip of clips) {
        const p = new scope.CompoundPath({ pathData: entry.d, insert: false }),
          mask = new scope.CompoundPath({ pathData: clip, insert: false });
        p.fillRule = entry.rule;
        const result = p.intersect(mask, { insert: false });
        entry.d = result.pathData;
        entry.rule = result.fillRule as "nonzero" | "evenodd";
        p.remove();
        mask.remove();
        result.remove();
      }
    }
  }
  for (const n of selected) collect(n);
  const network = parsePaths(paths);
  const patch: Partial<Node> = {
    type: "path",
    points: undefined,
    stroke: "none",
    strokeWidth: 0,
    layout: "none",
    fidelity: {
      size: [base.width, base.height],
      linear: base.fidelity?.linear,
      paths,
      network,
    },
    name: "Flatten",
  };
  for (const c of descendants(original, [base.id]))
    if (c !== base.id) deleted.add(c);
  let doc = deleted.size
    ? execute(original, { type: "delete", ids: [...deleted] }).doc
    : original;
  doc = execute(doc, { type: "update", ids: [base.id], patch }).doc;
  return { doc, selection: [base.id] };
}
// Export must include curves and outlined caps outside the saved layer rectangle.
export function vectorVisualBounds(
  doc: Document,
  n: Node,
): { x: number; y: number; width: number; height: number } | null {
  if (
    !n.fidelity?.paths &&
    !n.fidelity?.network &&
    n.type !== "path" &&
    n.type !== "line"
  )
    return null;
  const m = multiply(worldTransform(doc, n), localScale(n)),
    entries = shapePaths(n),
    paths = [...entries];
  if (n.strokeWidth > 0 && !entries.some((p) => p.strokeOutline))
    paths.push(...strokeOutline(n));
  let result: paper.Rectangle | undefined;
  for (const entry of paths) {
    if (!entry.d) continue;
    const p = new scope.CompoundPath({
      pathData: transformedPath(entry.d, m),
      insert: false,
    });
    if (p.children.length)
      result = result ? result.unite(p.bounds) : p.bounds.clone();
    p.remove();
  }
  return result
    ? { x: result.x, y: result.y, width: result.width, height: result.height }
    : null;
}
