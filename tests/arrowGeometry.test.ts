import { expect, it } from "vitest";
import { arrowGeometry } from "../src/arrowGeometry";
import { shortcutMatches, shortcutRegistry } from "../src/shortcuts";
it("keeps the arrow tip at the dragged endpoint in every quadrant", () => {
  for (const end of [
    { x: 100, y: 50 },
    { x: -100, y: 50 },
    { x: 100, y: -50 },
    { x: -100, y: -50 },
  ]) {
    const a = arrowGeometry({ x: 0, y: 0 }, end);
    expect(a.points[1].x + a.x).toBeCloseTo(end.x);
    expect(a.points[1].y + a.y).toBeCloseTo(end.y);
    expect(
      a.points.every(
        (p) => p.x >= 0 && p.y >= 0 && p.x <= a.width && p.y <= a.height,
      ),
    ).toBe(true);
  }
});
it("snaps to 45 degrees and remains finite for a click", () => {
  const a = arrowGeometry({ x: 0, y: 0 }, { x: 100, y: 80 }, true);
  expect(a.points[1].x + a.x).toBeCloseTo(a.points[1].y + a.y);
  expect(arrowGeometry({ x: 0, y: 0 }, { x: 0, y: 0 }).width).toBe(1);
});
it("accepts A and F without intercepting modifier shortcuts", () => {
  const frame = shortcutRegistry.find((s) => s.name === "Frame")!;
  for (const code of ["KeyA", "KeyF"]) {
    const e = {
      code,
      key: code.slice(3).toLowerCase(),
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
    };
    expect(shortcutMatches(e, frame)).toBe(true);
    expect(shortcutMatches(e, frame, "character")).toBe(true);
    expect(shortcutMatches({ ...e, metaKey: true }, frame)).toBe(false);
  }
});
