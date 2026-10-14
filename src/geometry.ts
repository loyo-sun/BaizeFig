import { type Document, worldTransform, setWorldTransform } from "./core";
import { inverse, transformPoint } from "./fidelity";
import { nodeSelectionBounds } from "./pathBounds";
export function resizeInWorld(
  original: Document,
  id: string,
  handle: string,
  dx: number,
  dy: number,
  keepRatio = false,
): Document {
  const before = original.nodes.find((n) => n.id === id);
  if (!before) throw Error("Missing node");
  const box = nodeSelectionBounds(before),
    world = worldTransform(original, before),
    inv = inverse(world),
    local = { x: inv[0] * dx + inv[2] * dy, y: inv[1] * dx + inv[3] * dy };
  let width = Math.max(
      1,
      box.width +
        (handle.includes("e") ? local.x : handle.includes("w") ? -local.x : 0),
    ),
    height = Math.max(
      1,
      box.height +
        (handle.includes("s") ? local.y : handle.includes("n") ? -local.y : 0),
    );
  if (keepRatio && box.width && box.height) {
    const ratio = box.width / box.height;
    if (handle === "n" || handle === "s") width = height * ratio;
    else height = width / ratio;
  }
  const shiftX = handle.includes("w")
      ? box.width - width
      : keepRatio && (handle === "n" || handle === "s")
        ? (box.width - width) / 2
        : 0,
    shiftY = handle.includes("n")
      ? box.height - height
      : keepRatio && (handle === "e" || handle === "w")
        ? (box.height - height) / 2
        : 0;
  const sx = box.width ? width / box.width : 1,
    sy = box.height ? height / box.height : 1;
  const origin = transformPoint(
      world,
      shiftX + box.x * (1 - sx),
      shiftY + box.y * (1 - sy),
    ),
    next = structuredClone(original),
    node = next.nodes.find((n) => n.id === id)!;
  node.width = box.width ? before.width * sx : width;
  node.height = box.height ? before.height * sy : height;
  setWorldTransform(next, node, [
    world[0],
    world[1],
    world[2],
    world[3],
    origin.x,
    origin.y,
  ]);
  return next;
}
