import { ancestors, bounds, type Document } from "./core";

export function marqueeTargets(
  doc: Document,
  page: string,
  box: { x: number; y: number; width: number; height: number },
  scope: string | null,
): string[] {
  const hits = new Set<string>();
  for (const node of doc.nodes) {
    if (node.pageId !== page || node.id === scope) continue;
    if (scope && !ancestors(doc, node).some((p) => p.id === scope)) continue;
    const target = canvasTarget(doc, node.id, scope);
    if (!target) continue;
    const b = bounds(doc, [target]);
    const enclosed = b.x >= box.x && b.y >= box.y &&
      b.x + b.width <= box.x + box.width && b.y + b.height <= box.y + box.height;
    const intersects = b.x <= box.x + box.width && b.y <= box.y + box.height &&
      b.x + b.width >= box.x && b.y + b.height >= box.y;
    // A frame's empty interior must not swallow a marquee of its children.
    if (target.type === "frame" ? enclosed : intersects) hits.add(target.id);
  }
  return [...hits].filter((id) => {
    const node = doc.nodes.find((n) => n.id === id)!;
    return !ancestors(doc, node).some((p) => hits.has(p.id));
  });
}

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
