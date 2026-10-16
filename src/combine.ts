import { type Document, type Node, execute, roots } from "./core";
export function combineShapes(
  original: Document,
  ids: string[],
  mode: NonNullable<NonNullable<Node["fidelity"]>["booleanOperation"]> | "mask",
): { doc: Document; id: string } {
  const selected = roots(original, ids);
  if (!selected.length) throw Error("Select at least one layer");
  if (mode === "mask" && selected.length < 2)
    throw Error("Select at least two layers");
  if (new Set(selected.map((n) => n.pageId)).size !== 1)
    throw Error("Cannot group across pages");
  const result = execute(original, { type: "group", ids }),
    group = result.doc.nodes.find((n) => n.id === result.selection?.[0])!;
  if (mode === "mask") {
    const bottom = result.doc.nodes.find((n) => n.parentId === group.id)!;
    bottom.fidelity = {
      ...bottom.fidelity,
      size: bottom.fidelity?.size ?? [bottom.width, bottom.height],
      mask: "alpha",
    };
  } else {
    group.fill = selected[0].fill === "none" ? "#0d99ff" : selected[0].fill;
    group.fidelity = {
      ...group.fidelity,
      size: [group.width, group.height],
      booleanOperation: mode,
    };
  }
  group.name = mode === "mask" ? "Mask group" : `Boolean ${mode}`;
  return { doc: result.doc, id: group.id };
}
