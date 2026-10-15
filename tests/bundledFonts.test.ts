import { svgString } from "../src/Canvas";
import { DOMParser } from "@xmldom/xmldom";
import { expect, it, vi } from "vitest";
import { emptyDocument, makeNode } from "../src/core";
import {
  fontFamilies,
  renderFontFamily,
  usesBundledInter,
} from "../src/fontFamily";
import { bundledFontCss } from "../src/bundledFonts";

it("keeps the installed font first and inserts the bundled fallback only for Inter", () => {
  expect(fontFamilies(renderFontFamily('"Inter", Arial, sans-serif'))).toEqual([
    "Inter",
    "Inter Variable",
    "Arial",
    "sans-serif",
  ]);
  expect(renderFontFamily("inter, serif")).toBe(
    'inter, "Inter Variable", serif',
  );
  expect(renderFontFamily('Inter, "Inter Variable"')).toBe(
    'Inter, "Inter Variable"',
  );
  expect(renderFontFamily("Inter Tight, Arial")).toBe("Inter Tight, Arial");
  expect(usesBundledInter("Inter Tight")).toBe(false);
});

it("embeds licensed font bytes for the used Unicode subsets in portable exports", async () => {
  const loader = vi.fn(async () => new Uint8Array([119, 79, 70, 50]));
  const n = makeNode("text", "page", { text: "BaizeFig", fontFamily: "Inter" });
  const latin = await bundledFontCss([n], loader);
  expect(loader).toHaveBeenCalledTimes(2);
  expect(latin).toContain("data:font/woff2;base64,d09GMg==");
  expect(latin).toContain("font-style: italic");
  expect(latin).toContain("font-weight: 100 900");
  expect(latin).not.toMatch(/url\((?!data:)/);
  loader.mockClear();
  await bundledFontCss([{ ...n, text: "ΩЖ" }], loader);
  expect(loader).toHaveBeenCalledTimes(4);
});

it("includes mixed Inter runs but does not embed other installed fonts or cached glyph outlines", async () => {
  const loader = vi.fn(async () => new Uint8Array([1]));
  const n = makeNode("text", "page", { text: "abc", fontFamily: "Arial" });
  expect(await bundledFontCss([n], loader)).toBe("");
  expect(loader).not.toHaveBeenCalled();
  n.textFlow = {
    autoResize: "fixed",
    verticalAlign: "top",
    letterSpacing: 0,
    runs: [{ start: 0, end: 3, fontFamily: "Inter" }],
  };
  expect(await bundledFontCss([n], loader)).toContain("data:font/woff2");
  loader.mockClear();
  expect(await bundledFontCss([{ ...n, visible: false }], loader)).toBe("");
  expect(loader).not.toHaveBeenCalled();
});

it("fails exports explicitly when a required font asset cannot be read", async () => {
  await expect(
    bundledFontCss(
      [makeNode("text", "page", { text: "abc", fontFamily: "Inter" })],
      async () => {
        throw Error("offline asset unavailable");
      },
    ),
  ).rejects.toThrow("offline asset unavailable");
});

it("exports valid SVG XML with embedded fonts and the complete redistribution license", async () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal(
    "fetch",
    async () => new Response(new Uint8Array([119, 79, 70, 50])),
  );
  try {
    const doc = emptyDocument();
    doc.nodes = [
      makeNode("text", doc.pages[0].id, {
        text: "BaizeFig",
        fontFamily: "Inter",
      }),
    ];
    const svg = await svgString(doc, doc.pages[0].id);
    const errors: string[] = [];
    const xml = new DOMParser({
      onError: (_level, message) => errors.push(message),
    }).parseFromString(svg, "image/svg+xml");
    expect(errors).toEqual([]);
    expect(xml.getElementsByTagName("style")[0].textContent).toContain(
      "data:font/woff2",
    );
    expect(xml.getElementsByTagName("metadata")[0].textContent).toContain(
      "SIL OPEN FONT LICENSE",
    );
    expect(
      xml.getElementsByTagName("text")[0].getAttribute("font-family"),
    ).toContain("Inter Variable");
  } finally {
    vi.unstubAllGlobals();
  }
});
