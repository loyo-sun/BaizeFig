import { parsePaths } from "../src/vectorGeometry";
import { DOMParser } from "@xmldom/xmldom";
import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { textBaselineD, nearestBaselineOffset } from "../src/textPath";
import type { VectorNetwork } from "../src/vectorNetwork";
import { svgString, exportBounds } from "../src/Canvas";
const network: VectorNetwork = {
  vertices: [
    { x: 10, y: 100 },
    { x: 250, y: 100 },
  ],
  segments: [{ a: 0, b: 1, ha: { x: 60, y: -100 }, hb: { x: -60, y: -100 } }],
  regions: [],
};
function fixture() {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.name = "路径文字验收";
  doc.nodes = [
    makeNode("text", p, {
      id: "curved",
      name: "Curved text",
      text: "白泽",
      x: 160,
      y: 200,
      width: 260,
      height: 120,
      fontSize: 24,
      fill: "#244933",
      textAlign: "center",
      textFlow: { autoResize: "fixed", verticalAlign: "top", letterSpacing: 0 },
      fidelity: {
        size: [260, 120],
        textPath: {
          network: structuredClone(network),
          offset: 0.5,
          reverse: false,
        },
        text: {
          characters: "白泽",
          lines: [],
          letterSpacing: 0,
          glyphs: [
            {
              d: "M0 0 L0 1 L.8 1 L.8 0 Z",
              x: 100,
              y: 30,
              size: 24,
              rotation: 0,
              start: 0,
            },
            {
              d: "M0 0 L0 1 L.8 1 L.8 0 Z",
              x: 126,
              y: 30,
              size: 24,
              rotation: 0,
              start: 1,
            },
          ],
        },
      },
    }),
  ];
  return doc;
}
it("orders and reverses a connected baseline and projects points onto curved length", () => {
  const p = { network, offset: 0.5, reverse: false };
  expect(textBaselineD(p)).toBe("M10 100 C70 0 190 0 250 100");
  expect(textBaselineD({ ...p, reverse: true })).toBe(
    "M250 100 C190 0 70 0 10 100",
  );
  expect(nearestBaselineOffset(p, { x: 130, y: 25 })).toBeCloseTo(0.5, 3);
  expect(nearestBaselineOffset(p, { x: 10, y: 100 })).toBe(0);
  expect(nearestBaselineOffset(p, { x: 250, y: 100 })).toBe(1);
});
it("keeps saved glyph contours before edits and reflows edited text along the baseline", async () => {
  const doc = fixture();
  validateDocument(doc);
  const before = await svgString(doc, doc.pages[0].id, ["curved"]);
  expect(before).toContain("translate(100 30) rotate(0) scale(24 -24)");
  expect(before).not.toContain("<textPath");
  const changed = execute(doc, {
    type: "update",
    ids: ["curved"],
    patch: { text: "BaizeFig 白泽" },
  }).doc;
  expect(changed.nodes[0].fidelity?.text?.glyphs).toBeUndefined();
  expect(changed.nodes[0].fidelity?.textPath?.network).toEqual(network);
  expect(changed.nodes[0].height).toBe(120);
  const svg = await svgString(changed, changed.pages[0].id, ["curved"]);
  expect(svg).toContain("<textPath");
  expect(svg).toContain('startOffset="50%"');
  expect(svg).toContain("BaizeFig 白泽");
  validateDocument(JSON.parse(JSON.stringify(changed)));
  const history = new History();
  history.push(doc);
  expect(history.undo(changed)).toEqual(doc);
  if (process.env.BAIZEFIG_TEXT_PATH_FIXTURE)
    writeFileSync(
      "/private/tmp/baizefig-text-path.baizefig",
      JSON.stringify(doc),
    );
});
it("includes saved glyph overhang and conservatively includes edited text in export bounds", () => {
  const doc = fixture();
  doc.nodes[0].fidelity!.text!.glyphs![0].y = -20;
  expect(exportBounds(doc, doc.pages[0].id, ["curved"]).y).toBeLessThan(160);
  const edited = execute(doc, {
    type: "update",
    ids: ["curved"],
    patch: { text: "Larger", fontSize: 48 },
  }).doc;
  expect(exportBounds(edited, edited.pages[0].id, ["curved"]).y).toBeLessThan(
    200,
  );
});
it("rejects branching baselines, invalid offsets and malformed saved glyph data", () => {
  const doc = fixture();
  doc.nodes[0].fidelity!.textPath!.offset = NaN;
  expect(() => validateDocument(doc)).toThrow();
  const invalid = fixture();
  invalid.nodes[0].fidelity!.text!.glyphs![0].d = "<script>";
  expect(() => validateDocument(invalid)).toThrow("Invalid saved glyph");
  const branching = fixture();
  const n = branching.nodes[0].fidelity!.textPath!.network;
  n.vertices.push({ x: 10, y: 10 }, { x: 20, y: 20 });
  n.segments.push(
    { a: 0, b: 2, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } },
    { a: 0, b: 3, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } },
  );
  expect(() => validateDocument(branching)).toThrow("Invalid text baseline");
});

it("resizes the baseline without multiplying edited font size twice", async () => {
  const doc = fixture(),
    changed = execute(doc, {
      type: "update",
      ids: ["curved"],
      patch: { text: "Resize", width: 520, fontSize: 48 },
    }).doc;
  const svg = await svgString(changed, changed.pages[0].id, ["curved"]);
  expect(svg).toContain('font-size="48"');
  const xml = new DOMParser().parseFromString(svg, "image/svg+xml");
  const ref = xml
    .getElementsByTagName("textPath")[0]
    .getAttribute("href")!
    .slice(1);
  const path = [...Array.from(xml.getElementsByTagName("path"))].find(
    (n) => n.getAttribute("id") === ref,
  )!;
  const baseline = parsePaths([
    { d: path.getAttribute("d")!, rule: "nonzero" },
  ]);
  expect(baseline.vertices).toEqual([
    { x: 20, y: 100 },
    { x: 500, y: 100 },
  ]);
  expect(svg).not.toContain('transform="scale(2 1)"');
});
