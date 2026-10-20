import {
  ancestors,
  descendants,
  execute,
  type Document,
  type Node,
} from "./core";
import type { ImportedPaint } from "./appearance";
type Target = { id: string; path: (string | number)[] };
export function selectionColors(doc: Document, ids: string[]) {
  const selected = new Set(descendants(doc, ids));
  const colors = new Map<string, Target[]>();
  for (const node of doc.nodes.filter((n) => selected.has(n.id) && n.visible)) {
    const add = (value: unknown, path: Target["path"]) => {
      if (
        typeof value !== "string" ||
        !/^#[a-f0-9]{6}([a-f0-9]{2})?$/i.test(value)
      )
        return;
      const color = value.toUpperCase();
      colors.set(color, [...(colors.get(color) ?? []), { id: node.id, path }]);
    };
    const paints = (
      values: ImportedPaint[] | undefined,
      path: Target["path"],
    ) =>
      values?.forEach((paint, i) => {
        if (paint.type === "solid") add(paint.color, [...path, i, "color"]);
        paint.stops?.forEach((stop, j) =>
          add(stop.color, [...path, i, "stops", j, "color"]),
        );
      });
    if (!node.fidelity?.paints?.length) add(node.fill, ["fill"]);
    if (node.strokeWidth) add(node.stroke, ["stroke"]);
    paints(node.fidelity?.paints, ["fidelity", "paints"]);
    node.fidelity?.paths?.forEach((path, i) => {
      add(path.color, ["fidelity", "paths", i, "color"]);
      paints(path.paints, ["fidelity", "paths", i, "paints"]);
    });
    node.fidelity?.network?.regions.forEach((region, i) => {
      add(region.color, ["fidelity", "network", "regions", i, "color"]);
      paints(region.paints, ["fidelity", "network", "regions", i, "paints"]);
    });
    node.textFlow?.runs?.forEach((run, i) =>
      add(run.fill, ["textFlow", "runs", i, "fill"]),
    );
    node.fidelity?.text?.spans?.forEach((run, i) =>
      add(run.fill, ["fidelity", "text", "spans", i, "fill"]),
    );
  }
  return colors;
}
export function replaceSelectionColor(
  doc: Document,
  targets: Target[],
  color: string,
) {
  let next = doc;
  for (const id of new Set(targets.map((t) => t.id))) {
    const node = next.nodes.find((n) => n.id === id)!;
    if (node.locked || ancestors(next, node).some((n) => n.locked)) continue;
    const copy = structuredClone(node);
    const patch: Partial<Node> = {};
    for (const { path } of targets.filter((t) => t.id === id)) {
      let cursor: any = copy;
      for (const part of path.slice(0, -1)) cursor = cursor[part];
      const old = cursor[path[path.length - 1]] as string;
      cursor[path[path.length - 1]] =
        color.slice(0, 7) + (old.length === 9 ? old.slice(7) : "");
      const key = path[0] as keyof Node;
      Object.assign(patch, { [key]: copy[key] });
    }
    // Explicit fidelity retains other region colors when replacing a base color.
    if (patch.fill !== undefined && node.fidelity)
      patch.fidelity ??= copy.fidelity;
    next = execute(next, { type: "update", ids: [id], patch }).doc;
  }
  return next;
}
