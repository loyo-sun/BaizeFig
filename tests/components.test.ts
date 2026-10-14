import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import {
  createComponentInstance,
  resetComponentInstance,
  detachComponentInstance,
  linkImportedComponents,
  synchronizeInstances,
  editLibraryComponent,
  swapComponentInstance,
} from "../src/components";
it("opens the correct native main and swaps an instance without moving it", () => {
  const d = setup();
  d.nodes.push(
    makeNode("component", d.pages[0].id, { id: "other", name: "Other" }),
  );
  expect(editLibraryComponent(d, "other").id).toBe("other");
  const a = createComponentInstance(d, "main", d.pages[0].id, 300, 200);
  const swapped = swapComponentInstance(a.doc, a.id, "other");
  expect(swapped.nodes.find((n) => n.id === a.id)).toMatchObject({
    componentId: "other",
    x: 300,
    y: 200,
  });
  expect(swapped.nodes.filter((n) => n.componentOwner === a.id)).toHaveLength(
    1,
  );
  validateDocument(swapped);
});
it("keeps manual fill overrides detached from source variables and paint stacks after save/reload", () => {
  const d = setup();
  d.variables = [{ id: "color", name: "Color", value: "#00ff00" }];
  const label = d.nodes[1];
  label.variableId = "color";
  label.fidelity = {
    size: [100, 20],
    paints: [{ type: "solid", color: "#00ff00", opacity: 1 }],
  };
  const a = createComponentInstance(d, "main", d.pages[0].id, 0, 0),
    copy = a.doc.nodes.find(
      (n) => n.componentOwner === a.id && n.type === "text",
    )!;
  const changed = execute(a.doc, {
    type: "update",
    ids: [copy.id],
    patch: { fill: "#ff0000" },
  }).doc;
  const restored = JSON.parse(JSON.stringify(changed));
  const again = execute(restored, {
    type: "update",
    ids: ["label"],
    patch: { fill: "#0000ff" },
  }).doc;
  expect(again.nodes.find((n) => n.id === copy.id)).toMatchObject({
    fill: "#ff0000",
  });
  expect(again.nodes.find((n) => n.id === copy.id)?.variableId).toBeUndefined();
  expect(
    again.nodes.find((n) => n.id === copy.id)?.fidelity?.paints,
  ).toBeUndefined();
  const reset = resetComponentInstance(again, a.id);
  expect(reset.nodes.find((n) => n.id === copy.id)?.fill).toBe("#0000ff");
  validateDocument(reset);
});
function setup() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("component", p, { id: "main", name: "Button" }),
    makeNode("text", p, { id: "label", parentId: "main", text: "Default" }),
  ];
  return d;
}
it("never silently discards structural edits inside a live instance", () => {
  const d = setup(),
    a = createComponentInstance(d, "main", d.pages[0].id, 0, 0),
    label = a.doc.nodes.find(
      (n) => n.componentOwner === a.id && n.type === "text",
    )!;
  expect(() => execute(a.doc, { type: "delete", ids: [label.id] })).toThrow(
    "Detach instance",
  );
  expect(() =>
    execute(a.doc, {
      type: "create",
      nodes: [makeNode("rectangle", d.pages[0].id, { parentId: a.id })],
    }),
  ).toThrow("Detach instance");
  const detached = detachComponentInstance(a.doc, a.id);
  expect(
    execute(detached, { type: "delete", ids: [label.id] }).doc.nodes.some(
      (n) => n.id === label.id,
    ),
  ).toBe(false);
});
it("synchronizes main edits while retaining instance overrides and supports reset/detach", () => {
  const source = setup(),
    a = createComponentInstance(source, "main", source.pages[0].id, 400, 100),
    b = createComponentInstance(a.doc, "main", source.pages[0].id, 600, 100);
  const label = b.doc.nodes.find(
    (n) => n.componentOwner === a.id && n.type === "text",
  )!;
  const overridden = execute(b.doc, {
    type: "update",
    ids: [label.id],
    patch: { text: "Custom" },
  }).doc;
  const edited = execute(overridden, {
    type: "update",
    ids: ["label"],
    patch: { text: "Updated", fill: "#ff0000" },
  }).doc;
  expect(edited.nodes.find((n) => n.id === label.id)?.text).toBe("Custom");
  expect(edited.nodes.find((n) => n.id === label.id)?.fill).toBe("#ff0000");
  expect(
    edited.nodes.find((n) => n.componentOwner === b.id && n.type === "text")
      ?.text,
  ).toBe("Updated");
  expect(edited.nodes.find((n) => n.id === a.id)?.x).toBe(400);
  const reset = resetComponentInstance(edited, a.id);
  expect(reset.nodes.find((n) => n.id === label.id)?.text).toBe("Updated");
  const detached = detachComponentInstance(reset, a.id),
    changed = execute(detached, {
      type: "update",
      ids: ["label"],
      patch: { text: "Later" },
    }).doc;
  expect(changed.nodes.find((n) => n.id === label.id)?.text).toBe("Updated");
  expect(changed.nodes.find((n) => n.id === a.id)?.type).toBe("group");
  validateDocument(JSON.parse(JSON.stringify(changed)));
});
it("propagates main component child insertion/removal and rejects cyclic definitions", () => {
  const d = setup(),
    a = createComponentInstance(d, "main", d.pages[0].id, 0, 0);
  const added = execute(a.doc, {
    type: "create",
    nodes: [
      makeNode("rectangle", d.pages[0].id, { id: "icon", parentId: "main" }),
    ],
  }).doc;
  expect(added.nodes.filter((n) => n.componentOwner === a.id)).toHaveLength(3);
  const removed = execute(added, { type: "delete", ids: ["icon"] }).doc;
  expect(removed.nodes.filter((n) => n.componentOwner === a.id)).toHaveLength(
    2,
  );
  const cyclic = setup();
  cyclic.nodes.push(
    makeNode("instance", cyclic.pages[0].id, {
      parentId: "main",
      componentId: "main",
    }),
  );
  expect(() =>
    createComponentInstance(cyclic, "main", cyclic.pages[0].id, 0, 0),
  ).toThrow("Cyclic");
});
it("retains the last appearance and detaches native instances when their main is deleted", () => {
  const d = setup(),
    a = createComponentInstance(d, "main", d.pages[0].id, 400, 100),
    deleted = execute(a.doc, { type: "delete", ids: ["main"] }).doc;
  expect(deleted.nodes.find((n) => n.id === a.id)?.type).toBe("group");
  expect(deleted.nodes.find((n) => n.type === "text")?.text).toBe("Default");
  expect(deleted.nodes.every((n) => !n.componentOwner)).toBe(true);
  validateDocument(deleted);
});
it("propagates deletion from an editable imported main into its retained library", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.componentLibrary = [
    {
      sourceId: "source",
      name: "Main",
      nodes: [
        makeNode("component", p, {
          id: "template",
          fidelity: { size: [100, 100], sourceId: "source" },
        }),
        makeNode("text", p, {
          id: "source-label",
          parentId: "template",
          text: "Label",
        }),
      ],
    },
  ];
  const a = createComponentInstance(d, "source", p, 200, 0),
    opened = editLibraryComponent(a.doc, "source"),
    label = opened.doc.nodes.find((n) => n.parentId === opened.id)!;
  const deleted = execute(opened.doc, { type: "delete", ids: [label.id] }).doc;
  expect(deleted.componentLibrary![0].nodes).toHaveLength(1);
  expect(deleted.nodes.filter((n) => n.componentOwner === a.id)).toHaveLength(
    1,
  );
  validateDocument(deleted);
});
it("preserves imported values while linking a library instance", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    main = makeNode("component", p, {
      id: "template",
      fidelity: { size: [100, 50], sourceId: "main" },
    }),
    text = makeNode("text", p, {
      id: "source-label",
      parentId: "template",
      text: "Default",
      fidelity: { size: [100, 20], sourceId: "label" },
    });
  d.componentLibrary = [
    { sourceId: "main", name: "Button", nodes: [main, text] },
  ];
  d.nodes = [
    makeNode("group", p, {
      id: "instance",
      width: 200,
      fidelity: {
        size: [200, 50],
        sourceId: "inst",
        componentSourceId: "main",
      },
    }),
    makeNode("text", p, {
      id: "saved-label",
      parentId: "instance",
      text: "Saved override",
      fidelity: { size: [100, 20], sourceId: "label" },
    }),
  ];
  linkImportedComponents(d);
  synchronizeInstances(d);
  expect(d.nodes.find((n) => n.id === "saved-label")?.text).toBe(
    "Saved override",
  );
  expect(d.nodes.find((n) => n.id === "instance")?.width).toBe(200);
  validateDocument(d);
});
