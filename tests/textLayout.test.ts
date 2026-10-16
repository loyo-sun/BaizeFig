import { expect, it } from "vitest";
import { makeNode, emptyDocument, execute } from "../src/core";
import { layoutText, reflowText, type TextMeasure } from "../src/textLayout";
const measure: TextMeasure = (text, font) =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
  ).length * font.size;
const node = (text: string, width = 40) =>
  makeNode("text", "page", {
    text,
    width,
    fontSize: 10,
    lineHeight: 1,
    textFlow: { autoResize: "height", verticalAlign: "top", letterSpacing: 0 },
  });
it("keeps rich style ranges on surviving text and applies whole-layer typography edits", () => {
  const d = emptyDocument(),
    n = node("Hello world", 200);
  n.pageId = d.pages[0].id;
  n.textFlow!.runs = [
    { start: 0, end: 5, fontWeight: 700 },
    { start: 6, end: 11, fill: "#ff0000", fontSize: 20 },
  ];
  d.nodes = [n];
  const changed = execute(d, {
    type: "update",
    ids: [n.id],
    patch: { text: "Hello brave world" },
  }).doc.nodes[0];
  expect(changed.textFlow?.runs).toContainEqual({
    start: 12,
    end: 17,
    fill: "#ff0000",
    fontSize: 20,
  });
  const resized = execute(
    { ...d, nodes: [changed] },
    { type: "update", ids: [n.id], patch: { fontSize: 24, fill: "#00ff00" } },
  ).doc.nodes[0];
  expect(
    resized.textFlow?.runs?.every(
      (r) => r.fontSize === undefined && r.fill === undefined,
    ),
  ).toBe(true);
  expect(resized.fontSize).toBe(24);
});
it("wraps long words after a word break without losing or duplicating characters", () => {
  const n = node("a bcdefghijkl");
  const result = layoutText(n, measure);
  expect(result.lines.map((l) => n.text.slice(l.start, l.end)).join("")).toBe(
    n.text,
  );
  for (const line of result.lines)
    expect(
      measure(n.text.slice(line.start, line.end), {
        family: "test",
        size: 10,
        weight: 400,
      }),
    ).toBeLessThanOrEqual(40);
});
it("keeps grapheme clusters intact and retains explicit empty lines", () => {
  const n = node("👨‍👩‍👧‍👦白泽\n\nEnd", 20),
    r = layoutText(n, measure);
  expect(n.text.slice(r.lines[0].start, r.lines[0].end)).toBe("👨‍👩‍👧‍👦白");
  expect(r.lines.some((l) => l.start === l.end)).toBe(true);
  expect(r.lines.flatMap((l) => [l.start, l.end])).not.toContain(1);
});
it("measures shaped strings together and honors rich text, tracking, alignment and autosizing", () => {
  const calls: string[] = [],
    n = node("AV");
  n.textFlow!.autoResize = "both";
  n.textFlow!.letterSpacing = 2;
  reflowText(n, (text) => {
    calls.push(text);
    return text === "AV" ? 15 : text.length * 10;
  });
  expect(n.width).toBe(17);
  expect(calls).toContain("AV");
  expect(n.fidelity?.text?.characters).toBe("AV");
  const rich = node("ab", 100);
  rich.textFlow = {
    autoResize: "fixed",
    verticalAlign: "bottom",
    letterSpacing: 0,
    runs: [{ start: 1, end: 2, fontSize: 20 }],
  };
  rich.height = 100;
  rich.textAlign = "right";
  const r = layoutText(rich, measure);
  expect(r.lines[0]).toMatchObject({ x: 70, y: 100 });
  expect(r.height).toBe(100);
});

it("truncates fixed-height overflow without removing editable text or splitting graphemes", () => {
  const n = node("A👩‍💻BCDEF", 40);
  n.height = 10;
  n.textFlow = { ...n.textFlow!, autoResize: "fixed", truncation: "ending" };
  const result = layoutText(n, measure);
  expect(result.lines).toHaveLength(1);
  expect(result.lines[0].ellipsis).toBe(true);
  expect(n.text.slice(0, result.lines[0].end)).toBe("A👩‍💻");
  expect(n.text).toBe("A👩‍💻BCDEF");
  n.height = 30;
  expect(layoutText(n, measure).lines.every((l) => !l.ellipsis)).toBe(true);
});
it("retains truncated mixed-style RTL text through native reload and SVG rendering", async () => {
  const { validateDocument } = await import("../src/core");
  const { svgString } = await import("../src/Canvas");
  const d = emptyDocument(),
    n = node("אבגדהוזחט", 40);
  n.pageId = d.pages[0].id;
  n.height = 10;
  n.textFlow = {
    ...n.textFlow!,
    autoResize: "fixed",
    truncation: "ending",
    direction: "rtl",
    runs: [{ start: 0, end: 9, fill: "#ff0000" }],
  };
  const result = layoutText(n, measure);
  expect(result.lines[0]).toMatchObject({
    direction: "rtl",
    ellipsis: true,
    end: 3,
  });
  expect(result.lines[0].x).toBe(40);
  reflowText(n, measure);
  d.nodes = [n];
  const restored = JSON.parse(JSON.stringify(d));
  validateDocument(restored);
  expect(restored.nodes[0].text).toBe(n.text);
  const svg = await svgString(restored, n.pageId);
  expect(svg).toContain("…");
  expect(svg).toContain('direction="rtl"');
  expect(svg).toContain("#ff0000");
});
