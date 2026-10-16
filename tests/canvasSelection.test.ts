import { expect, it } from "vitest";
import { emptyDocument, makeNode } from "../src/core";
import { canvasTarget } from "../src/canvasSelection";
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
