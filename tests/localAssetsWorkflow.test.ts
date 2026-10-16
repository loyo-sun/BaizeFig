import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  History,
  validateDocument,
} from "../src/core";
import {
  createComponentInstance,
  resetComponentInstance,
  detachComponentInstance,
} from "../src/components";

it("places a cross-page local asset, undoes/redoes it, and preserves links through copy and save", () => {
  let doc = emptyDocument();
  const sourcePage = doc.pages[0].id;
  doc.pages.push({ ...doc.pages[0], id: "target-page", name: "Target" });
  doc.nodes.push(
    makeNode("component", sourcePage, { id: "main", x: 500, y: 300 }),
    makeNode("text", sourcePage, {
      id: "label",
      parentId: "main",
      text: "Original",
    }),
  );
  const history = new History();
  history.push(doc);
  const created = createComponentInstance(doc, "main", "target-page", 123, 456);
  expect(created.doc.nodes.find((n) => n.id === created.id)).toMatchObject({
    type: "instance",
    pageId: "target-page",
    parentId: null,
    x: 123,
    y: 456,
    componentId: "main",
  });
  const undone = history.undo(created.doc);
  expect(undone.nodes).toHaveLength(2);
  doc = history.redo(undone);
  validateDocument(doc);
  const copied = execute(doc, { type: "duplicate", ids: [created.id] });
  doc = JSON.parse(JSON.stringify(copied.doc));
  doc = execute(doc, {
    type: "update",
    ids: ["label"],
    patch: { text: "Linked" },
  }).doc;
  expect(
    doc.nodes
      .filter((n) => n.type === "text" && n.componentOwner)
      .map((n) => n.text),
  ).toEqual(["Linked", "Linked"]);
  const child = doc.nodes.find(
    (n) => n.type === "text" && n.componentOwner === created.id,
  )!;
  doc = execute(doc, {
    type: "update",
    ids: [child.id],
    patch: { text: "Override" },
  }).doc;
  expect(doc.nodes.find((n) => n.id === "label")?.text).toBe("Linked");
  doc = resetComponentInstance(doc, created.id);
  expect(doc.nodes.find((n) => n.id === child.id)?.text).toBe("Linked");
  doc = detachComponentInstance(doc, created.id);
  doc = execute(doc, {
    type: "update",
    ids: ["label"],
    patch: { text: "Changed again" },
  }).doc;
  expect(doc.nodes.find((n) => n.id === child.id)?.text).toBe("Linked");
  validateDocument(doc);
});
