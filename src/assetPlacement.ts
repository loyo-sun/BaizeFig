import {
  ancestors,
  container,
  execute,
  worldTransform,
  type Document,
  type Node,
} from "./core";
import { inverse, transformPoint } from "./fidelity";
import {
  createComponentInstance,
  inComponentSlot,
  setComponentValue,
} from "./components";
export function assetDestination(
  doc: Document,
  pageId: string,
  point: { x: number; y: number },
) {
  const inside = (n: Node) => {
    const p = transformPoint(inverse(worldTransform(doc, n)), point.x, point.y);
    return p.x >= 0 && p.y >= 0 && p.x <= n.width && p.y <= n.height;
  };
  return [...doc.nodes]
    .reverse()
    .find(
      (n) =>
        n.pageId === pageId &&
        container(n) &&
        inside(n) &&
        ![n, ...ancestors(doc, n)].some((a) => a.locked || !a.visible) &&
        ancestors(doc, n).every(
          (a) => !a.fidelity?.clipsContent || inside(a),
        ) &&
        (!(n.componentOwner || n.type === "instance") ||
          inComponentSlot(doc, n, true)),
    );
}
export function insertAsset(
  original: Document,
  reference: string,
  pageId: string,
  point: { x: number; y: number },
  values?: Record<string, string | boolean>,
) {
  const parent = assetDestination(original, pageId, point);
  let result = createComponentInstance(
    original,
    reference,
    pageId,
    point.x,
    point.y,
  );
  for (const [key, value] of Object.entries(values ?? {}))
    result.doc = setComponentValue(result.doc, result.id, key, value);
  if (parent) {
    const local = transformPoint(
      inverse(worldTransform(original, parent)),
      point.x,
      point.y,
    );
    const children = original.nodes.filter((n) => n.parentId === parent.id);
    const target =
      parent.layout && parent.layout !== "none"
        ? children.find((n) =>
            parent.layout === "horizontal"
              ? local.x < n.x + n.width / 2
              : local.y < n.y + n.height / 2,
          )
        : undefined;
    result.doc = execute(result.doc, {
      type: "reparent",
      ids: [result.id],
      parentId: parent.id,
      targetId: target?.id,
      after: false,
    }).doc;
  }
  return result;
}
