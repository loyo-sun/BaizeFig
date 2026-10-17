import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import {
  createComponentInstance,
  restoreMainComponent,
} from "../src/components";
it("restores a deleted editable imported main through its source alias and retains linkage after save", () => {
  let doc = emptyDocument(),
    page = doc.pages[0].id;
  const main = makeNode("component", page, {
    id: "local-main",
    fidelity: { size: [100, 100], sourceId: "fig-source" },
  });
  doc.nodes.push(main);
  doc.componentLibrary = [
    {
      sourceId: "fig-source",
      name: "Imported",
      nodes: [structuredClone(main)],
    },
  ];
  doc = createComponentInstance(doc, "fig-source", page, 200, 0).doc;
  const instance = doc.nodes.find((n) => n.type === "instance")!;
  const deleted = execute(doc, { type: "delete", ids: [main.id] }).doc;
  expect(
    deleted.componentLibrary?.find((c) => c.sourceId === "fig-source")?.deleted,
  ).toBe(true);
  const restored = restoreMainComponent(
    JSON.parse(JSON.stringify(deleted)),
    "fig-source",
  );
  expect(restored.id).toBe("local-main");
  expect(
    restored.doc.nodes.find((n) => n.id === instance.id)?.componentId,
  ).toBe("fig-source");
  const updated = execute(restored.doc, {
    type: "update",
    ids: [restored.id],
    patch: { fill: "#ff0000" },
  }).doc;
  expect(updated.nodes.find((n) => n.id === instance.id)?.fill).toBe("#ff0000");
  validateDocument(updated);
});
