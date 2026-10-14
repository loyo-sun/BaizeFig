import { describe, it, expect } from "vitest";
import { simplifyNetwork } from "../src/vectorSimplify";
import { parsePaths } from "../src/vectorGeometry";
import {
  networkGeometry,
  networkStroke,
  validateNetwork,
} from "../src/vectorNetwork";
import paper from "paper";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
describe("tolerance-based vector simplification", () => {
  it("reduces dense straight paths while preserving endpoints and the source", () => {
    const n = parsePaths([
      {
        d:
          "M0 0 " +
          Array.from({ length: 100 }, (_, i) => `L${i + 1} 0`).join(" "),
        rule: "nonzero",
      },
    ]);
    const next = simplifyNetwork(n, 0.1);
    validateNetwork(next);
    expect(next.vertices.length).toBe(2);
    expect(next.vertices).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    expect(n.vertices).toHaveLength(101);
  });
  it("preserves deliberate corners, closure, holes and regional paint styles", () => {
    const n = parsePaths([
      {
        d: "M0 0 L25 0 L50 0 L100 0 L100 100 L0 100 Z M20 20 L40 20 L40 40 L20 40 Z",
        rule: "evenodd",
        paints: [
          {
            type: "linear",
            opacity: 0.4,
            stops: [
              { position: 0, color: "#ff0000" },
              { position: 1, color: "#0000ff" },
            ],
          },
        ],
      },
    ]);
    const next = simplifyNetwork(n, 0.2);
    validateNetwork(next);
    expect(next.vertices.length).toBeLessThan(n.vertices.length);
    expect(next.regions[0].loops).toHaveLength(2);
    expect(next.regions[0].paints).toEqual(n.regions[0].paints);
    const p = new scope.CompoundPath({
      pathData: networkGeometry(next)[0].d,
      fillRule: "evenodd",
      insert: false,
    });
    expect(p.contains(new scope.Point(30, 30))).toBe(false);
    expect(p.contains(new scope.Point(70, 70))).toBe(true);
  });
  it("protects branching junctions and isolated vertices", () => {
    const n = parsePaths([
      { d: "M0 0 L25 0 L50 0 L75 0 L100 0", rule: "nonzero" },
    ]);
    n.vertices.push({ x: 50, y: 50 }, { x: 999, y: 999 });
    n.segments.push({ a: 2, b: 5, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } });
    const next = simplifyNetwork(n, 0.5);
    validateNetwork(next);
    expect(next.vertices).toContainEqual({ x: 50, y: 0 });
    expect(next.vertices).toContainEqual({ x: 999, y: 999 });
    expect(
      next.segments.filter(
        (s) =>
          (next.vertices[s.a].x === 50 && next.vertices[s.a].y === 0) ||
          (next.vertices[s.b].x === 50 && next.vertices[s.b].y === 0),
      ),
    ).toHaveLength(3);
  });
  it("bounds accumulated simplification error against the original curve", () => {
    const points = Array.from({ length: 80 }, (_, i) => ({
        x: i * 2,
        y: Math.sin(i / 10) * 10,
      })),
      n = parsePaths([
        {
          d: points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" "),
          rule: "nonzero",
        },
      ]),
      next = simplifyNetwork(n, 0.5);
    expect(next.vertices.length).toBeLessThan(n.vertices.length);
    const p = new scope.Path({
      pathData: networkStroke(next),
      insert: false,
    });
    for (const point of points)
      expect(
        p
          .getNearestPoint(new scope.Point(point.x, point.y))
          .getDistance(new scope.Point(point.x, point.y)),
      ).toBeLessThanOrEqual(0.5);
  });
  it("rejects nonfinite or out-of-range tolerance without mutation", () => {
    const n = parsePaths([{ d: "M0 0 L10 0", rule: "nonzero" }]);
    for (const tol of [0, NaN, Infinity, -1, 101])
      expect(() => simplifyNetwork(n, tol)).toThrow();
    expect(n.vertices).toHaveLength(2);
  });
});
