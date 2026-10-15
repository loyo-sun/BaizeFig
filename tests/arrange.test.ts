import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  bounds,
  History,
  validateDocument,
} from "../src/core";
import { arrangeNodes } from "../src/arrange";
function sample() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    ...[0, 140, 400].map((x, i) =>
      makeNode("rectangle", p, {
        id: `n${i}`,
        x,
        y: 30 * i,
        width: [40, 60, 100][i],
        height: 20,
      }),
    ),
  );
  return d;
}
it("distributes equal gaps, preserves outside bounds and can undo/redo the entire operation", () => {
  const d = sample(),
    h = new History();
  h.push(d);
  const n = arrangeNodes(d, ["n0", "n1", "n2"], "space-x");
  expect(n.nodes[1].x).toBe(190);
  expect(n.nodes[2].x).toBe(400);
  expect(h.undo(n)).toEqual(d);
  expect(h.redo(d)).toEqual(n);
  validateDocument(n);
});
it("distributes all six edge/center modes and packs using unequal sizes", () => {
  const d = sample();
  for (const mode of [
    "left",
    "center",
    "right",
    "top",
    "middle",
    "bottom",
  ] as const) {
    const n = arrangeNodes(
        d,
        d.nodes.map((n) => n.id),
        mode,
      ),
      horizontal = ["left", "center", "right"].includes(mode),
      fraction = ["center", "middle"].includes(mode)
        ? 0.5
        : ["right", "bottom"].includes(mode)
          ? 1
          : 0;
    const values = n.nodes.map((node) => {
      const b = bounds(n, [node]);
      return horizontal ? b.x + b.width * fraction : b.y + b.height * fraction;
    });
    expect(values[1] - values[0]).toBeCloseTo(values[2] - values[1]);
  }
  const packed = arrangeNodes(
    d,
    d.nodes.map((n) => n.id),
    "pack-x",
    12,
  );
  expect(packed.nodes.map((n) => n.x)).toEqual([0, 52, 124]);
});
it("handles rotated cross-parent geometry, ignores locked objects and rejects managed layouts", () => {
  const d = sample(),
    p = d.pages[0].id,
    parent = makeNode("frame", p, { id: "parent", x: 500, rotation: 30 });
  d.nodes.push(parent);
  d.nodes[1].parentId = parent.id;
  d.nodes[2].locked = true;
  const n = arrangeNodes(d, ["n0", "n1", "n2"], "pack-x", 10);
  const a = bounds(n, [n.nodes[0]]),
    b = bounds(n, [n.nodes[1]]);
  expect(b.x - a.x - a.width).toBeCloseTo(10);
  expect(n.nodes[2]).toEqual(d.nodes[2]);
  validateDocument(n);
  parent.layout = "horizontal";
  expect(() => arrangeNodes(d, ["n0", "n1"], "tidy")).toThrow(/auto layout/);
});
it("tidies into a stable grid, rounds positions without changing shape, and rejects insufficient distribution", () => {
  const d = sample(),
    n = arrangeNodes(
      d,
      d.nodes.map((n) => n.id),
      "tidy",
      10,
    );
  expect(n.nodes.map((n) => [n.x, n.y])).toEqual([
    [0, 0],
    [110, 0],
    [0, 30],
  ]);
  d.nodes[0].x = 1.2;
  d.nodes[0].y = 2.8;
  const rounded = arrangeNodes(d, ["n0"], "round");
  expect(rounded.nodes[0]).toMatchObject({ x: 1, y: 3, width: 40, height: 20 });
  expect(() => arrangeNodes(d, ["n0", "n1"], "space-x")).toThrow(/enough/);
});
