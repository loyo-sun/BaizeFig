import type { Node } from "./core";
import { inverse, multiply, type Matrix, transformPoint } from "./fidelity";
export type ImageOptions = NonNullable<NonNullable<Node["fidelity"]>["image"]>;
export function imagePlacement(
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  mode: "fill" | "fit",
): Matrix {
  const scale = (mode === "fill" ? Math.max : Math.min)(
      width / imageWidth,
      height / imageHeight,
    ),
    w = imageWidth * scale,
    h = imageHeight * scale;
  return [w, 0, 0, h, (width - w) / 2, (height - h) / 2];
}
export function cropPlacement(
  node: Node,
  options: ImageOptions | undefined,
  imageWidth: number,
  imageHeight: number,
): Matrix {
  if (options?.mode === "crop")
    return multiply(
      [node.width, 0, 0, node.height, 0, 0],
      inverse(options.transform),
    );
  return imagePlacement(
    node.width,
    node.height,
    imageWidth,
    imageHeight,
    options?.mode === "fit" ? "fit" : "fill",
  );
}
export function cropOptions(
  node: Node,
  matrix: Matrix,
  width: number,
  height: number,
  previous?: ImageOptions,
): ImageOptions {
  if (node.width <= 0 || node.height <= 0)
    throw Error("Cannot crop a zero-size layer");
  const transform = inverse(
    multiply([1 / node.width, 0, 0, 1 / node.height, 0, 0], matrix),
  );
  return {
    mode: "crop",
    transform,
    width,
    height,
    scale: previous?.scale ?? 1,
    opacity: previous?.opacity ?? 1,
  };
}
export function scaleCrop(
  matrix: Matrix,
  scale: number,
  center: { x: number; y: number },
): Matrix {
  if (!Number.isFinite(scale) || scale <= 0) throw Error("Invalid crop scale");
  return multiply(
    [scale, 0, 0, scale, center.x * (1 - scale), center.y * (1 - scale)],
    matrix,
  );
}
export function cropCorners(matrix: Matrix) {
  return [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].map(([x, y]) => transformPoint(matrix, x, y));
}
