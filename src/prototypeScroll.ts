import { ancestors, worldTransform, type Document, type Node } from "./core";
import { inverse, multiply, transformPoint } from "./fidelity";

export type ScrollPosition = { x: number; y: number };
export type ScrollPositions = Record<string, ScrollPosition>;
export type PrototypeViewports = Record<
  string,
  { width: number; height: number }
>;

function relativeBounds(doc: Document, node: Node, container: Node) {
  const m = multiply(
    inverse(worldTransform(doc, container)),
    worldTransform(doc, node),
  );
  const pts = [
    [0, 0],
    [node.width, 0],
    [node.width, node.height],
    [0, node.height],
  ].map(([x, y]) => transformPoint(m, x, y));
  return {
    x: Math.min(...pts.map((p) => p.x)),
    y: Math.min(...pts.map((p) => p.y)),
    right: Math.max(...pts.map((p) => p.x)),
    bottom: Math.max(...pts.map((p) => p.y)),
  };
}
export function scrollLimits(
  doc: Document,
  containerId: string,
  viewports: PrototypeViewports = {},
) {
  const container = doc.nodes.find((n) => n.id === containerId);
  if (!container) return { x: 0, y: 0 };
  const viewport = viewports[containerId] ?? container;
  let right = container.width,
    bottom = container.height;
  for (const node of doc.nodes) {
    const chain = ancestors(doc, node),
      index = chain.findIndex((n) => n.id === containerId);
    if (
      !node.visible ||
      index < 0 ||
      chain
        .slice(0, index)
        .some(
          (n) =>
            !n.visible ||
            (n.fidelity?.clipsContent !== false &&
              ["frame", "component", "instance"].includes(n.type)),
        )
    )
      continue;
    const b = relativeBounds(doc, node, container);
    right = Math.max(right, b.right);
    bottom = Math.max(bottom, b.bottom);
  }
  const axis =
    container.prototypeScroll && container.prototypeScroll !== "none"
      ? container.prototypeScroll
      : container.parentId === null || viewports[containerId]
        ? "both"
        : "none";
  return {
    x:
      axis === "horizontal" || axis === "both"
        ? Math.max(0, right - viewport.width)
        : 0,
    y:
      axis === "vertical" || axis === "both"
        ? Math.max(0, bottom - viewport.height)
        : 0,
  };
}
export function clampScroll(
  doc: Document,
  containerId: string,
  position: ScrollPosition,
  viewports: PrototypeViewports = {},
) {
  const limits = scrollLimits(doc, containerId, viewports);
  return {
    x: Math.max(0, Math.min(limits.x, position.x)),
    y: Math.max(0, Math.min(limits.y, position.y)),
  };
}
// Shift immediate children only: each container's content offset is applied exactly once.
export function scrolledDocument(
  doc: Document,
  scrolls: ScrollPositions,
): Document {
  return {
    ...doc,
    nodes: doc.nodes.map((n) => {
      const offset = n.parentId && scrolls[n.parentId];
      const shifted = offset
        ? { ...n, x: n.x - offset.x, y: n.y - offset.y }
        : n;
      return n.prototypeScroll && n.prototypeScroll !== "none"
        ? {
            ...shifted,
            fidelity: {
              ...n.fidelity,
              size: n.fidelity?.size ?? [n.width, n.height],
              clipsContent: true,
            },
          }
        : shifted;
    }),
  };
}
export function scrollToTarget(
  doc: Document,
  rootId: string,
  targetId: string,
  current: ScrollPositions = {},
  viewports: PrototypeViewports = {},
  offset: ScrollPosition = { x: 0, y: 0 },
): ScrollPositions {
  const target = doc.nodes.find((n) => n.id === targetId);
  if (
    !target ||
    !target.visible ||
    !ancestors(doc, target).some((n) => n.id === rootId)
  )
    return current;
  const chain = ancestors(doc, target),
    rootIndex = chain.findIndex((n) => n.id === rootId);
  if (chain.slice(0, rootIndex + 1).some((n) => !n.visible)) return current;
  const next = { ...current };
  let appliedOffset = false;
  for (const container of chain.slice(0, rootIndex + 1)) {
    if (
      container.id !== rootId &&
      (!container.prototypeScroll || container.prototypeScroll === "none")
    )
      continue;
    const displayed = scrolledDocument(doc, next),
      displayedTarget = displayed.nodes.find((n) => n.id === targetId)!,
      displayedContainer = displayed.nodes.find((n) => n.id === container.id)!;
    const b = relativeBounds(displayed, displayedTarget, displayedContainer),
      prior = next[container.id] ?? { x: 0, y: 0 };
    next[container.id] = clampScroll(
      doc,
      container.id,
      {
        x: prior.x + b.x + (appliedOffset ? 0 : offset.x),
        y: prior.y + b.y + (appliedOffset ? 0 : offset.y),
      },
      viewports,
    );
    appliedOffset = true;
  }
  return next;
}
