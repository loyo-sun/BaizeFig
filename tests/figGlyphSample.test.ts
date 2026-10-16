import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { readFigArchive } from "../src/figImport";
import { readFigGlyphCache } from "../src/figGlyphCache";
import { decodeGlyphCache } from "../src/glyphCache";

it.skipIf(!process.env.FIG_GLYPH_SAMPLE_PATH)("validates every saved text glyph in the external sample", () => {
  const archive = readFigArchive(readFileSync(process.env.FIG_GLYPH_SAMPLE_PATH!));
  const contours = new Map<number, string>();
  let layers = 0, glyphs = 0, synthetic = 0;
  const errors: {id: string; error: string}[] = [];
  for (const n of archive.message.nodeChanges) {
    if (n.type !== "TEXT" || !n.derivedTextData?.glyphs?.length) continue;
    const text = n.textData?.characters ?? "", source = n.derivedTextData.glyphs;
    try {
      const packed = readFigGlyphCache(text, source, i => archive.message.blobs?.[i]?.bytes, contours, n.textData?.characterStyleIDs);
      const saved = decodeGlyphCache(packed, text.length);
      expect(saved).toHaveLength(source.length);
      for (let i = 0; i < saved.length; i++) {
        const g = source[i];
        expect(saved[i]).toMatchObject({x:g.position.x, y:g.position.y, size:g.fontSize, rotation:g.rotation ?? 0});
        if (g.firstCharacter !== undefined) expect(saved[i].start).toBe(g.firstCharacter);
        else synthetic++;
      }
      layers++; glyphs += saved.length;
    } catch (e) { errors.push({id:`${n.guid.sessionID}:${n.guid.localID}`, error:String(e)}); }
  }
  if (process.env.FIG_GLYPH_REPORT_PATH) writeFileSync(process.env.FIG_GLYPH_REPORT_PATH, JSON.stringify({layers,glyphs,synthetic,errors},null,2));
  expect(layers).toBeGreaterThan(0);
  expect(errors).toEqual([]);
}, 180000);
