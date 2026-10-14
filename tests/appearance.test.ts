import { it, expect } from "vitest";
import { emptyDocument, makeNode, validateDocument } from "../src/core";
import { svgString, Scene } from "../src/Canvas";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { writeFileSync } from "node:fs";
import { combineShapes } from "../src/combine";
it("creates native masks and booleans as one reversible structural operation", async () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("rectangle", p, { id: "a", x: 10, y: 20, fill: "#ff0000" }),
    makeNode("ellipse", p, { id: "b", x: 50, y: 40 }),
  ];
  const combined = combineShapes(d, ["a", "b"], "subtract");
  expect(
    combined.doc.nodes.find((n) => n.id === combined.id)?.fidelity
      ?.booleanOperation,
  ).toBe("subtract");
  expect(d.nodes).toHaveLength(2);
  validateDocument(combined.doc);
  expect(await svgString(combined.doc, p)).toContain("boolean-");
  const masked = combineShapes(d, ["a", "b"], "mask");
  expect(masked.doc.nodes.find((n) => n.id === "a")?.fidelity?.mask).toBe(
    "alpha",
  );
  validateDocument(masked.doc);
});
export function appearanceFixture() {
  const d = emptyDocument();
  d.name = "兼容性验收";
  const p = d.pages[0].id;
  d.nodes = [
    makeNode("frame", p, {
      id: "board",
      name: "Appearance verification",
      x: 0,
      y: 0,
      width: 720,
      height: 440,
      fill: "#f4f6fa",
    }),
    makeNode("rectangle", p, {
      id: "gradient",
      name: "渐变和阴影",
      parentId: "board",
      x: 40,
      y: 40,
      width: 280,
      height: 130,
      radius: 20,
      fidelity: {
        size: [280, 130],
        paints: [
          { type: "solid", color: "#ffffff", opacity: 0.15 },
          {
            type: "linear",
            opacity: 1,
            stops: [
              { position: 0, color: "#0d7dff" },
              { position: 1, color: "#ab62ec" },
            ],
          },
        ],
        effects: [
          {
            type: "drop-shadow",
            visible: true,
            color: "#14264060",
            radius: 18,
            spread: 2,
            x: 0,
            y: 8,
          },
        ],
      },
    }),
    makeNode("rectangle", p, {
      id: "behind",
      name: "Blur backdrop",
      parentId: "board",
      x: 370,
      y: 40,
      width: 270,
      height: 130,
      fill: "#e83d64",
      rotation: 8,
    }),
    makeNode("rectangle", p, {
      id: "glass",
      name: "背景模糊",
      parentId: "board",
      x: 400,
      y: 80,
      width: 270,
      height: 100,
      fill: "#ffffff66",
      radius: 18,
      fidelity: {
        size: [270, 100],
        effects: [
          {
            type: "background-blur",
            visible: true,
            color: "#000000",
            radius: 24,
            spread: 0,
            x: 0,
            y: 0,
          },
        ],
      },
    }),
    makeNode("ellipse", p, {
      id: "mask",
      name: "蒙版",
      parentId: "board",
      x: 40,
      y: 230,
      width: 180,
      height: 150,
      fill: "#ffffff",
      fidelity: { size: [180, 150], mask: "alpha" },
    }),
    makeNode("rectangle", p, {
      id: "masked",
      name: "Masked gradient",
      parentId: "board",
      x: 40,
      y: 230,
      width: 280,
      height: 150,
      fidelity: {
        size: [280, 150],
        paints: [
          {
            type: "radial",
            opacity: 1,
            stops: [
              { position: 0, color: "#ffd335" },
              { position: 1, color: "#db274b" },
            ],
          },
        ],
      },
    }),
  ];
  return d;
}
it("renders live boolean operations without flattening their editable source layers", async () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.name = "布尔兼容验收";
  for (const [index, mode] of (
    ["union", "subtract", "intersect", "exclude"] as const
  ).entries()) {
    const id = `boolean-${mode}`;
    d.nodes.push(
      makeNode("group", p, {
        id,
        name: mode,
        x: index * 230,
        y: 0,
        width: 200,
        height: 160,
        fill: "#0d99ff",
        fidelity: { size: [200, 160], booleanOperation: mode },
      }),
      makeNode("rectangle", p, {
        id: `${id}-a`,
        parentId: id,
        x: 0,
        y: 20,
        width: 130,
        height: 100,
        fill: "#ffffff",
      }),
      makeNode("ellipse", p, {
        id: `${id}-b`,
        parentId: id,
        x: 70,
        y: 50,
        width: 130,
        height: 100,
        fill: "#ffffff",
      }),
    );
  }
  validateDocument(d);
  const svg = await svgString(d, p);
  expect(svg).toContain("boolean-");
  expect(svg).toContain("-not-prev-");
  expect(svg).not.toContain("NaN");
  expect(d.nodes).toHaveLength(12);
  if (process.env.BOOLEAN_FIXTURE_PATH)
    writeFileSync(process.env.BOOLEAN_FIXTURE_PATH, JSON.stringify(d));
});
it("preserves polygon counts and star inner radius in the shared renderer", async () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("polygon", p, { fidelity: { size: [100, 100], pointCount: 6 } }),
    makeNode("star", p, {
      x: 200,
      fidelity: { size: [100, 100], pointCount: 7, innerRatio: 0.2 },
    }),
  ];
  validateDocument(d);
  const svg = await svgString(d, p);
  const points = Array.from(svg.matchAll(/points="([^"]+)"/g), (m) =>
    m[1].split(" "),
  );
  expect(points.map((p) => p.length)).toEqual([6, 14]);
});
it("shares gradients, stacked fills, mask geometry and effect filters between canvas and export", async () => {
  const doc = appearanceFixture();
  validateDocument(doc);
  const svg = await svgString(doc, doc.pages[0].id);
  expect(svg).toContain("<linearGradient");
  expect(svg).toContain("<radialGradient");
  expect(svg).toContain("<mask");
  expect(svg).toContain('mask="url(');
  expect(svg).toContain("<feGaussianBlur");
  expect(svg).toContain("<feMorphology");
  expect(svg).toContain("<use");
  expect(svg).not.toContain("backdrop-filter:");
  const ids = Array.from(svg.matchAll(/\sid="([^"]+)"/g), (m) => m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  if (process.env.COMPATIBILITY_FIXTURE_PATH)
    writeFileSync(process.env.COMPATIBILITY_FIXTURE_PATH, JSON.stringify(doc));
});
it("isolates SVG definitions between scene previews of the same document", () => {
  const d = appearanceFixture(),
    html = renderToStaticMarkup(
      React.createElement(
        "svg",
        {},
        React.createElement(Scene, { doc: d, pageId: d.pages[0].id }),
        React.createElement(Scene, { doc: d, pageId: d.pages[0].id }),
      ),
    );
  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (m) => m[1]);
  expect(new Set(ids).size).toBe(ids.length);
});
it("validates image options inside paint stacks and rejects unsafe transforms", () => {
  const d = appearanceFixture(),
    n = d.nodes[1];
  n.fidelity!.paints = [
    {
      type: "image",
      opacity: 1,
      imageOptions: {
        mode: "crop",
        width: 100,
        height: 100,
        opacity: 1,
        scale: 1,
        transform: [1, 0, 0, 1, NaN, 0],
      },
    },
  ];
  expect(() => validateDocument(d)).toThrow("Invalid image transform");
});
