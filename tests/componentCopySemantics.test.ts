import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import { pasteNodes } from "../src/clipboard";
it("duplicates and pastes a local main as a linked instance while retaining its children", () => {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes.push(
    makeNode("component", page, { id: "main", x: 10, y: 20 }),
    makeNode("text", page, { id: "label", parentId: "main", text: "Hello" }),
  );
  for (const result of [
    execute(doc, { type: "duplicate", ids: ["main"] }),
    pasteNodes(doc, page, { documentId: doc.id, nodes: doc.nodes }, []),
  ]) {
    const instance = result.doc.nodes.find(
      (n) => n.id === result.selection[0],
    )!;
    expect(instance).toMatchObject({ type: "instance", componentId: "main" });
    expect(result.doc.nodes.filter((n) => n.type === "component")).toHaveLength(
      1,
    );
    const updated = execute(result.doc, {
      type: "update",
      ids: ["label"],
      patch: { text: "Linked" },
    }).doc;
    expect(
      updated.nodes.find(
        (n) => n.componentOwner === instance.id && n.type === "text",
      )?.text,
    ).toBe("Linked");
    const again = execute(updated, { type: "duplicate", ids: [instance.id] });
    expect(
      again.doc.nodes.find((n) => n.id === again.selection[0])?.componentId,
    ).toBe("main");
    validateDocument(again.doc);
  }
});
it("does not invent a native source link when pasting a main from another file", () => {
  const source = emptyDocument(),
    target = emptyDocument();
  const main = makeNode("component", source.pages[0].id, { id: "main" });
  const result = pasteNodes(
    target,
    target.pages[0].id,
    { documentId: source.id, nodes: [main] },
    [],
  );
  expect(result.doc.nodes.find((n) => n.id === result.selection[0])?.type).toBe(
    "component",
  );
});
