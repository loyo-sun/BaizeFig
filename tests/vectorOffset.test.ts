import { it, expect } from "vitest";
import paper from "paper";
import { offsetNetwork } from "../src/vectorOffset";
import { parsePaths } from "../src/vectorGeometry";
import { networkGeometry, validateNetwork } from "../src/vectorNetwork";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
function shape(n: ReturnType<typeof parsePaths>) {
  return new scope.CompoundPath({
    pathData: networkGeometry(n)
      .map((p) => p.d)
      .join(" "),
    insert: false,
  });
}
const square = () =>
  parsePaths([
    { d: "M0 0 L100 0 L100 100 L0 100 Z", rule: "nonzero", color: "#ff0000" },
  ]);
it("expands and contracts closed paths by signed distance", () => {
  const n = square(),
    expanded = offsetNetwork(n, 10),
    contracted = offsetNetwork(n, -10);
  validateNetwork(expanded);
  expect(shape(expanded).bounds.width).toBeCloseTo(120);
  expect(Math.abs(shape(expanded).area)).toBeCloseTo(14400);
  expect(shape(contracted).bounds.width).toBeCloseTo(80);
  expect(n.vertices).toHaveLength(4);
  expect(expanded.regions[0].color).toBe("#ff0000");
});
it("shrinks holes when expanding and expands holes when contracting", () => {
  const n = parsePaths([
    {
      d: "M0 0 L100 0 L100 100 L0 100 Z M30 30 L70 30 L70 70 L30 70 Z",
      rule: "evenodd",
    },
  ]);
  const p = shape(offsetNetwork(n, 10));
  expect(p.contains(new scope.Point(35, 50))).toBe(true);
  expect(p.contains(new scope.Point(50, 50))).toBe(false);
  expect(Math.abs(p.area)).toBeCloseTo(14000);
  const q = shape(offsetNetwork(n, -10));
  expect(q.contains(new scope.Point(25, 50))).toBe(false);
});
it("preserves independent regions and their gradient/image paint data", () => {
  const n = square();
  n.regions[0].paints = [
    {
      type: "radial",
      opacity: 0.6,
      stops: [
        { position: 0, color: "#ff0000" },
        { position: 1, color: "#ffffff" },
      ],
    },
  ];
  const next = offsetNetwork(n, 5, { join: "round" });
  validateNetwork(next);
  expect(next.regions[0].paints).toEqual(n.regions[0].paints);
  expect(shape(next).bounds.width).toBeCloseTo(110, 1);
});
it("supports signed parallel offsets on open paths while keeping them open", () => {
  const n = parsePaths([{ d: "M0 0 L100 0", rule: "nonzero" }]);
  expect(offsetNetwork(n, 10).vertices).toEqual([
    { x: 0, y: 10 },
    { x: 100, y: 10 },
  ]);
  expect(offsetNetwork(n, -10).vertices).toEqual([
    { x: 0, y: -10 },
    { x: 100, y: -10 },
  ]);
  expect(offsetNetwork(n, 10).regions).toHaveLength(0);
});
it("returns empty geometry after a complete inset and leaves zero offset unchanged", () => {
  const n = square();
  expect(offsetNetwork(n, -60).segments).toHaveLength(0);
  expect(offsetNetwork(n, 0)).toEqual(n);
});
it("rejects invalid parameters and branched open paths without changing the source", () => {
  const n = square();
  expect(() => offsetNetwork(n, NaN)).toThrow();
  expect(() => offsetNetwork(n, 1, { tolerance: 0 })).toThrow();
  const open = parsePaths([{ d: "M0 0 L100 0 L100 100", rule: "nonzero" }]);
  open.vertices.push({ x: 150, y: 0 });
  open.segments.push({ a: 1, b: 3, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } });
  expect(() => offsetNetwork(open, 10)).toThrow(/branched/);
  expect(open.segments).toHaveLength(3);
});
it("keeps closed unfilled contours closed", () => {
  const n = square();
  n.regions = [];
  const next = offsetNetwork(n, 10);
  validateNetwork(next);
  expect(next.regions).toHaveLength(1);
  expect(shape(next).bounds.width).toBeCloseTo(120);
});
it("updates layer dimensions without moving the expanded geometry under affine parents", async () => {
  const { offsetNodePatch } = await import("../src/vectorOffset");
  const { emptyDocument, makeNode, execute, worldTransform } =
    await import("../src/core");
  const { multiply, transformPoint } = await import("../src/fidelity");
  const d = emptyDocument(),
    p = d.pages[0].id;
  const parent = makeNode("frame", p, {
      id: "parent",
      rotation: 35,
      fidelity: { size: [160, 100], linear: [1, 0.3, 0.2, 1] },
    }),
    node = makeNode("path", p, {
      id: "path",
      parentId: parent.id,
      x: 60,
      y: 80,
      width: 200,
      height: 100,
      rotation: 20,
      fidelity: { size: [100, 100], network: square() },
    });
  d.nodes = [parent, node];
  const before = multiply(worldTransform(d, node), [2, 0, 0, 1, 0, 0]),
    next = offsetNetwork(square(), 10),
    patch = offsetNodePatch(node, next),
    after = execute(d, { type: "update", ids: [node.id], patch }).doc,
    n = after.nodes.find((n) => n.id === node.id)!;
  expect(n.width).toBeCloseTo(240);
  expect(n.height).toBeCloseTo(120);
  const expected = transformPoint(before, -10, -10),
    actual = transformPoint(worldTransform(after, n), 0, 0);
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
});
