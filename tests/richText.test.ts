import { expect, it } from "vitest";
import { styleTextRange, safeTextLink } from "../src/richText";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { svgString } from "../src/Canvas";
it("patches only selected graphemes and keeps mixed styles outside the range", () => {
  const text = "白泽👨‍👩‍👦 hello";
  const runs = styleTextRange(
    text,
    [{ start: 0, end: 2, fill: "#ff0000" }],
    3,
    4,
    { fontWeight: 700, underline: true },
  );
  expect(runs[0]).toEqual({ start: 0, end: 2, fill: "#ff0000" });
  expect(runs[1].start).toBe(2);
  expect(runs[1].end).toBe(10);
  expect(runs[1].underline).toBe(true);
  expect(styleTextRange(text, runs, 0, 0, { italic: true })).toEqual(runs);
});
it("saves and exports formatted text and safe links with undo and range remapping", async () => {
  const d = emptyDocument();
  const n = makeNode("text", d.pages[0].id, { text: "白泽 hello" });
  d.nodes.push(n);
  const runs = styleTextRange(n.text, [], 0, 2, {
    fontWeight: 700,
    underline: true,
    strikethrough: true,
    href: safeTextLink("https://example.com"),
  });
  const h = new History();
  h.push(d);
  const changed = execute(d, {
    type: "update",
    ids: [n.id],
    patch: { textFlow: { ...n.textFlow!, runs } },
  }).doc;
  validateDocument(JSON.parse(JSON.stringify(changed)));
  const svg = await svgString(changed, d.pages[0].id);
  expect(svg).toContain('font-weight="700"');
  expect(svg).toContain('text-decoration="underline line-through"');
  expect(svg).toContain('href="https://example.com/"');
  const edited = execute(changed, {
    type: "update",
    ids: [n.id],
    patch: { text: "白泽! hello" },
  }).doc;
  expect(edited.nodes[0].textFlow?.runs?.[0].underline).toBe(true);
  expect(h.undo(changed)).toEqual(d);
  expect(h.redo(d)).toEqual(changed);
});
it("rejects executable links at both editing and native document boundaries", () => {
  expect(() => safeTextLink("javascript:alert(1)")).toThrow();
  expect(() => safeTextLink("data:text/html,a")).toThrow();
  expect(safeTextLink("")).toBeUndefined();
  expect(safeTextLink("mailto:test@example.com")).toBe(
    "mailto:test@example.com",
  );
  const d = emptyDocument();
  d.nodes.push(
    makeNode("text", d.pages[0].id, {
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        runs: [{ start: 0, end: 2, href: "javascript:alert(1)" }],
      },
    }),
  );
  expect(() => validateDocument(d)).toThrow();
});
