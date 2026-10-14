import { expect, it } from "vitest";
import { networkBounds, nodeSelectionBounds } from "../src/pathBounds";
import {
  emptyDocument,
  makeNode,
  bounds,
  worldTransform,
  validateDocument,
} from "../src/core";
import { drawnPath } from "../src/pathDrawing";
import { resizeInWorld } from "../src/geometry";
import { transformPoint } from "../src/fidelity";
const network = {
  vertices: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ],
  segments: [{ a: 0, b: 1, ha: { x: 0, y: 100 }, hb: { x: 0, y: 100 } }],
  regions: [],
};
it("uses cubic extrema rather than the handle hull", () => {
  expect(networkBounds(network)).toEqual({
    x: 0,
    y: 0,
    width: 100,
    height: 75,
  });
  const d = emptyDocument(),
    n = drawnPath(d, d.pages[0].id, network, null);
  expect(n.height).toBe(75);
  d.nodes.push(n);
  expect(bounds(d, [n])).toEqual({ x: 0, y: 0, width: 100, height: 75 });
  validateDocument(d);
});
it("corrects legacy native path selection without mutating the geometry or imported source rectangles", () => {
  const d = emptyDocument(),
    n = makeNode("path", d.pages[0].id, {
      width: 100,
      height: 100,
      fidelity: { size: [100, 100], network },
    }),
    before = JSON.stringify(n);
  d.nodes.push(n);
  expect(nodeSelectionBounds(n).height).toBe(75);
  expect(bounds(d, [n]).height).toBe(75);
  expect(JSON.stringify(n)).toBe(before);
  expect(
    nodeSelectionBounds({
      ...n,
      fidelity: { ...n.fidelity!, sourceId: "imported" },
    }).height,
  ).toBe(100);
});
it("resizes a legacy curve from its real north handle while anchoring the opposite curve edge", () => {
  const d = emptyDocument(),
    n = makeNode("path", d.pages[0].id, {
      id: "curve",
      x: 40,
      y: 60,
      width: 100,
      height: 100,
      fidelity: { size: [100, 100], network },
    });
  d.nodes.push(n);
  const old = bounds(d, [n]),
    next = resizeInWorld(d, n.id, "n", 0, -25),
    actual = bounds(next, next.nodes);
  expect(actual.height).toBeCloseTo(100);
  expect(actual.y).toBeCloseTo(old.y - 25);
  expect(actual.y + actual.height).toBeCloseTo(old.y + old.height);
  validateDocument(next);
  const b = nodeSelectionBounds(next.nodes[0]),
    m = worldTransform(next, next.nodes[0]);
  expect(transformPoint(m, b.x, b.y).y).toBeCloseTo(35);
});
