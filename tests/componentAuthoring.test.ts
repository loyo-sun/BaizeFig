import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  worldTransform,
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
  setComponentSet,
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
it("persists authoring metadata through the same update command used by the inspector", () => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes.push(makeNode("component", p, { id: "main" }));
  const changed = execute(doc, {
    type: "update",
    ids: ["main"],
    patch: {
      componentDescription: "Usage",
      componentDocumentation: "https://example.com",
      exposedNestedInstances: [],
    },
  }).doc;
  expect(changed.nodes[0]).toMatchObject({
    componentDescription: "Usage",
    componentDocumentation: "https://example.com",
    exposedNestedInstances: [],
  });
});
it("rejects geometry edits inside an ordinary instance without rejecting text content", () => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes.push(
    makeNode("component", p, { id: "main" }),
    makeNode("text", p, { id: "label", parentId: "main", text: "Hello" }),
  );
  const a = createComponentInstance(doc, "main", p, 0, 0);
  const child = a.doc.nodes.find(
    (n) => n.componentOwner === a.id && n.type === "text",
  )!;
  expect(() =>
    execute(a.doc, { type: "update", ids: [child.id], patch: { x: 20 } }),
  ).toThrow("Edit the main component");
  expect(
    execute(a.doc, {
      type: "update",
      ids: [child.id],
      patch: { text: "Changed" },
    }).doc.nodes.find((n) => n.id === child.id)?.text,
  ).toBe("Changed");
});
it("keeps copied sets independent and removes variants without changing their world position", () => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes.push(makeNode("component", p, { id: "main", x: 200, y: 100 }));
  const added = addComponentVariant(doc, "main");
  const frame = added.doc.nodes.find((n) => n.componentSetId)!;
  const copy = execute(added.doc, { type: "duplicate", ids: [frame.id] });
  expect(copy.doc.componentSets).toHaveLength(2);
  const copiedSet = copy.doc.componentSets![1];
  for (const [index, variant] of copiedSet.variants.entries()) {
    expect(copy.doc.nodes.find((n) => n.id === variant.componentId)?.name).toBe(
      added.doc.nodes.find(
        (n) => n.id === added.doc.componentSets![0].variants[index].componentId,
      )?.name,
    );
  }
  expect(copiedSet.id).not.toBe(added.doc.componentSets![0].id);
  expect(
    copiedSet.variants.every(
      (v) =>
        !added.doc.componentSets![0].variants.some(
          (o) => o.componentId === v.componentId,
        ),
    ),
  ).toBe(true);
  expect(
    copy.doc.nodes.find((n) => n.id === copy.selection![0])?.componentSetId,
  ).toBe(copiedSet.id);
  const independent = createIndependentMain(added.doc, "main");
  expect(
    independent.doc.nodes.find((n) => n.id === independent.selection![0])
      ?.parentId,
  ).toBe(null);
  const before = worldTransform(
    added.doc,
    added.doc.nodes.find((n) => n.id === added.selection![0])!,
  );
  const set = added.doc.componentSets![0];
  const removed = setComponentSet(added.doc, {
    ...set,
    variants: set.variants.filter((v) => v.componentId !== added.selection![0]),
  });
  const removedMain = removed.nodes.find((n) => n.id === added.selection![0])!;
  expect(removedMain.parentId).toBe(null);
  expect(worldTransform(removed, removedMain)).toEqual(before);
  validateDocument(copy.doc);
  validateDocument(independent.doc);
});
