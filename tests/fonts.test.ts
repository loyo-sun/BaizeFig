import { it, expect } from "vitest";
import { emptyDocument, makeNode, validateDocument } from "../src/core";
import {
  fontFamilies,
  hasFont,
  documentFonts,
  replaceFont,
} from "../src/fonts";
it("handles quoted family names and detects fallback-only fonts using two baselines", () => {
  expect(fontFamilies('"A, B", Arial, sans-serif')).toEqual([
    "A, B",
    "Arial",
    "sans-serif",
  ]);
  expect(
    hasFont("Missing", (family) => (family.includes("monospace") ? 10 : 20)),
  ).toBe(false);
  expect(
    hasFont("Installed", (family) =>
      family.startsWith('"Installed"') ? 15 : family === "monospace" ? 10 : 20,
    ),
  ).toBe(true);
  expect(hasFont("sans-serif", () => 0)).toBe(true);
});
it("replaces base and mixed fonts without losing rich styles and skips locked text", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("text", p, {
      fontFamily: "Missing, Arial",
      text: "白泽 hello",
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        runs: [
          {
            start: 0,
            end: 2,
            fontFamily: "Missing",
            fontWeight: 700,
            underline: true,
          },
          { start: 3, end: 8, fontFamily: "Other" },
        ],
      },
    }),
    makeNode("text", p, { fontFamily: "Missing", locked: true }),
  );
  expect(documentFonts(d)).toEqual(["Arial", "Missing", "Other"]);
  const r = replaceFont(d, "Missing", "Noto Sans SC");
  expect(r.count).toBe(1);
  expect(r.skipped).toBe(1);
  expect(r.doc.nodes[0].fontFamily).toContain("Noto Sans SC");
  expect(r.doc.nodes[0].textFlow?.runs?.[0]).toMatchObject({
    fontWeight: 700,
    underline: true,
    fontFamily: '"Noto Sans SC"',
  });
  expect(r.doc.nodes[0].textFlow?.runs?.[1].fontFamily).toBe('"Other"');
  expect(r.doc.nodes[1]).toEqual(d.nodes[1]);
  validateDocument(r.doc);
  expect(() => replaceFont(d, "Missing", "")).toThrow();
});
