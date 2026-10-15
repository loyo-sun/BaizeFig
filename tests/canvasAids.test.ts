import { expect, it } from "vitest";
import { rulerTicks, measureGaps } from "../src/CanvasAids";
import { emptyDocument, validateDocument, History } from "../src/core";
import { snapTargets, snapCoordinates } from "../src/snapping";
it("ruler ticks track zoom and pan and remain bounded at negative world coordinates", () => {
  for (const zoom of [0.05, 0.75, 1, 8]) {
    const ticks = rulerTicks(140, zoom, 900);
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.length).toBeLessThan(30);
    for (const tick of ticks) {
      expect(tick.pixel).toBeCloseTo(140 + tick.value * zoom);
      expect(tick.pixel).toBeGreaterThanOrEqual(22);
    }
  }
  expect(rulerTicks(500, 1, 900).some((t) => t.value < 0)).toBe(true);
});
it("measures directional gaps without negative distances for overlap", () => {
  const a = { x: 10, y: 20, width: 30, height: 40 },
    b = { x: 65, y: 90, width: 20, height: 20 };
  expect(measureGaps(a, b)).toEqual({ x: 25, y: 30 });
  expect(measureGaps(b, a)).toEqual({ x: 25, y: 30 });
  expect(measureGaps(a, { x: 20, y: 30, width: 10, height: 10 })).toEqual({
    x: 0,
    y: 0,
  });
});
it("persists page guides through native round-trip and undo and uses them as snap candidates", () => {
  const d = emptyDocument(),
    n = {
      ...d,
      guides: [
        {
          id: "guide",
          pageId: d.pages[0].id,
          axis: "x" as const,
          position: 125.5,
        },
      ],
    };
  validateDocument(n);
  const loaded = JSON.parse(JSON.stringify(n));
  validateDocument(loaded);
  expect(loaded.guides).toEqual(n.guides);
  const h = new History();
  h.push(d);
  expect(h.undo(n)).toEqual(d);
  expect(h.redo(d)).toEqual(n);
  expect(
    snapCoordinates(
      [123],
      [400],
      snapTargets(n, n.pages[0].id),
      { objects: true, geometry: false, pixel: false },
      1,
    ).x,
  ).toBe(2.5);
  expect(() =>
    validateDocument({ ...n, guides: [{ ...n.guides[0], pageId: "missing" }] }),
  ).toThrow(/guides/);
  expect(() =>
    validateDocument({
      ...n,
      guides: [{ ...n.guides[0], position: Infinity }],
    }),
  ).toThrow(/guides/);
});
