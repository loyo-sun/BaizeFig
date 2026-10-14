import paper from "paper";
import {
  type Document,
  type Node,
  ancestors,
  roots,
  makeNode,
  execute,
} from "./core";
import { type VectorPath } from "./fidelity";
import { editableNetwork, bakePaints, strokeOutline } from "./vectorGeometry";
import {
  networkGeometry,
  networkStroke,
  type VectorNetwork,
} from "./vectorNetwork";
import { parsePaths } from "./vectorGeometry";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
function islands(source: VectorPath): string[] {
  const p = new scope.CompoundPath({ pathData: source.d, insert: false });
  p.fillRule = source.rule;
  const result = p.unite(p, { insert: false });
  result.reorient(false, true);
  const paths =
      result instanceof scope.Path
        ? [result]
        : (result.children as paper.Path[]),
    outer = paths.filter((p) => p.clockwise),
    holes = paths.filter((p) => !p.clockwise),
    out = outer.map((p) => ({ path: p, d: p.pathData }));
  for (const hole of holes) {
    const parent = out
      .filter(
        (o) =>
          Math.abs(o.path.area) > Math.abs(hole.area) &&
          o.path.contains(hole.interiorPoint),
      )
      .sort((a, b) => Math.abs(a.path.area) - Math.abs(b.path.area))[0];
    if (parent) parent.d += " " + hole.pathData;
  }
  const d = out.map((o) => o.d);
  p.remove();
  result.remove();
  return d;
}
function child(
  original: Node,
  source: VectorPath,
  d: string,
  strokeWidth: number,
): Node {
  const path = new scope.CompoundPath({ pathData: d, insert: false }),
    box = path.bounds;
  path.remove();
  const sx = original.fidelity?.size[0]
      ? original.width / original.fidelity.size[0]
      : 1,
    sy = original.fidelity?.size[1]
      ? original.height / original.fidelity.size[1]
      : 1;
  const network = parsePaths([{ ...source, d }]);
  for (const v of network.vertices) {
    v.x -= box.x;
    v.y -= box.y;
  }
  const paints = bakePaints(
    source.paints ?? (source.color ? undefined : original.fidelity?.paints),
    source.d,
    [1, 0, 0, 1, -box.x, -box.y],
    original,
  );
  network.regions.forEach((r) => {
    r.paints = paints;
    r.color = source.color;
  });
  return makeNode("path", original.pageId, {
    parentId: original.id,
    name: original.name,
    x: box.x * sx,
    y: box.y * sy,
    width: box.width,
    height: box.height,
    fill: source.color ?? original.fill,
    stroke: original.stroke,
    strokeWidth,
    constraints: { horizontal: "scale", vertical: "scale" },
    variableId:
      !source.color && !source.paints?.length ? original.variableId : undefined,
    fidelity: {
      size: [box.width, box.height],
      linear: [sx, 0, 0, sy],
      network,
      paths: networkGeometry(network),
      strokeCap: original.fidelity?.strokeCap,
      strokeJoin: original.fidelity?.strokeJoin,
      strokeAlign: original.fidelity?.strokeAlign,
      strokeDash: original.fidelity?.strokeDash,
      strokeDashOffset: original.fidelity?.strokeDashOffset,
      strokeMiterLimit: original.fidelity?.strokeMiterLimit,
    },
  });
}
export function splitVectorLayers(
  original: Document,
  ids: string[],
): { doc: Document; selection: string[] } {
  const targets = roots(original, ids);
  if (!targets.length) throw Error("Select at least one vector layer");
  let doc = structuredClone(original);
  const selection: string[] = [];
  for (const n of targets) {
    if (n.locked || ancestors(original, n).some((p) => p.locked))
      throw Error("Unlock layers before editing vectors");
    if (ancestors(original, n).some((p) => p.type === "instance"))
      throw Error("Detach instance before changing its layer structure");
    if (
      !["path", "line", "rectangle", "ellipse", "polygon", "star"].includes(
        n.type,
      )
    )
      throw Error("Select at least one vector layer");
    const network = editableNetwork(n);
    const usage = new Map<number, number>();
    network.regions.forEach((r) =>
      r.loops.forEach((l) =>
        l.forEach((e) => usage.set(e.segment, (usage.get(e.segment) ?? 0) + 1)),
      ),
    );
    const shared = [...usage.values()].some((count) => count > 1),
      separateStroke = n.strokeWidth > 0 && shared,
      parts: Node[] = [];
    for (const source of networkGeometry(network))
      for (const d of islands(source))
        parts.push(child(n, source, d, separateStroke ? 0 : n.strokeWidth));
    const open: VectorNetwork = {
        vertices: network.vertices,
        segments: network.segments.filter((_, i) => !usage.has(i)),
        regions: [],
      },
      lines = new scope.CompoundPath({
        pathData: networkStroke(open),
        insert: false,
      });
    for (const path of lines.children as paper.Path[])
      parts.push(
        child(
          {
            ...n,
            fill: "none",
            fidelity: { ...n.fidelity!, paints: undefined },
          },
          { d: path.pathData, rule: "nonzero", color: "none" },
          path.pathData,
          separateStroke ? 0 : n.strokeWidth,
        ),
      );
    lines.remove();
    if (separateStroke) {
      const contours = n.fidelity?.paths?.filter((p) => p.strokeOutline) ?? [];
      for (const source of contours.length
        ? contours.map((p) => ({
            ...p,
            strokeOutline: false,
            color: p.color ?? n.stroke,
          }))
        : strokeOutline(n))
        for (const d of islands(source))
          parts.push(
            child(
              {
                ...n,
                fill: n.stroke,
                fidelity: { ...n.fidelity!, paints: undefined },
              },
              source,
              d,
              0,
            ),
          );
    }
    if (parts.length <= 1) {
      selection.push(n.id);
      continue;
    }
    const group = doc.nodes.find((node) => node.id === n.id)!;
    group.type = "group";
    group.fill = "none";
    group.variableId = undefined;
    group.stroke = "none";
    group.strokeWidth = 0;
    group.points = undefined;
    group.layout = "none";
    group.importedLayout = undefined;
    group.fidelity = {
      size: n.fidelity?.size ?? [n.width, n.height],
      linear: n.fidelity?.linear,
      effects: n.fidelity?.effects,
      blendMode: n.fidelity?.blendMode,
      mask: n.fidelity?.mask,
      sourceId: n.fidelity?.sourceId,
    };
    parts.forEach((p, i) => (p.name = `${n.name} ${i + 1}`));
    doc = execute(doc, { type: "create", nodes: parts }).doc;
    selection.push(...parts.map((p) => p.id));
  }
  return { doc, selection };
}
