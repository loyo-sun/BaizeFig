import { expect, it } from "vitest";
import { changeTextCase, changeDocumentTextCase } from "../src/textCase";
import { emptyDocument, makeNode, validateDocument } from "../src/core";
it("changes only selected text, expands Unicode case without losing range styles or paragraph offsets", () => {
  const r = changeTextCase(
    "ß\n白泽 hello",
    [
      { start: 0, end: 1, fontWeight: 700 },
      { start: 5, end: 10, fill: "#ff0000" },
    ],
    0,
    1,
    "upper",
  );
  expect(r.text).toBe("SS\n白泽 hello");
  expect(r.runs[0]).toMatchObject({ start: 0, end: 2, fontWeight: 700 });
  expect(r.offsets.get(2)).toBe(3);
  expect(r.runs[1].start).toBe(6);
  expect(changeTextCase("istanbul", [], 0, 8, "upper", "tr").text).toBe(
    "İSTANBUL",
  );
});
it("keeps per-paragraph list types when transforming the entire node and honors locks", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("text", p, {
      text: "ß\nhello",
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        paragraphs: [
          { start: 0, list: "bullet", level: 0 },
          { start: 2, list: "number", level: 1 },
        ],
      },
    }),
    makeNode("text", p, { text: "locked", locked: true }),
  );
  const changed = changeDocumentTextCase(
    d,
    d.nodes.map((n) => n.id),
    "upper",
  );
  expect(changed.nodes[0].textFlow?.paragraphs?.[1]).toEqual({
    start: 3,
    list: "number",
    level: 1,
  });
  expect(changed.nodes[1].text).toBe("locked");
  validateDocument(changed);
});
