import { it, expect } from "vitest";
import { emptyDocument, makeNode, absolute } from "../src/core";
import { assetDestination, insertAsset } from "../src/assetPlacement";
import { createComponentInstance } from "../src/components";
function fixture() {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes.push(
    makeNode("component", page, { id: "main", x: -300, width: 50, height: 40 }),
    makeNode("frame", page, {
      id: "frame",
      x: 100,
      y: 100,
      width: 300,
      height: 300,
    }),
  );
  return { doc, page };
}
it("places an instance in a frame preserving canvas position without modifying the source", () => {
  const { doc, page } = fixture();
  const result = insertAsset(doc, "main", page, { x: 160, y: 180 });
  const n = result.doc.nodes.find((n) => n.id === result.id)!;
  expect(n.parentId).toBe("frame");
  expect(absolute(result.doc, n)).toEqual({ x: 160, y: 180 });
  expect(doc.nodes).toHaveLength(2);
});
it("rejects hidden, locked and ordinary instance containers", () => {
  const { doc, page } = fixture();
  doc.nodes[1].locked = true;
  expect(assetDestination(doc, page, { x: 160, y: 180 })).toBeUndefined();
  doc.nodes[1].locked = false;
  doc.nodes[1].visible = false;
  expect(assetDestination(doc, page, { x: 160, y: 180 })).toBeUndefined();
  const instance = createComponentInstance(doc, "main", page, 100, 100);
  expect(
    assetDestination(instance.doc, page, { x: 110, y: 110 }),
  ).toBeUndefined();
});
it("inserts between auto layout children in visual order", () => {
  const { doc, page } = fixture();
  doc.nodes[1].layout = "horizontal";
  doc.nodes.push(
    makeNode("rectangle", page, {
      id: "a",
      parentId: "frame",
      x: 0,
      width: 50,
    }),
    makeNode("rectangle", page, {
      id: "b",
      parentId: "frame",
      x: 100,
      width: 50,
    }),
  );
  const result = insertAsset(doc, "main", page, { x: 180, y: 130 });
  expect(
    result.doc.nodes.filter((n) => n.parentId === "frame").map((n) => n.id),
  ).toEqual(["a", result.id, "b"]);
});
