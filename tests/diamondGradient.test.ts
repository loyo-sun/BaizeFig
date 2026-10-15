import { it, expect } from "vitest";
import { emptyDocument, makeNode, validateDocument } from "../src/core";
import { svgString } from "../src/Canvas";
import { writeFileSync } from "node:fs";
import { DiamondGradient } from "../src/appearance";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
it("keeps diamond fills vector based with independent IDs, affine transforms and alpha stops", async () => {
  const d = emptyDocument();
  d.name = "Diamond gradient verification";
  const p = d.pages[0].id;
  d.nodes = [
    makeNode("rectangle", p, {
      id: "diamond",
      name: "Diamond",
      x: 0,
      y: 0,
      width: 320,
      height: 220,
      fidelity: {
        size: [320, 220],
        paints: [
          {
            type: "diamond",
            opacity: 1,
            transform: [1, 0, 0, 1, 0, 0],
            stops: [
              { position: 0, color: "#ffffff" },
              { position: 0.45, color: "#f94790" },
              { position: 1, color: "#1530b0" },
            ],
          },
        ],
      },
    }),
  ];
  validateDocument(d);
  validateDocument(JSON.parse(JSON.stringify(d)));
  const svg = await svgString(d, p);
  expect(svg.match(/<linearGradient/g)).toHaveLength(4);
  expect(svg).toContain('patternContentUnits="objectBoundingBox"');
  expect(svg).not.toContain("<image");
  expect(svg).not.toContain("NaN");
  const ids = Array.from(svg.matchAll(/ id="([^"]+)"/g), (m) => m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  const moved = structuredClone(d);
  moved.nodes[0].fidelity!.paints![0].transform = [2, 0.5, 0, 1, -0.5, 0.1];
  expect(await svgString(moved, p)).not.toEqual(svg);
  if (process.env.DIAMOND_FIXTURE_PATH)
    writeFileSync(process.env.DIAMOND_FIXTURE_PATH, JSON.stringify(d));
});
it("handles user coordinates and singular paint transforms without infinite SVG geometry", () => {
  const base = {
    type: "diamond" as const,
    opacity: 1,
    space: "user" as const,
    stops: [
      { position: 0, color: "#ff000080" },
      { position: 1, color: "#0000ffff" },
    ],
  };
  const svg = renderToStaticMarkup(
    React.createElement(DiamondGradient, {
      id: "d",
      paint: base,
      width: 300,
      height: 200,
    }),
  );
  expect(svg).toContain('patternUnits="userSpaceOnUse"');
  expect(svg).toContain('width="300"');
  expect(svg).toContain("#ff000080");
  const bad = renderToStaticMarkup(
    React.createElement(DiamondGradient, {
      id: "d",
      paint: { ...base, transform: [0, 0, 0, 0, 0, 0] },
      width: 300,
      height: 200,
    }),
  );
  expect(bad).toBe("");
});
