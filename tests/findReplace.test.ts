import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  History,
  validateDocument,
} from "../src/core";
import { findMatches, replaceMatches } from "../src/findReplace";
function sample() {
  const d = emptyDocument();
  d.pages.push({ id: "second", name: "Second" });
  d.nodes.push(
    makeNode("text", d.pages[0].id, {
      id: "t",
      text: "白泽 白泽",
      name: "白泽标题",
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        runs: [{ start: 0, end: 2, fontWeight: 700 }],
      },
    }),
    makeNode("text", "second", { id: "locked", text: "白泽", locked: true }),
    makeNode("rectangle", "second", { name: "白泽矩形" }),
  );
  return d;
}
it("finds literal text and names in stable page order with Unicode/case and page filters", () => {
  const d = sample();
  const options = {
    query: "白泽",
    field: "both" as const,
    caseSensitive: false,
  };
  expect(findMatches(d, options).map((m) => m.pageId)).toEqual([
    d.pages[0].id,
    d.pages[0].id,
    d.pages[0].id,
    "second",
    "second",
  ]);
  expect(findMatches(d, { ...options, pageId: "second" })).toHaveLength(2);
  expect(findMatches(d, { ...options, query: "" })).toEqual([]);
  d.nodes[0].text = "a.* A.* İ X";
  expect(
    findMatches(d, { ...options, query: "a.*", field: "text" }).map(
      (m) => m.start,
    ),
  ).toEqual([0, 4]);
  expect(
    findMatches(d, {
      ...options,
      query: "a.*",
      field: "text",
      caseSensitive: true,
    }),
  ).toHaveLength(1);
  expect(
    findMatches(d, { ...options, query: "X", field: "text" })[0].start,
  ).toBe(10);
});
it("replaces nonoverlapping matches literally in one undoable transaction, preserves styles and skips locked nodes", () => {
  const d = sample(),
    h = new History();
  const ms = findMatches(d, {
    query: "白泽",
    field: "text",
    caseSensitive: true,
  });
  h.push(d);
  const r = replaceMatches(d, ms, "BaizeFig $&");
  expect(r.count).toBe(2);
  expect(r.skipped).toBe(1);
  expect(r.doc.nodes[0].text).toBe("BaizeFig $& BaizeFig $&");
  expect(r.doc.nodes[1]).toEqual(d.nodes[1]);
  expect(r.doc.nodes[0].textFlow?.runs?.[0].fontWeight).toBe(700);
  expect(h.undo(r.doc)).toEqual(d);
  expect(h.redo(d)).toEqual(r.doc);
  validateDocument(r.doc);
});
it("single replacement and empty replacement leave unrelated fields intact", () => {
  const d = sample(),
    m = findMatches(d, {
      query: "白泽",
      field: "name",
      caseSensitive: true,
    })[0];
  const r = replaceMatches(d, [m], "");
  expect(r.doc.nodes[0].name).toBe("标题");
  expect(r.doc.nodes[0].text).toBe(d.nodes[0].text);
  expect(r.doc.nodes[2]).toEqual(d.nodes[2]);
});

it("keeps distinct styles between replacements and inherited lock protection", () => {
  const d = sample();
  d.nodes[0].text = "a 中 a";
  d.nodes[0].textFlow!.runs = [{ start: 2, end: 3, fontSize: 50 }];
  const r = replaceMatches(
    d,
    findMatches(d, { query: "a", field: "text", caseSensitive: true }),
    "long",
  );
  expect(r.doc.nodes[0].textFlow!.runs).toContainEqual({
    start: 5,
    end: 6,
    fontSize: 50,
  });
});
