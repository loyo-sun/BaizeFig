import { it, expect } from "vitest";
import {
  paragraphAt,
  paragraphStarts,
  setParagraphList,
  remapParagraphs,
  listMarkers,
} from "../src/textParagraphs";
import { TextDraftHistory, type TextDraft } from "../src/textDraft";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { layoutText } from "../src/textLayout";
import { svgString } from "../src/Canvas";
it("stores semantic paragraph lists without inserting marker characters and continues/restarts numbering across nesting", () => {
  const text = "白泽\nBaizeFig\n第三项\n标题\n最后";
  let ps = setParagraphList(text, [], 0, 12, "number");
  expect(ps).toEqual(
    [
      { start: 0, list: "number", level: 0 },
      { start: 3, list: "number", level: 0 },
      { start: 12, list: "number", level: 0 },
    ].slice(0, 2),
  );
  ps = setParagraphList(text, [], 0, text.indexOf("标题"), "number");
  expect([...listMarkers(text, ps).values()]).toEqual(["1.", "2.", "3."]);
  expect(setParagraphList(text, ps, 0, text.indexOf("标题"), "number")).toEqual(
    [],
  );
  expect(paragraphAt("\nA", 0)).toBe(0);
  expect(paragraphStarts("\nA")).toEqual([0, 1]);
});
it("inherits list semantics on Enter, retains surviving paragraphs after deletion, and rejects invalid offsets", () => {
  const before = "甲\n乙";
  const p = setParagraphList(before, [], 0, before.length, "bullet");
  expect(remapParagraphs(before, "甲\n新\n乙", p)).toEqual([
    { start: 0, list: "bullet", level: 0 },
    { start: 2, list: "bullet", level: 0 },
    { start: 4, list: "bullet", level: 0 },
  ]);
  expect(remapParagraphs(before, "甲乙", p)).toEqual([
    { start: 0, list: "bullet", level: 0 },
  ]);
  const d = emptyDocument();
  d.nodes.push(
    makeNode("text", d.pages[0].id, {
      text: before,
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        paragraphs: [{ start: 1, list: "number", level: 0 }],
      },
    }),
  );
  expect(() => validateDocument(d)).toThrow();
});
it("wraps list continuations under the content, renders markers only on first lines, saves and undoes paragraph changes", async () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("text", p, {
      text: "甲乙丙丁戊\nSecond",
      width: 50,
      fontSize: 10,
      lineHeight: 1,
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        paragraphs: [
          { start: 0, list: "number", level: 0 },
          { start: 6, list: "number", level: 0 },
        ],
      },
    }),
  );
  const n = d.nodes[0],
    r = layoutText(n, (text) => text.length * 10);
  expect(r.lines[0].marker).toBe("1.");
  expect(r.lines[1].marker).toBeUndefined();
  expect(r.lines[1].x).toBe(15);
  const h = new History();
  h.push(d);
  const changed = execute(d, {
    type: "update",
    ids: [n.id],
    patch: { text: "甲乙丙丁戊\nNew\nSecond" },
  }).doc;
  validateDocument(JSON.parse(JSON.stringify(changed)));
  const svg = await svgString(changed, p);
  expect(svg).toContain("3.");
  expect(h.undo(changed)).toEqual(d);
});
it("keeps rich formatting and semantic paragraphs through edit-local undo/redo", () => {
  const h = new TextDraftHistory(),
    a: TextDraft = {
      text: "白泽",
      runs: [{ start: 0, end: 2, fontWeight: 700 }],
      paragraphs: [{ start: 0, list: "bullet", level: 1 }],
      start: 0,
      end: 2,
    },
    b = { ...a, text: "白泽!" };
  h.push(a);
  expect(h.undo(b)).toEqual(a);
  expect(h.redo(a)).toEqual(b);
  h.push(a);
  expect(h.future).toEqual([]);
});
