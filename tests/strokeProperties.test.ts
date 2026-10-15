import { expect, it } from "vitest";
import { parseStrokeDash } from "../src/StrokeProperties";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { svgString } from "../src/Canvas";
import { convertToPaths } from "../src/vectorGeometry";
it("validates dash patterns and prevents all-zero or non-finite contours", () => {
  expect(parseStrokeDash("8 4, 2")).toEqual([8, 4, 2]);
  expect(parseStrokeDash("")).toEqual([]);
  expect(() => parseStrokeDash("0 0")).toThrow();
  expect(() => parseStrokeDash("3 -1")).toThrow();
  expect(() => parseStrokeDash("x")).toThrow();
});
it("renders and exports aligned native shapes with full stroke controls and outside bounds", async () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("rectangle", p, {
      width: 100,
      height: 80,
      stroke: "#ff0000",
      strokeWidth: 10,
      fidelity: {
        size: [100, 80],
        strokeAlign: "outside",
        strokeCap: "round",
        strokeJoin: "bevel",
        strokeDash: [8, 4],
        strokeDashOffset: 2,
        strokeOpacity: 0.4,
      },
    }),
  );
  const svg = await svgString(d, p);
  expect(svg).toContain("native-stroke-");
  expect(svg).toContain('maskUnits="userSpaceOnUse"');
  expect(svg).toContain('stroke-opacity="0.4"');
  expect(svg).toContain('stroke-dasharray="8 4"');
  expect(svg).toContain('stroke-linejoin="bevel"');
  const width = Number(svg.match(/<svg[^>]*width="([^"]+)"/)?.[1]);
  expect(width).toBeGreaterThan(100);
  const n = convertToPaths(d, [d.nodes[0].id], "outline").doc.nodes[0];
  expect(
    n.fidelity?.network?.regions.some((r) =>
      r.paints?.some((p) => p.opacity === 0.4),
    ),
  ).toBe(true);
  validateDocument({ ...d, nodes: [n] });
});
it("keeps stroke changes isolated and undoable and validates opacity before saving", () => {
  const d = emptyDocument(),
    n = makeNode("ellipse", d.pages[0].id);
  d.nodes.push(n);
  const h = new History();
  h.push(d);
  const changed = execute(d, {
    type: "update",
    ids: [n.id],
    patch: {
      fidelity: {
        size: [n.width, n.height],
        strokeAlign: "inside",
        strokeOpacity: 0.7,
      },
      strokeWidth: 5,
    },
  }).doc;
  expect(h.undo(changed)).toEqual(d);
  expect(changed.nodes[0].width).toBe(n.width);
  expect(() =>
    execute(d, {
      type: "update",
      ids: [n.id],
      patch: { fidelity: { size: [1, 1], strokeOpacity: 2 } },
    }),
  ).toThrow();
});
