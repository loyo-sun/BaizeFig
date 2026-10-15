import { expect, it } from "vitest";
import {
  figFontWeight,
  figTextDecorations,
  resolveFigTypography,
} from "../src/figTypography";
it("resolves linked typography rather than placeholder values while retaining explicit instance overrides", () => {
  const node = {
    styleIdForText: { assetRef: { key: "type-heading" } },
    fontSize: 12,
    fontName: { family: "Inter", style: "Regular" },
    lineHeight: { units: "PERCENT", value: 100 },
    width: 300,
    textData: { characters: "White Ze" },
  };
  const style = {
    styleType: "TEXT",
    fontSize: 40,
    fontName: { family: "Inter", style: "Semi Bold" },
    lineHeight: { units: "PIXELS", value: 46 },
    letterSpacing: { units: "PERCENT", value: 2 },
  };
  const resolved = resolveFigTypography(node, () => style, new Set());
  expect(resolved).toMatchObject({
    fontSize: 40,
    fontName: { style: "Semi Bold" },
    lineHeight: { value: 46 },
    width: 300,
    textData: node.textData,
  });
  expect(node.fontSize).toBe(12);
  expect(
    resolveFigTypography(
      { ...node, fontSize: 24 },
      () => style,
      new Set(),
      new Set(["fontSize"]),
    ).fontSize,
  ).toBe(24);
});
it("uses uniform saved metrics when a style is unavailable and reports the fallback", () => {
  const warnings = new Set<string>(),
    node = {
      styleIdForText: { guid: {} },
      fontSize: 12,
      fontName: { family: "Fallback", style: "Regular" },
      derivedTextData: {
        glyphs: [{ fontSize: 30 }, { fontSize: 30 }],
        fontMetaData: [
          { key: { family: "Inter", style: "Semi Bold" }, fontWeight: 600 },
        ],
      },
    };
  expect(resolveFigTypography(node, () => undefined, warnings)).toMatchObject({
    fontSize: 30,
    fontName: { family: "Inter", style: "Semi Bold" },
  });
  expect(warnings.size).toBe(1);
  expect(
    resolveFigTypography(
      {
        ...node,
        derivedTextData: { glyphs: [{ fontSize: 30 }, { fontSize: 12 }] },
      },
      () => undefined,
      warnings,
    ).fontSize,
  ).toBe(12);
});
it("maps font weights without mistaking semibold for bold and prefers matching saved weight", () => {
  expect(figFontWeight("Semi Bold")).toBe(600);
  expect(figFontWeight("ExtraBold Italic")).toBe(800);
  expect(figFontWeight("ExtraLight")).toBe(200);
  expect(figFontWeight("Thin")).toBe(100);
  expect(
    figFontWeight(
      "Variable",
      [{ key: { family: "Inter", style: "Variable" }, fontWeight: 625 }],
      "Inter",
    ),
  ).toBe(625);
  expect(figFontWeight("Normal")).toBe(400);
});
it("preserves inherited italic and decoration while allowing a mixed range to override them", () => {
  expect(
    figTextDecorations(
      "abc",
      { fontName: { style: "Italic" }, textDecoration: "UNDERLINE" },
      [{ start: 1, end: 2, italic: false, underline: false, fontSize: 20 }],
    ),
  ).toEqual([
    { start: 0, end: 1, italic: true, underline: true },
    { start: 1, end: 2, italic: false, underline: false, fontSize: 20 },
    { start: 2, end: 3, italic: true, underline: true },
  ]);
});
it("restores safe whole-layer and range links while retaining explicit link removal", () => {
  const linked = figTextDecorations(
    "abc",
    { hyperlink: { url: "https://example.com" } },
    [
      { start: 1, end: 2, href: undefined },
      { start: 2, end: 3, href: "mailto:hello@example.com" },
    ],
  );
  expect(linked).toEqual([
    { start: 0, end: 1, href: "https://example.com/" },
    { start: 1, end: 2, href: undefined },
    { start: 2, end: 3, href: "mailto:hello@example.com" },
  ]);
  expect(
    figTextDecorations(
      "abc",
      { hyperlink: { url: "javascript:alert(1)" } },
      [],
    ),
  ).toEqual([]);
});
