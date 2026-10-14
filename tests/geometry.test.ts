import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  worldTransform,
  validateDocument,
} from "../src/core";
import { transformPoint } from "../src/fidelity";
import { resizeInWorld } from "../src/geometry";
it("resizes a rotated node in a skewed parent while fixing the opposite world corner", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("frame", p, {
      id: "parent",
      x: 120,
      y: 70,
      rotation: 20,
      fidelity: { size: [300, 200], linear: [1, 0.2, 0.3, 1] },
    }),
    makeNode("rectangle", p, {
      id: "child",
      parentId: "parent",
      rotation: 45,
      width: 100,
      height: 80,
      x: 40,
      y: 50,
    }),
  ];
  const n = d.nodes[1],
    m = worldTransform(d, n),
    anchor = transformPoint(m, 100, 80),
    next = resizeInWorld(
      d,
      n.id,
      "nw",
      m[0] * -20 + m[2] * -10,
      m[1] * -20 + m[3] * -10,
    ),
    after = next.nodes[1],
    corner = transformPoint(
      worldTransform(next, after),
      after.width,
      after.height,
    );
  expect(after.width).toBeCloseTo(120);
  expect(after.height).toBeCloseTo(90);
  expect(corner.x).toBeCloseTo(anchor.x);
  expect(corner.y).toBeCloseTo(anchor.y);
  validateDocument(next);
  expect(d.nodes[1].width).toBe(100);
});
it("supports mirrored transforms, ratio locking, minimum dimensions and singular-transform rejection", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("rectangle", p, {
      id: "n",
      width: 100,
      height: 50,
      fidelity: { size: [100, 50], linear: [-1, 0, 0, 1] },
    }),
  ];
  const next = resizeInWorld(d, "n", "se", -40, 5, true);
  expect(next.nodes[0]).toMatchObject({ width: 140, height: 70 });
  expect(resizeInWorld(d, "n", "se", 1000, -1000).nodes[0]).toMatchObject({
    width: 1,
    height: 1,
  });
  d.nodes[0].fidelity!.linear = [0, 0, 0, 0];
  expect(() => resizeInWorld(d, "n", "e", 10, 10)).toThrow();
});
