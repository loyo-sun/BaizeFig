import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import {
  createIndependentMain,
  createMultipleComponents,
  addComponentVariant,
} from "../src/componentAuthoring";
import {
  createComponentInstance,
  setComponentValue,
  synchronizeInstances,
} from "../src/components";
it("distinguishes linked duplicate from independent main and preserves child names", () => {
  let doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes.push(
    makeNode("component", page, { id: "main", name: "Button" }),
    makeNode("text", page, {
      id: "text",
      parentId: "main",
      name: "Label",
      text: "Hello",
    }),
  );
  const copy = createIndependentMain(doc, "main");
  const main = copy.doc.nodes.find((n) => n.id === copy.selection![0])!;
  expect(main.type).toBe("component");
  expect(copy.doc.nodes.find((n) => n.parentId === main.id)?.name).toBe(
    "Label",
  );
  const changed = execute(copy.doc, {
    type: "update",
    ids: ["text"],
    patch: { text: "Source" },
  }).doc;
  expect(changed.nodes.find((n) => n.parentId === main.id)?.text).toBe("Hello");
  expect(
    execute(doc, { type: "duplicate", ids: ["main"] }).doc.nodes.filter(
      (n) => n.type === "instance",
    ),
  ).toHaveLength(1);
});
it("creates separate components and variants with a stable default; persists identity", () => {
  let doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes.push(
    makeNode("rectangle", page, { id: "a" }),
    makeNode("text", page, { id: "b", x: 400, text: "Hello" }),
  );
  const multiple = createMultipleComponents(doc, ["a", "b"]);
  expect(multiple.selection).toHaveLength(2);
  const variant = addComponentVariant(multiple.doc, multiple.selection[0]);
  const set = variant.doc.componentSets![0];
  expect(set.variants).toHaveLength(2);
  expect(set.defaultComponentId).toBe(multiple.selection[0]);
  validateDocument(JSON.parse(JSON.stringify(variant.doc)));
  const instance = createComponentInstance(
    variant.doc,
    set.defaultComponentId!,
    page,
    0,
    500,
  );
  expect(
    instance.doc.nodes.find((n) => n.id === instance.id)?.componentId,
  ).toBe(set.defaultComponentId);
});
it("keeps nested property edits isolated and saved through source synchronization", () => {
  let doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes.push(
    makeNode("component", page, {
      id: "button",
      componentProperties: [
        {
          id: "label",
          name: "Label",
          type: "text",
          targetPath: "/text#0",
          defaultValue: "Default",
        },
      ],
    }),
    makeNode("text", page, { id: "text", parentId: "button", text: "Default" }),
    makeNode("component", page, { id: "card", x: 500 }),
  );
  const nested = createComponentInstance(doc, "button", page, 0, 0);
  doc = execute(nested.doc, {
    type: "reparent",
    ids: [nested.id],
    parentId: "card",
  }).doc;
  const a = createComponentInstance(doc, "card", page, 700, 0),
    b = createComponentInstance(a.doc, "card", page, 900, 0);
  const child = b.doc.nodes.find(
    (n) => n.type === "instance" && n.componentOwner === a.id && n.id !== a.id,
  )!;
  const edited = setComponentValue(b.doc, child.id, "label", "Custom");
  expect(
    edited.nodes
      .filter((n) => n.componentOwner === a.id && n.type === "text")
      .map((n) => n.text),
  ).toEqual(["Custom"]);
  expect(
    edited.nodes
      .filter((n) => n.componentOwner === b.id && n.type === "text")
      .map((n) => n.text),
  ).toEqual(["Default"]);
  const saved = JSON.parse(JSON.stringify(edited));
  synchronizeInstances(saved);
  validateDocument(saved);
  expect(
    saved.nodes.find((n: any) => n.componentOwner === a.id && n.type === "text")
      .text,
  ).toBe("Custom");
});
it("duplicates a variant inside its set as a new main variant instead of an instance", () => {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes.push(makeNode("component", page, { id: "a" }));
  const added = addComponentVariant(doc, "a");
  const copied = execute(added.doc, {
    type: "duplicate",
    ids: [added.selection![0]],
  });
  expect(
    copied.doc.nodes.find((n) => n.id === copied.selection![0])?.type,
  ).toBe("component");
  expect(copied.doc.componentSets![0].variants).toHaveLength(3);
  validateDocument(copied.doc);
});
