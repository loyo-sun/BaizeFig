import { expect, it } from "vitest";
import { emptyDocument, makeNode } from "../src/core";
import { canvasTarget, marqueeTargets } from "../src/canvasSelection";
it("marquee selects intersecting frame children and groups without selecting the enclosing frame", () => {
  const doc = emptyDocument(), page = doc.pages[0].id;
  doc.nodes = [
    makeNode("frame", page, { id: "frame", x: 100, y: 100, width: 500, height: 500 }),
    makeNode("rectangle", page, { id: "leaf", parentId: "frame", x: 20, y: 20, width: 40, height: 40 }),
    makeNode("group", page, { id: "group", parentId: "frame", x: 80, y: 20, width: 50, height: 50 }),
    makeNode("rectangle", page, { id: "nested", parentId: "group", x: 0, y: 0, width: 50, height: 50 }),
    makeNode("rectangle", page, { id: "locked", parentId: "frame", x: 20, y: 20, locked: true }),
  ];
  expect(marqueeTargets(doc, page, { x: 130, y: 130, width: 65, height: 10 }, null)).toEqual(["leaf", "group"]);
  expect(marqueeTargets(doc, page, { x: 180, y: 120, width: 10, height: 10 }, "group")).toEqual(["nested"]);
  expect(marqueeTargets(doc, page, { x: 0, y: 0, width: 700, height: 700 }, null)).toEqual(["frame"]);
  doc.nodes[0].visible = false;
  expect(marqueeTargets(doc, page, { x: 0, y: 0, width: 700, height: 700 }, null)).toEqual([]);
});
it("previews the outer group until double-click enters each group, with explicit deep selection", () => {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes = [
    makeNode("frame", page, { id: "frame" }),
    makeNode("group", page, { id: "outer", parentId: "frame" }),
    makeNode("group", page, { id: "inner", parentId: "outer" }),
    makeNode("rectangle", page, { id: "leaf", parentId: "inner" }),
  ];
  expect(canvasTarget(doc, "leaf", null)?.id).toBe("outer");
  expect(canvasTarget(doc, "leaf", "outer")?.id).toBe("inner");
  expect(canvasTarget(doc, "leaf", "inner")?.id).toBe("leaf");
  expect(canvasTarget(doc, "leaf", null, true)?.id).toBe("leaf");
  expect(canvasTarget(doc, undefined, null)).toBeUndefined();
  doc.nodes[1].locked = true;
  expect(canvasTarget(doc, "leaf", null, true)).toBeUndefined();
  doc.nodes[1].locked = false;
  doc.nodes[1].visible = false;
  expect(canvasTarget(doc, "leaf", "inner")).toBeUndefined();
});
