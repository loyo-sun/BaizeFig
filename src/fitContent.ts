import {
  ancestors,
  localTransform,
  worldTransform,
  setWorldTransform,
  relayout,
  validateDocument,
  type Document,
  type Node,
} from "./core";
import { multiply, transformPoint } from "./fidelity";
import { nodeSelectionBounds } from "./pathBounds";
import { updateLibraryFromMain, synchronizeInstances } from "./components";

export function canFitContent(doc: Document, node: Node) {
  return (
    ["frame", "component"].includes(node.type) &&
    !node.componentSetId &&
    !node.componentOwner &&
    (!node.layout || node.layout === "none") &&
    ![node, ...ancestors(doc, node)].some(
      (n) => n.locked || n.type === "instance",
    ) &&
    doc.nodes.some((n) => n.parentId === node.id && n.visible)
  );
}

// Resize the container around its children, without resizing or moving their artwork.
export function fitContent(original: Document, id: string): Document {
  const before = original.nodes.find((n) => n.id === id);
  if (!before || !canFitContent(original, before))
    throw Error("Select an editable freeform container with content");
  const children = original.nodes.filter((n) => n.parentId === id);
  const points = children
    .filter((n) => n.visible)
    .flatMap((n) => {
      const b = nodeSelectionBounds(n),
        m = localTransform(n);
      return [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ].map(([x, y]) => transformPoint(m, x, y));
    });
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  const doc = structuredClone(original),
    node = doc.nodes.find((n) => n.id === id)!;
  node.width = Math.max(1, Math.max(...points.map((p) => p.x)) - x);
  node.height = Math.max(1, Math.max(...points.map((p) => p.y)) - y);
  node.layoutItem = {
    ...node.layoutItem,
    horizontalSizing: "fixed",
    verticalSizing: "fixed",
  };
  setWorldTransform(
    doc,
    node,
    multiply(worldTransform(original, before), [1, 0, 0, 1, x, y]),
  );
  for (const child of children)
    setWorldTransform(
      doc,
      doc.nodes.find((n) => n.id === child.id)!,
      worldTransform(original, child),
    );
  // Do not apply resize constraints: fitting must preserve the existing child geometry.
  const affected = new Set([id, ...ancestors(doc, node).map((n) => n.id)]);
  relayout(doc, affected);
  updateLibraryFromMain(doc, [...affected]);
  synchronizeInstances(doc, [...affected]);
  relayout(doc, affected);
  validateDocument(doc);
  return doc;
}
