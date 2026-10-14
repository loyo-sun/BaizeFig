import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import { layoutContainer, applyConstraints } from "../src/layout";
const frame = () =>
  makeNode("frame", "page", {
    id: "frame",
    width: 200,
    height: 100,
    layout: "horizontal",
    gap: 10,
    importedLayout: {
      padding: [10, 10, 10, 10],
      primary: "fixed",
      counter: "hug",
      justify: "start",
      align: "start",
    },
  });
const child = (id: string, width = 60, height = 20) =>
  makeNode("rectangle", "page", { id, parentId: "frame", width, height });
it("wraps rows with separate row gaps, ignores absolute items and hugs content", () => {
  const n = frame();
  n.importedLayout!.wrap = true;
  n.importedLayout!.counterGap = 5;
  const a = child("a"),
    b = child("b"),
    c = child("c"),
    overlay = child("overlay");
  overlay.x = 500;
  overlay.layoutItem = { absolute: true };
  layoutContainer(n, [a, b, c, overlay]);
  expect([a.x, a.y, b.x, b.y, c.x, c.y]).toEqual([10, 10, 80, 10, 10, 35]);
  expect(n.height).toBe(65);
  expect(overlay.x).toBe(500);
});
it("redistributes Fill space after applying min/max sizes", () => {
  const n = frame();
  n.width = 320;
  const a = child("a"),
    b = child("b");
  a.layoutItem = { grow: 1, maxWidth: 50 };
  b.layoutItem = { grow: 1 };
  layoutContainer(n, [a, b]);
  expect(a.width).toBe(50);
  expect(b.width).toBe(240);
  expect(b.x).toBe(70);
  a.layoutItem = { grow: 1, minWidth: 200 };
  layoutContainer(n, [a, b]);
  expect(a.width).toBe(200);
  expect(b.width).toBe(90);
});
it("places spanning grid cells without overlapping implicit items", () => {
  const n = frame();
  n.layout = "grid";
  n.width = 230;
  n.importedLayout!.grid = {
    columns: [
      { kind: "fixed", value: 50 },
      { kind: "fr", value: 1 },
      { kind: "fr", value: 1 },
    ],
    rows: [
      { kind: "fixed", value: 30 },
      { kind: "fixed", value: 40 },
    ],
    columnGap: 5,
    rowGap: 10,
  };
  const a = child("a"),
    b = child("b"),
    c = child("c");
  a.layoutItem = { columnSpan: 2 };
  layoutContainer(n, [a, b, c]);
  expect(a.x).toBe(10);
  expect(a.width).toBe(130);
  expect(b.x).toBe(145);
  expect(c.y).toBe(50);
  expect(n.height).toBe(100);
});
it("applies nested left/right/center/stretch/scale constraints once per resize", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  const root = makeNode("frame", p, { id: "parent", width: 100, height: 100 });
  const a = makeNode("frame", p, {
    id: "inner",
    parentId: "parent",
    x: 10,
    y: 10,
    width: 50,
    height: 50,
    constraints: { horizontal: "stretch", vertical: "max" },
  });
  const b = makeNode("rectangle", p, {
    id: "nested",
    parentId: "inner",
    x: 10,
    width: 10,
    constraints: { horizontal: "scale", vertical: "min" },
  });
  d.nodes = [root, a, b];
  const changed = structuredClone(d);
  changed.nodes[0].width = 200;
  changed.nodes[0].height = 150;
  applyConstraints(d, changed);
  expect(changed.nodes[1]).toMatchObject({ width: 150, y: 60 });
  expect(changed.nodes[2]).toMatchObject({ x: 30, width: 30 });
  validateDocument(changed);
});
it("rejects fractional spans and unbounded grid allocation before rendering", () => {
  const d = emptyDocument(),
    n = makeNode("rectangle", d.pages[0].id);
  n.layoutItem = { row: 1e8, columnSpan: 1.5 };
  d.nodes = [n];
  expect(() => validateDocument(d)).toThrow("Invalid imported layout");
});
