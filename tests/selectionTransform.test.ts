import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  worldTransform,
  bounds,
  validateDocument,
  History,
} from "../src/core";
import {
  resizeSelection,
  rotateSelection,
  flipSelection,
} from "../src/geometry";
import { transformPoint } from "../src/fidelity";
function sample() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("frame", p, { id: "parent", x: 100, y: 50, rotation: 25 }),
    makeNode("rectangle", p, {
      id: "a",
      parentId: "parent",
      x: 20,
      y: 30,
      width: 80,
      height: 50,
    }),
    makeNode("text", p, {
      id: "b",
      x: 400,
      y: 100,
      width: 100,
      height: 30,
      text: "白泽",
      fontSize: 20,
    }),
  );
  return d;
}
it("resizes a multi-selection in world space, anchoring the opposite edge", () => {
  const d = sample(),
    ids = ["a", "b"],
    b = bounds(
      d,
      d.nodes.filter((n) => ids.includes(n.id)),
    );
  const n = resizeSelection(d, ids, "nw", -50, -20),
    after = bounds(
      n,
      n.nodes.filter((n) => ids.includes(n.id)),
    );
  expect(after.x + after.width).toBeCloseTo(b.x + b.width);
  expect(after.y + after.height).toBeCloseTo(b.y + b.height);
  expect(after.width).toBeCloseTo(b.width + 50);
  expect(after.height).toBeCloseTo(b.height + 20);
  validateDocument(n);
});
it("uniform Scale transforms nested text and strokes through the parent without double-scaling descendants", () => {
  const d = sample(),
    before = worldTransform(d, d.nodes[1]),
    b = bounds(d, [d.nodes[0]]),
    n = resizeSelection(d, ["parent", "a"], "se", b.width, 0, true),
    after = worldTransform(n, n.nodes[1]);
  expect(after[0]).toBeCloseTo(before[0] * 2);
  expect(after[3]).toBeCloseTo(before[3] * 2);
  expect(n.nodes[1].width).toBe(d.nodes[1].width);
  expect(n.nodes[1].strokeWidth).toBe(d.nodes[1].strokeWidth);
  validateDocument(n);
});
it("flips around selection center twice without drifting, and rotates around the same center", () => {
  const d = sample(),
    ids = ["a", "b"],
    n = flipSelection(flipSelection(d, ids, "x"), ids, "x");
  for (const id of ids) {
    const a = worldTransform(
        d,
        d.nodes.find((n) => n.id === id)!,
      ),
      b = worldTransform(
        n,
        n.nodes.find((n) => n.id === id)!,
      );
    b.forEach((v, i) => expect(v).toBeCloseTo(a[i]));
  }
  const b = bounds(
      d,
      d.nodes.filter((n) => ids.includes(n.id)),
    ),
    r = rotateSelection(d, ids, Math.PI / 2),
    before = transformPoint(worldTransform(d, d.nodes[2]), 0, 0),
    after = transformPoint(worldTransform(r, r.nodes[2]), 0, 0),
    cx = b.x + b.width / 2,
    cy = b.y + b.height / 2;
  expect(after.x).toBeCloseTo(cx - (before.y - cy));
  expect(after.y).toBeCloseTo(cy + before.x - cx);
  validateDocument(r);
});
it("supports atomic undo and rejects locked or zero-size transforms", () => {
  const d = sample(),
    h = new History();
  h.push(d);
  const n = rotateSelection(d, ["a", "b"], 0.4);
  expect(h.undo(n)).toEqual(d);
  expect(h.redo(d)).toEqual(n);
  d.nodes[0].locked = true;
  expect(() => rotateSelection(d, ["a"], 1)).toThrow(/unlocked/);
  d.nodes[2].width = 0;
  expect(() => resizeSelection(d, ["b"], "se", 10, 10)).toThrow(/zero-size/);
});

it("reports and edits rotation after affine Scale while preserving the selected layer's center", async () => {
  const { nodeRotation, setSelectionRotation } =
    await import("../src/geometry");
  const d = sample(),
    r = rotateSelection(d, ["b"], Math.PI / 2),
    node = r.nodes[2];
  expect(nodeRotation(node)).toBeCloseTo(90);
  const before = transformPoint(
      worldTransform(r, node),
      node.width / 2,
      node.height / 2,
    ),
    n = setSelectionRotation(r, ["b"], 30),
    after = transformPoint(
      worldTransform(n, n.nodes[2]),
      node.width / 2,
      node.height / 2,
    );
  expect(nodeRotation(n.nodes[2])).toBeCloseTo(30);
  expect(after.x).toBeCloseTo(before.x);
  expect(after.y).toBeCloseTo(before.y);
  validateDocument(n);
});
