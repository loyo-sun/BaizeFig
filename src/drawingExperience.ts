import { localTransform, type Node } from "./core";
import { transformPoint } from "./fidelity";
import { nodeSelectionBounds } from "./pathBounds";
/** Geometry is computed in the drawing parent's coordinates, before reflow. */
export function drawingBox(
  start: { x: number; y: number },
  end: { x: number; y: number },
  constrain: boolean,
  centered: boolean,
) {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  let width = Math.abs(dx),
    height = Math.abs(dy);
  if (constrain) width = height = Math.max(width, height);
  return {
    x: centered || dx < 0 ? start.x - width : start.x,
    y: centered || dy < 0 ? start.y - height : start.y,
    width: Math.max(1, width * (centered ? 2 : 1)),
    height: Math.max(1, height * (centered ? 2 : 1)),
  };
}

/** A shared field is meaningful only if every selected object has that value. */
export function commonNumber<T>(
  items: T[],
  read: (item: T) => number,
): number | null {
  if (!items.length) return null;
  const value = read(items[0]);
  return items.every((item) => Math.abs(read(item) - value) < 1e-6)
    ? value
    : null;
}

export function visualPosition(node: Node) {
  const box = nodeSelectionBounds(node),
    m = localTransform(node),
    points = [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x + box.width, box.y + box.height],
      [box.x, box.y + box.height],
    ].map(([x, y]) => transformPoint(m, x, y));
  return {
    x: Math.min(...points.map((p) => p.x)),
    y: Math.min(...points.map((p) => p.y)),
  };
}
