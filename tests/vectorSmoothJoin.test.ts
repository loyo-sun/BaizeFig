import { it, expect } from "vitest";
import { parsePaths } from "../src/vectorGeometry";
import { smoothJoinVertices, validateNetwork } from "../src/vectorNetwork";
it("connects endpoints with tangents opposite to their existing curves", () => {
  const n = parsePaths([
      { d: "M0 0 L100 0 M200 100 L200 200", rule: "nonzero" },
    ]),
    next = smoothJoinVertices(n, 1, 2),
    edge = next.segments.at(-1)!;
  validateNetwork(next);
  expect(edge.ha.x).toBeGreaterThan(0);
  expect(edge.ha.y).toBeCloseTo(0);
  expect(edge.hb.x).toBeCloseTo(0);
  expect(edge.hb.y).toBeLessThan(0);
  expect(n.segments).toHaveLength(2);
});
it("uses existing cubic endpoint handles without changing the existing segments", () => {
  const n = parsePaths([
      {
        d: "M0 0 C0 30 80 20 100 0 M200 100 C180 100 200 180 200 200",
        rule: "nonzero",
      },
    ]),
    next = smoothJoinVertices(n, 1, 2);
  expect(next.segments.slice(0, 2)).toEqual(n.segments);
  const edge = next.segments.at(-1)!;
  expect(edge.ha.x).toBeGreaterThan(0);
  expect(edge.ha.y).toBeLessThan(0);
  expect(edge.hb.x).toBeGreaterThan(0);
});
it("creates a closed region when joining the ends of one open path", () => {
  const n = parsePaths([{ d: "M0 0 L100 0 L100 100", rule: "nonzero" }]);
  const next = smoothJoinVertices(n, 0, 2);
  validateNetwork(next);
  expect(next.regions).toHaveLength(1);
  expect(next.regions[0].loops[0]).toHaveLength(3);
});
it("rejects branching/interior nodes and identical or overlapping endpoints", () => {
  const n = parsePaths([{ d: "M0 0 L100 0 L100 100", rule: "nonzero" }]);
  expect(() => smoothJoinVertices(n, 1, 2)).toThrow(/endpoints/);
  expect(() => smoothJoinVertices(n, 0, 0)).toThrow();
  const overlapping = parsePaths([
    { d: "M0 0 L10 0 M10 0 L20 0", rule: "nonzero" },
  ]);
  expect(() => smoothJoinVertices(overlapping, 1, 2)).toThrow(/overlapping/);
});
it("allows isolated endpoints to form a straight cubic connection", () => {
  const n = {
    vertices: [
      { x: 0, y: 0 },
      { x: 90, y: 0 },
    ],
    segments: [],
    regions: [],
  };
  const next = smoothJoinVertices(n, 0, 1);
  validateNetwork(next);
  expect(next.segments[0].ha).toEqual({ x: 30, y: 0 });
  expect(next.segments[0].hb).toEqual({ x: -30, y: 0 });
});
