import {
  textRunsForClipboard,
  sliceTextFragment,
  validateTextFragment,
} from "../src/textClipboard";
import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { parseSchema, compileSchema, encodeBinarySchema } from "kiwi-schema";
import { deflateSync, strToU8 } from "fflate";
import {
  figFontSettings,
  validFontSettings,
  fontSettingsStyle,
  mergeFontSettings,
} from "../src/fontSettings";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { importFig } from "../src/figImport";
import { layoutText } from "../src/textLayout";
import { svgString } from "../src/Canvas";
it("restores explicit disabled features, numeric alternates and four-byte variable axes", () => {
  expect(
    figFontSettings({
      fontVariantCommonLigatures: false,
      fontVariantContextualLigatures: true,
      fontVariantNumericSpacing: "TABULAR",
      fontVariantCaps: "ALL_SMALL",
      fontVariations: [
        { axisTag: 0x77676874, value: 625 },
        { axisTag: 0x77647468, value: 92.5 },
      ],
    }),
  ).toMatchObject({
    features: { liga: 0, calt: 1, tnum: 1, pnum: 0, smcp: 1, c2sc: 1 },
    variations: { wght: 625, wdth: 92.5 },
  });
  expect(
    figFontSettings({
      fontVariations: [
        { axisTag: 0, value: 1 },
        { axisTag: 0x77676874, value: Infinity },
      ],
    }),
  ).toBeUndefined();
});
it("rejects malformed native settings and CSS injection tags", () => {
  for (const value of [
    { features: { 'x\";!': 1 } },
    { features: { liga: -1 } },
    { variations: { wght: Infinity } },
    { features: [1] },
    { features: { liga: 0.5 } },
  ])
    expect(validFontSettings(value)).toBe(false);
  const doc = emptyDocument();
  doc.nodes = [
    makeNode("text", doc.pages[0].id, {
      textFlow: {
        autoResize: "fixed",
        verticalAlign: "top",
        letterSpacing: 0,
        fontSettings: { features: { liga: -1 } },
      },
    }),
  ];
  expect(() => validateDocument(doc)).toThrow("Invalid font settings");
});
it("shapes with merged run settings and retains unrelated axes during a local feature override", () => {
  const settings = mergeFontSettings(
    { features: { liga: 1, tnum: 1 }, variations: { wght: 550 } },
    { features: { liga: 0 } },
  );
  expect(fontSettingsStyle(settings)).toMatchObject({
    fontFeatureSettings: '"liga" 0, "tnum" 1',
    fontVariationSettings: '"wght" 550',
  });
  const doc = emptyDocument(),
    n = makeNode("text", doc.pages[0].id, {
      text: "office 123",
      textFlow: {
        autoResize: "both",
        verticalAlign: "top",
        letterSpacing: 0,
        fontSettings: { features: { liga: 1 }, variations: { wght: 550 } },
        runs: [{ start: 0, end: 6, fontSettings: { features: { liga: 0 } } }],
      },
    });
  const seen: any[] = [];
  layoutText(n, (_text, font) => {
    seen.push(font.settings);
    return 20;
  });
  expect(seen).toContainEqual({
    features: { liga: 0 },
    variations: { wght: 550 },
  });
  expect(seen).toContainEqual({
    features: { liga: 1 },
    variations: { wght: 550 },
  });
});
it("preserves imported OpenType settings through binary decoding, editing, undo, reload and SVG", async () => {
  const schema = parseSchema(
    `struct GUID { uint sessionID; uint localID; } struct Vec { float x; float y; } struct Font { string family; string style; } message Parent { GUID guid = 1; string position = 2; } message Axis { uint axisTag = 1; float value = 2; } message Style { uint styleID = 1; bool fontVariantCommonLigatures = 2; } message Text { string characters = 1; uint[] characterStyleIDs = 2; Style[] styleOverrideTable = 3; } message Node { GUID guid = 1; string type = 2; Parent parentIndex = 3; string name = 4; Vec size = 5; Font fontName = 6; float fontSize = 7; Text textData = 8; bool fontVariantCommonLigatures = 9; string fontVariantNumericSpacing = 10; Axis[] fontVariations = 11; } message Message { Node[] nodeChanges = 1; }`,
  );
  const g = (localID: number) => ({ sessionID: 0, localID }),
    parent = (id: number) => ({ guid: g(id), position: "a" });
  const parts = [
    deflateSync(encodeBinarySchema(schema)),
    deflateSync(
      compileSchema(schema).encodeMessage({
        nodeChanges: [
          { guid: g(0), type: "DOCUMENT" },
          { guid: g(1), type: "CANVAS", parentIndex: parent(0), name: "Page" },
          {
            guid: g(2),
            type: "TEXT",
            parentIndex: parent(1),
            name: "OpenType",
            size: { x: 300, y: 60 },
            fontName: { family: "Inter", style: "Regular" },
            fontSize: 40,
            textData: {
              characters: "office 123",
              characterStyleIDs: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
              styleOverrideTable: [
                { styleID: 1, fontVariantCommonLigatures: false },
              ],
            },
            fontVariantCommonLigatures: true,
            fontVariantNumericSpacing: "TABULAR",
            fontVariations: [{ axisTag: 0x77676874, value: 625 }],
          },
        ],
      }),
    ),
  ];
  const bytes = new Uint8Array(
    12 + parts.reduce((s, p) => s + 4 + p.length, 0),
  );
  bytes.set(strToU8("fig-kiwi"));
  new DataView(bytes.buffer).setUint32(8, 106, true);
  let offset = 12;
  for (const part of parts) {
    new DataView(bytes.buffer).setUint32(offset, part.length, true);
    bytes.set(part, offset + 4);
    offset += part.length + 4;
  }
  const doc = importFig(bytes).document,
    n = doc.nodes.find((n) => n.type === "text")!;
  expect(n.textFlow?.fontSettings).toMatchObject({
    features: { liga: 1, tnum: 1 },
    variations: { wght: 625 },
  });
  expect(n.textFlow?.runs?.[0].fontSettings?.features?.liga).toBe(0);
  const history = new History();
  history.push(doc);
  const next = execute(doc, {
    type: "update",
    ids: [n.id],
    patch: { text: "office 456" },
  }).doc;
  validateDocument(JSON.parse(JSON.stringify(next)));
  expect(next.nodes[0].textFlow?.fontSettings?.variations?.wght).toBe(625);
  expect(history.undo(next).nodes[0].text).toBe("office 123");
  const svg = await svgString(next, next.pages[0].id);
  expect(svg).toContain("font-variation-settings:&quot;wght&quot; 625");
  expect(svg).toContain("&quot;liga&quot; 0");
  const manual = execute(next, {
    type: "update",
    ids: [n.id],
    patch: { fontWeight: 700 },
  }).doc;
  expect(
    manual.nodes[0].textFlow?.fontSettings?.variations?.wght,
  ).toBeUndefined();
});
it("copies effective font settings across plain and mixed selections", () => {
  const n = makeNode("text", "page", {
    text: "office123",
    fontFamily: "Inter",
    fontSize: 40,
    textFlow: {
      autoResize: "fixed",
      verticalAlign: "top",
      letterSpacing: 0,
      fontSettings: { features: { tnum: 1 }, variations: { wght: 625 } },
    },
  });
  const runs = textRunsForClipboard(n, n.text, [
    { start: 0, end: 6, fontSettings: { features: { liga: 0 } } },
  ]);
  const copied = sliceTextFragment(
    { text: n.text, runs, paragraphs: [] },
    3,
    9,
  );
  validateTextFragment(copied);
  expect(copied.runs[0].fontSettings).toEqual({
    features: { tnum: 1, liga: 0 },
    variations: { wght: 625 },
  });
  expect(copied.runs[1].fontSettings).toEqual({
    features: { tnum: 1 },
    variations: { wght: 625 },
  });
  expect(
    copied.runs.every((r) => r.fontFamily === "Inter" && r.fontSize === 40),
  ).toBe(true);
});
if (process.env.BAIZEFIG_OPENTYPE_FIXTURE) {
  const doc = emptyDocument();
  doc.name = "OpenType verification";
  doc.nodes = ["111111", "000000"].map((text, i) =>
    makeNode("text", doc.pages[0].id, {
      name: i ? "Zero digits" : "One digits",
      text,
      x: 40,
      y: 40 + i * 100,
      width: 300,
      height: 65,
      fontSize: 48,
      fontFamily: "Inter",
      fill: "#204d39",
      textFlow: {
        autoResize: "both",
        verticalAlign: "top",
        letterSpacing: 0,
        fontSettings: { features: { tnum: 0 }, variations: { wght: 400 } },
      },
    }),
  );
  writeFileSync("/private/tmp/baizefig-opentype.baizefig", JSON.stringify(doc));
}
