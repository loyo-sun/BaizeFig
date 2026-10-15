import { vectorVisualBounds } from "../src/vectorGeometry";
import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, strToU8 } from "fflate";
import { encodeGlyphCache, decodeGlyphCache } from "../src/glyphCache";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { commandsPath } from "../src/fidelity";
import { svgString, exportBounds } from "../src/Canvas";
import { readFigArchive, importFig } from "../src/figImport";
const glyph = {
  d: "M0 0 L0.5 0 L0.5 1 L0 1 Z",
  x: 0,
  y: 40,
  size: 40,
  rotation: 0,
  start: 0,
};
it("deduplicates and compresses contours while retaining exact glyph positions", () => {
  const glyphs = Array.from({ length: 100 }, (_, i) => ({
    ...glyph,
    x: i * 25,
    start: i,
  }));
  const packed = encodeGlyphCache(glyphs, 100);
  expect(packed.length).toBeLessThan(JSON.stringify(glyphs).length / 4);
  expect(decodeGlyphCache(packed, 100)).toEqual(glyphs);
  expect(() => decodeGlyphCache(packed, 99)).toThrow(
    "Invalid saved glyph cache",
  );
});
it("rejects oversized, corrupt, mismatched and structurally invalid compressed input", () => {
  const pack = (data: unknown, declared?: number) => {
    const raw = strToU8(JSON.stringify(data));
    return `g1:${declared ?? raw.length}:${Buffer.from(deflateSync(raw)).toString("base64")}`;
  };
  for (const input of [
    "g1:99999999:AAAA",
    "g1:3:!",
    "g1:3:AAAA",
    pack([1, ["M0 0"], [[0, 0, 0, 0, 0, 0]]]),
    pack([1, ["<script>"], [[0, 0, 0, 1, 0, 0]]]),
    pack([1, ["M0 0 L"], [[0, 0, 0, 1, 0, 0]]]),
    pack([1, ["M0 0"], [[0, null, 0, 1, 0, 0]]]),
    pack([1, ["M0 0"], [[1, 0, 0, 1, 0, 0]]]),
    pack([1, ["M0 0"], [[0, 0, 0, 1, 0, 0]]], 2),
    pack(" ".repeat(5 * 1024 * 1024), 4 * 1024 * 1024),
  ])
    expect(() => decodeGlyphCache(input, 1)).toThrow(
      "Invalid saved glyph cache",
    );
});
function fixture() {
  const d = emptyDocument();
  d.name = "Saved glyph verification";
  d.nodes = [
    makeNode("text", d.pages[0].id, {
      name: "Saved outline text",
      text: "CACHE",
      x: 40,
      y: 40,
      width: 200,
      height: 60,
      fontFamily: "Unavailable source font",
      fontSize: 40,
      fill: "#204d39",
      textFlow: { autoResize: "fixed", verticalAlign: "top", letterSpacing: 0 },
      fidelity: {
        size: [200, 60],
        text: {
          characters: "CACHE",
          lines: [{ start: 0, end: 5, x: 0, y: 40 }],
          letterSpacing: 0,
          glyphCache: encodeGlyphCache(
            Array.from({ length: 5 }, (_, i) => ({
              ...glyph,
              x: i * 30,
              start: i,
            })),
            5,
          ),
        },
      },
    }),
  ];
  return d;
}
it("renders unchanged text as grouped paths without the source font, then reflows edits and restores undo snapshots", async () => {
  const d = fixture(),
    n = d.nodes[0];
  validateDocument(d);
  const svg = await svgString(d, d.pages[0].id);
  expect(svg).toContain('aria-label="CACHE"');
  expect(svg).not.toContain("<text ");
  expect((svg.match(/<path /g) ?? []).length).toBe(1);
  expect(vectorVisualBounds(d, n)).toMatchObject({
    x: 40,
    y: 40,
    width: 140,
    height: 40,
  });
  expect(exportBounds(d, d.pages[0].id, [n.id])).toMatchObject({
    x: 40,
    y: 40,
    width: 200,
    height: 60,
  });
  const history = new History();
  history.push(d);
  const edited = execute(d, {
    type: "update",
    ids: [n.id],
    patch: { text: "EDIT" },
  }).doc;
  expect(edited.nodes[0].fidelity?.text?.glyphCache).toBeUndefined();
  expect(await svgString(edited, d.pages[0].id)).toContain("<text ");
  const restored = JSON.parse(JSON.stringify(history.undo(edited)));
  validateDocument(restored);
  expect(await svgString(restored, d.pages[0].id)).toContain(
    'aria-label="CACHE"',
  );
  const moved = execute(restored, {
    type: "update",
    ids: [n.id],
    patch: { x: 80, fill: "#cc0000" },
  }).doc;
  expect(moved.nodes[0].fidelity?.text?.glyphCache).toBe(
    n.fidelity?.text?.glyphCache,
  );
  expect(await svgString(moved, d.pages[0].id)).toContain('fill="#cc0000"');
  if (process.env.BAIZEFIG_GLYPH_FIXTURE)
    writeFileSync(
      "/private/tmp/baizefig-saved-glyph.baizefig",
      JSON.stringify(d),
    );
});
const sample = process.env.FIG_SAMPLE_PATH;
it.skipIf(!sample)(
  "preserves actual source glyph contours and positions in a compact native document",
  () => {
    const bytes = readFileSync(sample!),
      { message } = readFigArchive(bytes),
      raw = message.nodeChanges as Record<string, any>[],
      index = new Map(
        raw.map((r) => [`${r.guid.sessionID}:${r.guid.localID}`, r]),
      );
    const doc = importFig(bytes).document;
    let checked = 0,
      packedSize = 0,
      expandedSize = 0;
    for (const n of doc.nodes) {
      const packed = n.fidelity?.text?.glyphCache;
      if (n.type !== "text" || !packed || n.componentOwner) continue;
      const source = index.get(n.fidelity!.sourceId!)!;
      const decoded = decodeGlyphCache(packed, n.text.length);
      expect(decoded.length).toBe(source.derivedTextData.glyphs.length);
      source.derivedTextData.glyphs.forEach((g: any, i: number) =>
        expect(decoded[i]).toEqual({
          d: commandsPath(message.blobs[g.commandsBlob].bytes),
          x: g.position.x,
          y: g.position.y,
          size: g.fontSize,
          rotation: g.rotation ?? 0,
          start: g.firstCharacter,
        }),
      );
      packedSize += packed.length;
      expandedSize += JSON.stringify(decoded).length;
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
    expect(packedSize).toBeLessThan(expandedSize / 2);
    validateDocument(JSON.parse(JSON.stringify(doc)));
    if (process.env.BAIZEFIG_GLYPH_STATS)
      console.log({
        checked,
        packedSize,
        expandedSize,
        nativeBytes: Buffer.byteLength(JSON.stringify(doc)),
      });
  },
  15000,
);
