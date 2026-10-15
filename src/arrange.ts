import {
  roots,
  ancestors,
  bounds,
  worldTransform,
  setWorldTransform,
  reflowAfterPointerEdit,
  type Document,
} from "./core";
export type ArrangeMode =
  | "round"
  | "tidy"
  | "pack-x"
  | "pack-y"
  | "space-x"
  | "space-y"
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";
export function arrangeNodes(
  original: Document,
  ids: string[],
  mode: ArrangeMode,
  gap = 16,
) {
  if (!Number.isFinite(gap) || gap < 0 || gap > 100000)
    throw Error("Invalid spacing");
  const doc = structuredClone(original),
    nodes = roots(doc, ids).filter(
      (n) => n.visible && !n.locked && !ancestors(doc, n).some((a) => a.locked),
    );
  if (
    nodes.length <
    (mode === "round"
      ? 1
      : mode.startsWith("space") ||
          ["left", "center", "right", "top", "middle", "bottom"].includes(mode)
        ? 3
        : 2)
  )
    throw Error("Select enough unlocked layers");
  if (
    nodes.some((n) =>
      ancestors(doc, n).some(
        (a) => a.layout && a.layout !== "none" && !n.layoutItem?.absolute,
      ),
    )
  )
    throw Error(
      "Arrange layers outside auto layout, or use absolute positioning",
    );
  const items = nodes.map((n, index) => ({ n, index, b: bounds(doc, [n]) }));
  const move = (item: (typeof items)[number], x: number, y: number) => {
    const m = worldTransform(doc, item.n);
    m[4] += x - item.b.x;
    m[5] += y - item.b.y;
    setWorldTransform(doc, item.n, m);
  };
  if (mode === "round") {
    for (const item of items)
      move(item, Math.round(item.b.x), Math.round(item.b.y));
  } else if (mode === "tidy") {
    const count = Math.ceil(Math.sqrt(items.length)),
      w = Math.max(...items.map((i) => i.b.width)),
      h = Math.max(...items.map((i) => i.b.height)),
      x = Math.min(...items.map((i) => i.b.x)),
      y = Math.min(...items.map((i) => i.b.y));
    items
      .sort((a, b) => a.b.y - b.b.y || a.b.x - b.b.x || a.index - b.index)
      .forEach((item, i) =>
        move(
          item,
          x + (i % count) * (w + gap),
          y + Math.floor(i / count) * (h + gap),
        ),
      );
  } else {
    const horizontal = [
        "pack-x",
        "space-x",
        "left",
        "center",
        "right",
      ].includes(mode),
      axis = horizontal ? "x" : "y",
      size = horizontal ? "width" : "height";
    const fraction = ["center", "middle"].includes(mode)
      ? 0.5
      : ["right", "bottom"].includes(mode)
        ? 1
        : 0;
    const position = (i: (typeof items)[number]) =>
      i.b[axis] + i.b[size] * fraction;
    items.sort((a, b) => position(a) - position(b) || a.index - b.index);
    let cursor = items[0].b[axis];
    if (mode.startsWith("pack") || mode.startsWith("space")) {
      const spacing = mode.startsWith("pack")
        ? gap
        : (Math.max(...items.map((i) => i.b[axis] + i.b[size])) -
            cursor -
            items.reduce((s, i) => s + i.b[size], 0)) /
          (items.length - 1);
      for (const item of items) {
        move(
          item,
          horizontal ? cursor : item.b.x,
          horizontal ? item.b.y : cursor,
        );
        cursor += item.b[size] + spacing;
      }
    } else {
      const start = position(items[0]),
        step = (position(items.at(-1)!) - start) / (items.length - 1);
      items.forEach((item, i) => {
        const value = start + i * step - item.b[size] * fraction;
        move(
          item,
          horizontal ? value : item.b.x,
          horizontal ? item.b.y : value,
        );
      });
    }
  }
  return reflowAfterPointerEdit(original, doc);
}
