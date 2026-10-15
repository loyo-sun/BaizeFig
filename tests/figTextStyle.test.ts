import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { readFigArchive, importFig } from "../src/figImport";
import { validateDocument, execute } from "../src/core";
const sample = process.env.FIG_SAMPLE_PATH;
it.skipIf(!sample)(
  "restores linked font sizes and line heights instead of placeholder typography in the supplied sample",
  () => {
    const bytes = readFileSync(sample!),
      { message } = readFigArchive(bytes),
      raw = message.nodeChanges as Record<string, any>[];
    const guid = (g: any) => (g ? `${g.sessionID}:${g.localID}` : "");
    const index = new Map(raw.map((n) => [guid(n.guid), n]));
    const doc = importFig(bytes).document;
    let checked = 0,
      headings = 0;
    for (const n of doc.nodes) {
      if (n.type !== "text" || n.componentOwner) continue;
      const original = index.get(n.fidelity?.sourceId ?? "");
      if (!original?.styleIdForText) continue;
      const ref = original.styleIdForText;
      const style = ref.guid
        ? index.get(guid(ref.guid))
        : raw.find((s) => s.key && s.key === ref.assetRef?.key);
      if (!style || n.bindings?.fontSize) continue;
      expect(n.fontSize).toBe(style.fontSize);
      if (style.lineHeight?.units === "PIXELS")
        expect(n.lineHeight).toBeCloseTo(
          style.lineHeight.value / style.fontSize,
          5,
        );
      checked++;
      if (original.fontSize === 12 && style.fontSize === 40) {
        expect(original.derivedTextData.glyphs[0].fontSize).toBe(40);
        headings++;
      }
    }
    expect(checked).toBeGreaterThan(20);
    expect(headings).toBeGreaterThan(0);
    const heading = doc.nodes.find(
      (n) => n.type === "text" && !n.componentOwner && n.fontSize === 40,
    )!;
    const changed = execute(doc, {
      type: "update",
      ids: [heading.id],
      patch: { text: heading.text + " test" },
    }).doc;
    expect(changed.nodes.find((n) => n.id === heading.id)!.fontSize).toBe(40);
    validateDocument(JSON.parse(JSON.stringify(changed)));
  },
  15000,
);
