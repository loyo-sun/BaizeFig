import { it, expect } from "vitest";
import {
  imagePlacement,
  cropPlacement,
  cropOptions,
  scaleCrop,
  cropCorners,
} from "../src/imageCrop";
import {
  emptyDocument,
  makeNode,
  execute,
  History,
  validateDocument,
} from "../src/core";
import { svgString } from "../src/Canvas";
import { multiply } from "../src/fidelity";
it("places wide images in fill/fit and round trips translated rotated sheared crops", () => {
  expect(imagePlacement(100, 100, 200, 100, "fill")).toEqual([
    200, 0, 0, 100, -50, 0,
  ]);
  expect(imagePlacement(100, 100, 200, 100, "fit")).toEqual([
    100, 0, 0, 50, 0, 25,
  ]);
  const n = makeNode("image", "p", { width: 100, height: 80 }),
    m = [120, 40, 20, 140, -30, -10] as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
  const options = cropOptions(n, m, 200, 100);
  const round = cropPlacement(n, options, 200, 100);
  round.forEach((v, i) => expect(v).toBeCloseTo(m[i]));
  const center = { x: 50, y: 40 },
    scaled = scaleCrop(m, 2, center);
  expect(cropCorners(scaled)[0]).toEqual({ x: -110, y: -60 });
  expect(() => cropOptions({ ...n, width: 0 }, m, 200, 100)).toThrow();
  expect(() => scaleCrop(m, 0, center)).toThrow();
});
it("saves a crop as native editable image metadata, exports its matrix, and undoes without touching image bytes", async () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    n = makeNode("image", p, {
      width: 100,
      height: 80,
      image: "data:image/png;base64,AA==",
    });
  d.nodes.push(n);
  const h = new History();
  h.push(d);
  const placement = imagePlacement(n.width, n.height, 200, 100, "fill");
  placement[4] += 20;
  const changed = execute(d, {
    type: "update",
    ids: [n.id],
    patch: {
      fidelity: { size: [100, 80], image: cropOptions(n, placement, 200, 100) },
    },
  }).doc;
  validateDocument(JSON.parse(JSON.stringify(changed)));
  expect(changed.nodes[0].image).toBe(n.image);
  const svg = await svgString(changed, p);
  expect(svg).toContain("matrix(160 0 0 80 -10 0)");
  expect(h.undo(changed)).toEqual(d);
  expect(h.redo(d)).toEqual(changed);
});

it("exports an image border as geometry instead of accidentally drawing duplicate images", async () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("image", p, {
      width: 100,
      height: 80,
      image: "data:image/png;base64,AA==",
      stroke: "#ff0000",
      strokeWidth: 8,
      fidelity: {
        size: [100, 80],
        strokeAlign: "outside",
        strokeOpacity: 0.6,
        strokeDash: [12, 6],
      },
    }),
  );
  const svg = await svgString(d, p);
  expect(svg.match(/<image /g) ?? []).toHaveLength(1);
  expect(svg).toContain('stroke-width="16"');
  expect(svg).toContain('stroke-opacity="0.6"');
  expect(svg).toContain('width="116"');
});
