import { ancestors, type Document } from "./core";

// Preview and click must resolve to the same selectable layer.
export function canvasTarget(
  doc: Document,
  id: string | undefined,
  scope: string | null,
  deep = false,
) {
  const node = doc.nodes.find((n) => n.id === id);
  if (!node || !node.visible || node.locked) return undefined;
  const parents = ancestors(doc, node);
  if (parents.some((n) => n.locked || !n.visible)) return undefined;
  if (deep) return node;
  const within = scope ? parents.findIndex((n) => n.id === scope) : -1;
  const candidates = within >= 0 ? parents.slice(0, within) : parents;
  return (
    [...candidates]
      .reverse()
      .find((n) => ["group", "component", "instance"].includes(n.type)) ?? node
  );
}
