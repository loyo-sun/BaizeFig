import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { paragraphDirection } from "../src/textDirection";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { layoutText } from "../src/textLayout";
import { svgString } from "../src/Canvas";
it("chooses the first Unicode strong character, ignoring numbers, emoji and isolates", () => {
  for (const [text, direction] of [
    ["123 😀 مرحبا", "rtl"],
    ["123 😀 BaizeFig مرحبا", "ltr"],
    ["Ελληνικά שלום", "ltr"],
    ["Кириллица שלום", "ltr"],
    ["\u0710 hello", "rtl"],
    ["\u{1e900} hello", "rtl"],
    ["\u200fHello", "rtl"],
    ["\u200eשלום", "ltr"],
    ["\u2067שלום\u2069 English", "ltr"],
    ["\u2066English\u2069 שלום", "rtl"],
    ["\u2068שלום\u2066abc\u2069\u2069 English", "ltr"],
    ["123 …", "ltr"],
    ["\u2067שלום", "ltr"],
    ["123\u2029שלום", "ltr"],
  ] as const)
    expect(paragraphDirection(text), text).toBe(direction);
  expect(paragraphDirection("שלום", "ltr")).toBe("ltr");
  expect(paragraphDirection("Hello", "rtl")).toBe("rtl");
});
it("keeps a paragraph direction across wrapped lines and selects each paragraph independently", async () => {
  const d = emptyDocument(),
    n = makeNode("text", d.pages[0].id, {
      text: "שלום hello English words\nΕλληνικά שלום",
      width: 90,
      fontSize: 16,
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        direction: "auto",
      },
    });
  const result = layoutText(n, (text) => Array.from(text).length * 8);
  const first = result.lines.filter((l) => l.start < 24),
    second = result.lines.filter((l) => l.start >= 24);
  expect(first.length).toBeGreaterThan(1);
  expect(first.every((l) => l.direction === "rtl")).toBe(true);
  expect(second.every((l) => l.direction === undefined)).toBe(true);
  d.nodes = [n];
  const updated = execute(d, {
    type: "update",
    ids: [n.id],
    patch: { text: n.text + " test" },
  }).doc;
  const history = new History();
  history.push(d);
  expect(history.undo(updated).nodes[0].text).toBe(n.text);
  const reloaded = JSON.parse(JSON.stringify(updated));
  validateDocument(reloaded);
  const svg = await svgString(reloaded, d.pages[0].id);
  expect(svg).toContain('direction="rtl" unicode-bidi="isolate"');
  expect(svg).toContain('direction="ltr" unicode-bidi="isolate"');
  expect(svg).not.toContain('unicode-bidi="plaintext"');
});
const bidiTest = process.env.BIDI_TEST_PATH;
const bidiClassTest = process.env.BIDI_CLASS_TEST_PATH;
it.skipIf(!bidiClassTest)(
  "matches decisive auto paragraph cases in Unicode 17 BidiTest",
  () => {
    const chars: Record<string, string> = {
      L: "a",
      R: "א",
      AL: "ا",
      EN: "1",
      AN: "٠",
      ES: "+",
      ET: "$",
      CS: ",",
      NSM: "\u0300",
      BN: "\u00ad",
      B: "\u2029",
      S: "\t",
      WS: " ",
      ON: "!",
      LRE: "\u202a",
      RLE: "\u202b",
      LRO: "\u202d",
      RLO: "\u202e",
      PDF: "\u202c",
      LRI: "\u2066",
      RLI: "\u2067",
      FSI: "\u2068",
      PDI: "\u2069",
    };
    let checked = 0;
    for (const line of readFileSync(bidiClassTest!, "utf8").split("\n")) {
      if (!line.trim() || line.startsWith("#") || line.startsWith("@"))
        continue;
      const [input, bitset] = line.split(";"),
        mask = parseInt(bitset, 16);
      // 3: auto and LTR produce the reference result; 5: auto and RTL.
      // Mask 7 is indistinguishable and cannot independently verify P2/P3.
      if (mask !== 3 && mask !== 5) continue;
      const properties = input.trim().split(/\s+/);
      expect(properties.every((p) => p in chars)).toBe(true);
      expect(
        paragraphDirection(properties.map((p) => chars[p]).join("")),
        line,
      ).toBe(mask === 3 ? "ltr" : "rtl");
      checked++;
    }
    expect(checked).toBe(234099);
  },
  15000,
);
it.skipIf(!bidiTest)(
  "matches Unicode 17 BidiCharacterTest paragraph levels for every supplied test",
  () => {
    let checked = 0;
    for (const line of readFileSync(bidiTest!, "utf8").split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      const [points, direction, level] = line.split(";");
      const text = String.fromCodePoint(
        ...points
          .trim()
          .split(/\s+/)
          .map((n) => parseInt(n, 16)),
      );
      const actual = paragraphDirection(
        text,
        direction.trim() === "0"
          ? "ltr"
          : direction.trim() === "1"
            ? "rtl"
            : "auto",
      );
      expect(actual, line).toBe(level.trim() === "0" ? "ltr" : "rtl");
      checked++;
    }
    expect(checked).toBeGreaterThan(90000);
  },
  15000,
);
if (process.env.BAIZEFIG_BIDI_FIXTURE) {
  const d = emptyDocument();
  d.name = "Bidirectional text verification";
  d.nodes = [
    makeNode("text", d.pages[0].id, {
      name: "Mixed paragraphs",
      text: "Ελληνικά שלום\nשלום hello English words wrap over several lines",
      x: 40,
      y: 40,
      width: 250,
      height: 200,
      fill: "#204d39",
      fontFamily: "Inter",
      fontSize: 24,
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        direction: "auto",
      },
    }),
  ];
  writeFileSync("/private/tmp/baizefig-bidi.baizefig", JSON.stringify(d));
}
