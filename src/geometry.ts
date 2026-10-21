import {
  type Document,
  worldTransform,
  setWorldTransform,
  roots,
  ancestors,
  bounds,
  reflowAfterPointerEdit,
  localTransform,
} from "./core";
import { inverse, transformPoint, multiply } from "./fidelity";
import { nodeSelectionBounds } from "./pathBounds";
export function resizeInWorld(
  original: Document,
  id: string,
  handle: string,
  dx: number,
  dy: number,
  keepRatio = false,
  centered = false,
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
  const shiftX = centered
      ? (box.width - width) / 2
      : handle.includes("w")
        ? box.width - width
        : keepRatio && (handle === "n" || handle === "s")
          ? (box.width - width) / 2
          : 0,
    shiftY = centered
      ? (box.height - height) / 2
      : handle.includes("n")
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

// Affine transforms keep the complete selected subtree (including text, strokes and effects) together.
export function transformSelection(
  original: Document,
  ids: string[],
  matrix: import("./fidelity").Matrix,
) {
  if (
    matrix.some((x) => !Number.isFinite(x)) ||
    Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]) < 1e-8
  )
    throw Error("Invalid transform");
  const next = structuredClone(original),
    nodes = roots(next, ids);
  if (
    !nodes.length ||
    nodes.some((n) => n.locked || ancestors(next, n).some((a) => a.locked))
  )
    throw Error("Select unlocked layers");
  if (
    nodes.some((n) =>
      ancestors(next, n).some(
        (a) => a.layout && a.layout !== "none" && !n.layoutItem?.absolute,
      ),
    )
  )
    throw Error(
      "Transform layers outside auto layout, or use absolute positioning",
    );
  const worlds = nodes.map((n) => multiply(matrix, worldTransform(next, n)));
  nodes.forEach((n, i) => setWorldTransform(next, n, worlds[i]));
  return reflowAfterPointerEdit(original, next);
}
export function resizeSelection(
  original: Document,
  ids: string[],
  handle: string,
  dx: number,
  dy: number,
  uniform = false,
  centered = false,
) {
  const b = bounds(original, roots(original, ids));
  if (b.width < 1e-6 || b.height < 1e-6)
    throw Error("Cannot scale a zero-size selection");
  let w = Math.max(
      1,
      b.width + (handle.includes("e") ? dx : handle.includes("w") ? -dx : 0),
    ),
    h = Math.max(
      1,
      b.height + (handle.includes("s") ? dy : handle.includes("n") ? -dy : 0),
    );
  if (uniform) {
    if (handle === "n" || handle === "s") w = (h * b.width) / b.height;
    else h = (w * b.height) / b.width;
  }
  const x = centered
      ? b.x + (b.width - w) / 2
      : handle.includes("w")
        ? b.x + b.width - w
        : uniform && (handle === "n" || handle === "s")
          ? b.x + (b.width - w) / 2
          : b.x,
    y = centered
      ? b.y + (b.height - h) / 2
      : handle.includes("n")
        ? b.y + b.height - h
        : uniform && (handle === "e" || handle === "w")
          ? b.y + (b.height - h) / 2
          : b.y,
    sx = w / b.width,
    sy = h / b.height;
  return transformSelection(original, ids, [
    sx,
    0,
    0,
    sy,
    x - sx * b.x,
    y - sy * b.y,
  ]);
}
export function rotateSelection(
  original: Document,
  ids: string[],
  radians: number,
) {
  const b = bounds(original, roots(original, ids)),
    x = b.x + b.width / 2,
    y = b.y + b.height / 2,
    c = Math.cos(radians),
    s = Math.sin(radians);
  return transformSelection(original, ids, [
    c,
    s,
    -s,
    c,
    x - c * x + s * y,
    y - s * x - c * y,
  ]);
}
export function flipSelection(
  original: Document,
  ids: string[],
  axis: "x" | "y",
) {
  const b = bounds(original, roots(original, ids));
  return transformSelection(
    original,
    ids,
    axis === "x"
      ? [-1, 0, 0, 1, 2 * b.x + b.width, 0]
      : [1, 0, 0, -1, 0, 2 * b.y + b.height],
  );
}

export function nodeRotation(node: import("./core").Node) {
  const m = localTransform(node);
  return (Math.atan2(m[1], m[0]) * 180) / Math.PI;
}
export function setSelectionRotation(
  original: Document,
  ids: string[],
  degrees: number,
) {
  if (!Number.isFinite(degrees)) throw Error("Invalid transform");
  const next = structuredClone(original),
    nodes = roots(next, ids);
  for (const n of nodes) {
    if (n.locked || ancestors(next, n).some((p) => p.locked))
      throw Error("Select unlocked layers");
    const delta = ((degrees - nodeRotation(n)) * Math.PI) / 180,
      c = Math.cos(delta),
      s = Math.sin(delta),
      m = localTransform(n),
      b = nodeSelectionBounds(n),
      center = transformPoint(m, b.x + b.width / 2, b.y + b.height / 2),
      local = multiply(
        [
          c,
          s,
          -s,
          c,
          center.x - c * center.x + s * center.y,
          center.y - s * center.x - c * center.y,
        ],
        m,
      ),
      parent = next.nodes.find((p) => p.id === n.parentId);
    setWorldTransform(
      next,
      n,
      parent ? multiply(worldTransform(next, parent), local) : local,
    );
  }
  return reflowAfterPointerEdit(original, next);
}
