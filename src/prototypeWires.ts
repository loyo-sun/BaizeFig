import {
  ancestors,
  bounds,
  worldTransform,
  type Document,
  type Node,
} from "./core";
import { inverse, transformPoint } from "./fidelity";
export function prototypeTarget(
  doc: Document,
  page: string,
  source: string,
  p: { x: number; y: number },
) {
  const node = doc.nodes.find((n) => n.id === source);
  const excluded = new Set([
    source,
    ...(node ? ancestors(doc, node).map((n) => n.id) : []),
  ]);
  return [...doc.nodes].reverse().find((n) => {
    if (
      n.pageId !== page ||
      n.type !== "frame" ||
      excluded.has(n.id) ||
      !n.visible ||
      n.locked ||
      ancestors(doc, n).some((p) => !p.visible || p.locked)
    )
      return false;
    const local = transformPoint(inverse(worldTransform(doc, n)), p.x, p.y);
    return (
      local.x >= 0 && local.y >= 0 && local.x <= n.width && local.y <= n.height
    );
  });
}
export function navigationPatch(source: Node, target: Node) {
  return {
    targetId: undefined,
    interactions: [
      ...(source.interactions ?? []).filter((i) => i.trigger !== "click"),
      {
        trigger: "click" as const,
        actions: [
          {
            type: "navigate" as const,
            targetId: target.id,
            transition: "instant" as const,
          },
          ...(
            source.interactions?.find((i) => i.trigger === "click")?.actions ??
            []
          ).filter((a) => a.type !== "navigate"),
        ],
      },
    ],
  };
}
export function connectorPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const bend = Math.max(48, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y} ${b.x - bend} ${b.y} ${b.x} ${b.y}`;
}
export function prototypeLinks(doc: Document, page: string) {
  return doc.nodes
    .filter((n) => n.pageId === page && n.visible)
    .flatMap((source) => {
      const actions =
        source.interactions?.flatMap((i) => i.actions) ??
        (source.targetId
          ? [{ type: "navigate", targetId: source.targetId }]
          : []);
      return actions.flatMap((action) => {
        if (
          !("targetId" in action) ||
          !["navigate", "overlay", "swap"].includes(action.type)
        )
          return [];
        const target = doc.nodes.find(
          (n) => n.id === action.targetId && n.pageId === page && n.visible,
        );
        if (!target) return [];
        const a = bounds(doc, [source]),
          b = bounds(doc, [target]);
        return [
          {
            source: source.id,
            target: target.id,
            a: { x: a.x + a.width, y: a.y + a.height / 2 },
            b: { x: b.x, y: b.y + b.height / 2 },
          },
        ];
      });
    });
}
