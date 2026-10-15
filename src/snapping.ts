import { frameGridRects } from "./FrameGrid";
import {
  ancestors,
  bounds,
  descendants,
  worldTransform,
  type Document,
} from "./core";
import { transformPoint } from "./fidelity";
import { editableNetwork } from "./vectorGeometry";
export type SnapOptions = {
  objects: boolean;
  geometry: boolean;
  pixel: boolean;
};
export const defaultSnapOptions: SnapOptions = {
  objects: true,
  geometry: true,
  pixel: false,
};
export type SnapTarget = {
  axis: "x" | "y";
  value: number;
  from: number;
  to: number;
  kind: "objects" | "geometry";
};
export type SnapGuide = SnapTarget & { moving: number };
export function snapTargets(
  doc: Document,
  page: string,
  exclude: string[] = [],
): SnapTarget[] {
  const skip = new Set(descendants(doc, exclude));
  const guides: SnapTarget[] = (doc.guides ?? [])
    .filter((g) => g.pageId === page)
    .map((g) => ({
      axis: g.axis,
      value: g.position,
      from: 0,
      to: 0,
      kind: "objects",
    }));
  return [
    ...guides,
    ...doc.nodes
      .filter(
        (n) =>
          n.pageId === page &&
          !skip.has(n.id) &&
          n.visible &&
          !ancestors(doc, n).some((a) => !a.visible),
      )
      .flatMap((n) => {
        const b = bounds(doc, [n]);
        const result: SnapTarget[] = [
          b.x,
          b.x + b.width / 2,
          b.x + b.width,
        ].map((value) => ({
          axis: "x",
          value,
          from: b.y,
          to: b.y + b.height,
          kind: "objects",
        }));
        result.push(
          ...[b.y, b.y + b.height / 2, b.y + b.height].map((value) => ({
            axis: "y" as const,
            value,
            from: b.x,
            to: b.x + b.width,
            kind: "objects" as const,
          })),
        );
        if (n.frameGrid?.visible) {
          const m = worldTransform(doc, n);
          for (const r of frameGridRects(n))
            for (const [x, y] of [
              [r.x, r.y],
              [r.x + r.width, r.y + r.height],
            ]) {
              const p = transformPoint(m, x, y);
              result.push(
                { axis: "x", value: p.x, from: p.y, to: p.y, kind: "objects" },
                { axis: "y", value: p.y, from: p.x, to: p.x, kind: "objects" },
              );
            }
        }
        // Geometry candidates are actual path vertices in world coordinates, including rotated parents.
        if (
          ["path", "line", "rectangle", "ellipse", "polygon", "star"].includes(
            n.type,
          )
        ) {
          let network;
          try {
            network = editableNetwork(n);
          } catch {
            return result;
          }
          const m = worldTransform(doc, n),
            sx = n.fidelity?.size[0] ? n.width / n.fidelity.size[0] : 1,
            sy = n.fidelity?.size[1] ? n.height / n.fidelity.size[1] : 1;
          for (const v of network.vertices) {
            const p = transformPoint(m, v.x * sx, v.y * sy);
            result.push(
              { axis: "x", value: p.x, from: p.y, to: p.y, kind: "geometry" },
              { axis: "y", value: p.y, from: p.x, to: p.x, kind: "geometry" },
            );
          }
        }
        return result;
      }),
  ];
}
export function snapCoordinates(
  xs: number[],
  ys: number[],
  targets: SnapTarget[],
  options: SnapOptions,
  zoom: number,
  disabled = false,
) {
  const guides: SnapGuide[] = [];
  function axis(axis: "x" | "y", values: number[], orthogonal: number[]) {
    if (disabled) return 0;
    let best: SnapTarget | undefined,
      correction = Infinity;
    for (const target of targets) {
      if (target.axis !== axis || !options[target.kind]) continue;
      for (const value of values) {
        const delta = target.value - value;
        if (
          Math.abs(delta) <= 5 / zoom &&
          Math.abs(delta) < Math.abs(correction)
        ) {
          best = target;
          correction = delta;
        }
      }
    }
    if (best) {
      guides.push({
        ...best,
        moving: orthogonal[0] ?? 0,
        from: Math.min(best.from, ...orthogonal),
        to: Math.max(best.to, ...orthogonal),
      });
      return correction;
    }
    return options.pixel && values.length
      ? Math.round(values[0]) - values[0]
      : 0;
  }
  return { x: axis("x", xs, ys), y: axis("y", ys, xs), guides };
}
