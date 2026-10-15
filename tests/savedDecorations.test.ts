import { expect, it } from "vitest";
import { readFigDecorations } from "../src/figGlyphCache";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import { encodeGlyphCache } from "../src/glyphCache";
import { svgString } from "../src/Canvas";
import { vectorVisualBounds } from "../src/vectorGeometry";
const source = {
  derivedTextData: {
    decorations: [{ styleID: 2, rects: [{ x: 0, y: 44, w: 80, h: 3 }] }],
  },
  textData: {
    styleOverrideTable: [
      {
        styleID: 2,
        textDecorationFillPaints: [{ type: "SOLID", color: "#cc000080" }],
      },
    ],
  },
};
it("restores styled solid rectangles and refuses malformed or unsupported decoration data", () => {
  expect(readFigDecorations(source, (p) => p.color)).toEqual([
    { x: 0, y: 44, width: 80, height: 3, fill: "#cc000080" },
  ]);
  for (const change of [
    { textDecorationStyle: "WAVY" },
    {
      textData: {
        styleOverrideTable: [
          {
            styleID: 2,
            textDecorationFillPaints: [{ type: "GRADIENT_LINEAR" }],
          },
        ],
      },
    },
    {
      derivedTextData: {
        decorations: [{ rects: [{ x: 0, y: 0, w: -2, h: 3 }] }],
      },
    },
    {
      derivedTextData: {
        decorations: [{ rects: [{ x: NaN, y: 0, w: 2, h: 3 }] }],
      },
    },
  ])
    expect(
      readFigDecorations({ ...source, ...change }, (p) => p.color),
    ).toBeUndefined();
});
it("includes saved decorations beyond the text box in geometry, preserves links, and invalidates on range color edits", async () => {
  const doc = emptyDocument(),
    n = makeNode("text", doc.pages[0].id, {
      text: "A",
      width: 20,
      height: 40,
      fill: "#204d39",
      textFlow: {
        autoResize: "fixed",
        verticalAlign: "top",
        letterSpacing: 0,
        runs: [{ start: 0, end: 1, underline: true }],
      },
      fidelity: {
        size: [20, 40],
        text: {
          characters: "A",
          lines: [],
          letterSpacing: 0,
          spans: [{ start: 0, end: 1, underline: true }],
          glyphCache: encodeGlyphCache(
            [
              {
                d: "M0 0L1 0L1 1L0 1Z",
                x: 0,
                y: 20,
                size: 20,
                start: 0,
                rotation: 0,
              },
            ],
            1,
          ),
          decorations: [{ x: -4, y: 44, width: 30, height: 3 }],
        },
      },
    });
  doc.nodes = [n];
  validateDocument(doc);
  expect(vectorVisualBounds(doc, n)).toMatchObject({
    x: -4,
    y: 0,
    width: 30,
    height: 47,
  });
  const linked = execute(doc, {
    type: "update",
    ids: [n.id],
    patch: {
      textFlow: {
        ...n.textFlow!,
        runs: [
          { start: 0, end: 1, underline: true, href: "https://example.com/" },
        ],
      },
    },
  }).doc;
  expect(linked.nodes[0].fidelity?.text?.decorations).toHaveLength(1);
  expect(await svgString(linked, doc.pages[0].id)).not.toContain("<text ");
  const recolored = execute(linked, {
    type: "update",
    ids: [n.id],
    patch: {
      textFlow: {
        ...n.textFlow!,
        runs: [{ start: 0, end: 1, underline: true, fill: "#cc0000" }],
      },
    },
  }).doc;
  expect(recolored.nodes[0].fidelity?.text?.glyphCache).toBeUndefined();
  const invalid = structuredClone(doc);
  invalid.nodes[0].fidelity!.text!.decorations![0].height = Infinity;
  expect(() => validateDocument(invalid)).toThrow(
    "Invalid saved text decorations",
  );
});
