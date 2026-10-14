import { type Document, worldTransform, setWorldTransform } from "./core";
import { inverse, transformPoint } from "./fidelity";
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
  const world = worldTransform(original, before),
    inv = inverse(world),
    local = { x: inv[0] * dx + inv[2] * dy, y: inv[1] * dx + inv[3] * dy };
  let width = Math.max(
      1,
      before.width +
        (handle.includes("e") ? local.x : handle.includes("w") ? -local.x : 0),
    ),
    height = Math.max(
      1,
      before.height +
        (handle.includes("s") ? local.y : handle.includes("n") ? -local.y : 0),
    );
  if (keepRatio && before.width && before.height) {
    const ratio = before.width / before.height;
    if (handle === "n" || handle === "s") width = height * ratio;
    else height = width / ratio;
  }
  const shiftX = handle.includes("w")
      ? before.width - width
      : keepRatio && (handle === "n" || handle === "s")
        ? (before.width - width) / 2
        : 0,
    shiftY = handle.includes("n")
      ? before.height - height
      : keepRatio && (handle === "e" || handle === "w")
        ? (before.height - height) / 2
        : 0;
  const origin = transformPoint(world, shiftX, shiftY),
    next = structuredClone(original),
    node = next.nodes.find((n) => n.id === id)!;
  node.width = width;
  node.height = height;
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
