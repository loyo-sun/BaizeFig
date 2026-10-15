import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  reflowAfterPointerEdit,
} from "../src/core";
import {
  setDimensionMode,
  dimensionMode,
  parseTracks,
} from "../src/layoutSizing";
function fixture() {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("frame", p, {
      id: "outer",
      layout: "vertical",
      width: 300,
      height: 200,
      gap: 10,
      importedLayout: {
        padding: [10, 10, 10, 10],
        primary: "hug",
        counter: "fixed",
        justify: "start",
        align: "start",
      },
    }),
    makeNode("frame", p, {
      id: "inner",
      parentId: "outer",
      layout: "horizontal",
      width: 200,
      height: 60,
      gap: 10,
      importedLayout: {
        padding: [5, 5, 5, 5],
        primary: "fixed",
        counter: "hug",
        justify: "start",
        align: "start",
      },
      layoutItem: { horizontalSizing: "fill", verticalSizing: "hug" },
    }),
    makeNode("text", p, {
      id: "text",
      parentId: "inner",
      width: 100,
      height: 20,
      text: "BaizeFig text wraps when the container becomes narrower",
      fontSize: 16,
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
      },
      layoutItem: { horizontalSizing: "fill", verticalSizing: "hug" },
    }),
  ];
  return doc;
}
it("propagates nested Fill widths and text Hug heights, resize and native roundtrip", () => {
  let doc = fixture();
  doc = execute(doc, {
    type: "update",
    ids: ["outer"],
    patch: { width: 300 },
  }).doc;
  const wide = doc.nodes.find((n) => n.id === "outer")!.height;
  expect(doc.nodes.find((n) => n.id === "inner")!.width).toBe(280);
  expect(doc.nodes.find((n) => n.id === "text")!.width).toBe(270);
  doc = execute(doc, {
    type: "update",
    ids: ["outer"],
    patch: { width: 150 },
  }).doc;
  expect(doc.nodes.find((n) => n.id === "text")!.width).toBe(120);
  expect(doc.nodes.find((n) => n.id === "outer")!.height).toBeGreaterThan(wide);
  validateDocument(doc);
  const restored = JSON.parse(JSON.stringify(doc));
  validateDocument(restored);
  expect(restored).toEqual(doc);
});
it("converts a hugged parent to Fixed before enabling Fill and does not drift on subsequent edits", () => {
  let doc = fixture();
  doc.nodes[0].importedLayout!.counter = "hug";
  doc = setDimensionMode(doc, "inner", "width", "fill");
  expect(dimensionMode(doc.nodes[0], "width")).toBe("fixed");
  const width = doc.nodes[0].width;
  for (let i = 0; i < 5; i++)
    doc = execute(doc, {
      type: "update",
      ids: ["text"],
      patch: { gap: 10 + (i % 2) },
    }).doc;
  expect(doc.nodes[0].width).toBe(width);
});
it("honors explicit Fixed against legacy grow and clamps filled siblings", () => {
  let doc = fixture();
  doc.nodes[1].gap = 10;
  doc.nodes.push(
    makeNode("rectangle", doc.pages[0].id, {
      id: "fixed",
      parentId: "inner",
      width: 50,
      height: 20,
      layoutItem: { horizontalSizing: "fixed", grow: 1 },
    }),
  );
  doc.nodes[2].layoutItem!.maxWidth = 180;
  doc = execute(doc, {
    type: "update",
    ids: ["outer"],
    patch: { width: 400 },
  }).doc;
  expect(doc.nodes[3].width).toBe(50);
  expect(doc.nodes[2].width).toBe(180);
});
it("measures spanning intrinsic grid tracks without growing on every relayout", () => {
  let doc = fixture();
  doc.nodes = doc.nodes.slice(0, 1);
  const root = doc.nodes[0];
  root.layout = "grid";
  root.importedLayout!.primary = "hug";
  root.importedLayout!.counter = "hug";
  root.importedLayout!.grid = {
    columns: parseTracks("hug 1fr"),
    rows: [],
    columnGap: 10,
    rowGap: 5,
  };
  doc.nodes.push(
    makeNode("rectangle", root.pageId, {
      id: "span",
      parentId: root.id,
      width: 210,
      height: 40,
      layoutItem: {
        columnSpan: 2,
        horizontalSizing: "fixed",
        verticalSizing: "fixed",
      },
    }),
  );
  doc = execute(doc, {
    type: "update",
    ids: [root.id],
    patch: { importedLayout: root.importedLayout },
  }).doc;
  expect(doc.nodes[0].width).toBe(230);
  expect(doc.nodes[0].height).toBe(60);
  expect(doc.nodes[1].width).toBe(210);
});
it("rejects invalid track syntax, orphan Fill, and preserves locked nodes", () => {
  const doc = fixture();
  expect(() => parseTracks("1fr -3")).toThrow();
  expect(() => parseTracks("0fr")).toThrow();
  expect(() => setDimensionMode(doc, "outer", "width", "fill")).toThrow();
  doc.nodes[0].locked = true;
  expect(setDimensionMode(doc, "text", "width", "fixed")).toBe(doc);
});

it("lays out newly drawn children and fixes dimensions explicitly resized on canvas", () => {
  const original = fixture();
  const updated = structuredClone(original);
  updated.nodes.push(
    makeNode("rectangle", original.pages[0].id, {
      id: "new",
      parentId: "inner",
      width: 30,
      height: 20,
    }),
  );
  const next = reflowAfterPointerEdit(original, updated);
  expect(next.nodes.find((n) => n.id === "new")!.x).toBeGreaterThan(5);
  const resized = structuredClone(next);
  resized.nodes[0].height = 500;
  const result = reflowAfterPointerEdit(next, resized);
  expect(result.nodes[0].height).toBe(500);
  expect(result.nodes[0].layoutItem?.verticalSizing).toBe("fixed");
});
