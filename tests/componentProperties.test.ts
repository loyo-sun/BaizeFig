import { pasteNodes } from "../src/clipboard";
import { expect, it } from "vitest";
import {
  descendants,
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  type Document,
} from "../src/core";
import {
  componentTargets,
  setComponentProperty,
  setComponentValue,
  createComponentInstance,
  resetComponentInstance,
  detachComponentInstance,
  swapComponentInstance,
  setComponentSet,
  switchVariant,
  propagatePropertiesToVariants,
} from "../src/components";
function fixture() {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("component", p, { id: "main", name: "Card" }),
    makeNode("text", p, {
      id: "label",
      parentId: "main",
      name: "Label",
      text: "Default",
    }),
    makeNode("frame", p, {
      id: "slot",
      parentId: "main",
      name: "Content",
      fill: "none",
    }),
    makeNode("rectangle", p, {
      id: "inside",
      parentId: "slot",
      name: "Slot child",
      width: 20,
    }),
    makeNode("component", p, { id: "iconA", name: "IconA", fill: "#ff0000" }),
    makeNode("component", p, { id: "iconB", name: "IconB", fill: "#0000ff" }),
    makeNode("instance", p, {
      id: "nested",
      parentId: "main",
      name: "Icon",
      componentId: "iconA",
      componentOwner: "nested",
    }),
  ];
  return doc;
}
function bind(
  doc: Document,
  type: "text" | "boolean" | "instance" | "slot",
  target: string,
  id = type,
) {
  const path = componentTargets(doc, "main").find(
    (t) => t.node.id === target,
  )!.path;
  return setComponentProperty(doc, "main", {
    id,
    name: id,
    type,
    targetPath: path,
    defaultValue:
      type === "text"
        ? "Default"
        : type === "boolean"
          ? true
          : type === "instance"
            ? "iconA"
            : "",
  });
}
it("updates exposed properties independently, retains manual overrides and resets defaults", () => {
  let doc = bind(fixture(), "text", "label");
  doc = bind(doc, "boolean", "nested");
  doc = bind(doc, "instance", "nested");
  const instance = createComponentInstance(
    doc,
    "main",
    doc.pages[0].id,
    300,
    40,
  );
  doc = setComponentValue(instance.doc, instance.id, "text", "白泽");
  doc = setComponentValue(doc, instance.id, "boolean", false);
  doc = setComponentValue(doc, instance.id, "instance", "iconB");
  const get = (name: string) =>
    doc.nodes.find((n) => n.componentOwner === instance.id && n.name === name)!;
  expect(get("Label").text).toBe("白泽");
  expect(get("Icon")).toMatchObject({
    componentId: "iconB",
    visible: false,
    fill: "#0000ff",
  });
  doc = execute(doc, {
    type: "update",
    ids: ["label"],
    patch: { text: "New default" },
  }).doc;
  expect(get("Label").text).toBe("白泽");
  doc = execute(doc, {
    type: "update",
    ids: [get("Label").id],
    patch: { text: "Canvas edit" },
  }).doc;
  expect(
    doc.nodes.find((n) => n.id === instance.id)?.componentValues?.text,
  ).toBe("Canvas edit");
  doc = resetComponentInstance(doc, instance.id);
  expect(get("Label").text).toBe("New default");
  expect(get("Icon")).toMatchObject({ componentId: "iconA", visible: true });
  validateDocument(JSON.parse(JSON.stringify(doc)));
});
it("allows slot add/edit/reorder/remove without detaching and preserves content through main updates and native roundtrip", () => {
  let doc = bind(fixture(), "slot", "slot");
  const inst = createComponentInstance(doc, "main", doc.pages[0].id, 300, 0);
  doc = inst.doc;
  const slot = doc.nodes.find(
    (n) => n.componentOwner === inst.id && n.componentSlot,
  )!;
  doc = execute(doc, {
    type: "create",
    nodes: [
      makeNode("text", doc.pages[0].id, {
        id: "custom",
        parentId: slot.id,
        text: "Custom content",
      }),
    ],
  }).doc;
  let child = doc.nodes.find(
    (n) => n.componentOwner === inst.id && n.text === "Custom content",
  )!;
  expect(child).toBeDefined();
  doc = execute(doc, {
    type: "update",
    ids: [child.id],
    patch: { text: "Edited content" },
  }).doc;
  doc = execute(doc, {
    type: "update",
    ids: ["main"],
    patch: { radius: 12 },
  }).doc;
  expect(doc.nodes.find((n) => n.id === inst.id)?.type).toBe("instance");
  expect(doc.nodes.some((n) => n.text === "Edited content")).toBe(true);
  const restored = JSON.parse(JSON.stringify(doc));
  validateDocument(restored);
  doc = execute(restored, {
    type: "update",
    ids: ["label"],
    patch: { fill: "#ff0000" },
  }).doc;
  child = doc.nodes.find((n) => n.text === "Edited content")!;
  doc = execute(doc, { type: "order", ids: [child.id], direction: "back" }).doc;
  expect(doc.nodes.findIndex((n) => n.id === child.id)).toBeLessThan(
    doc.nodes.findIndex(
      (n) => n.name === "Slot child" && n.componentOwner === inst.id,
    ),
  );
  doc = execute(doc, { type: "delete", ids: [child.id] }).doc;
  expect(doc.nodes.some((n) => n.text === "Edited content")).toBe(false);
  validateDocument(doc);
});
it("moves slot content out as an independent layer and duplicates customized instances with fresh IDs", () => {
  let doc = bind(fixture(), "slot", "slot");
  const inst = createComponentInstance(doc, "main", doc.pages[0].id, 0, 0);
  doc = inst.doc;
  const child = doc.nodes.find(
    (n) => n.componentOwner === inst.id && n.name === "Slot child",
  )!;
  doc = execute(doc, { type: "reparent", ids: [child.id], parentId: null }).doc;
  expect(doc.nodes.find((n) => n.id === child.id)).toMatchObject({
    parentId: null,
  });
  expect(
    doc.nodes.find((n) => n.id === child.id)?.componentOwner,
  ).toBeUndefined();
  const copy = execute(doc, { type: "duplicate", ids: [inst.id] });
  expect(new Set(copy.doc.nodes.map((n) => n.id)).size).toBe(
    copy.doc.nodes.length,
  );
  validateDocument(copy.doc);
});
it("retains corresponding overrides across variants with different source IDs and property IDs", () => {
  let doc = bind(fixture(), "text", "label");
  doc.nodes.push(
    makeNode("component", doc.pages[0].id, {
      id: "alternate",
      name: "Alternate",
    }),
    makeNode("text", doc.pages[0].id, {
      id: "altLabel",
      parentId: "alternate",
      name: "Label",
      text: "Alt",
    }),
  );
  const target = componentTargets(doc, "alternate").find(
    (t) => t.node.id === "altLabel",
  )!;
  doc = setComponentProperty(doc, "alternate", {
    id: "altText",
    name: "text",
    type: "text",
    targetPath: target.path,
    defaultValue: "Alt",
  });
  doc = setComponentSet(doc, {
    id: "set",
    name: "Card variants",
    axes: { State: ["Default", "Hover"] },
    variants: [
      { componentId: "main", values: { State: "Default" } },
      { componentId: "alternate", values: { State: "Hover" } },
    ],
  });
  const inst = createComponentInstance(doc, "main", doc.pages[0].id, 20, 30);
  doc = setComponentValue(inst.doc, inst.id, "text", "User text");
  doc = switchVariant(doc, inst.id, "State", "Hover");
  expect(doc.nodes.find((n) => n.id === inst.id)).toMatchObject({
    x: 20,
    y: 30,
    componentId: "alternate",
  });
  expect(
    doc.nodes.find((n) => n.componentOwner === inst.id && n.name === "Label")
      ?.text,
  ).toBe("User text");
  doc = switchVariant(doc, inst.id, "State", "Default");
  expect(
    doc.nodes.find((n) => n.componentOwner === inst.id && n.name === "Label")
      ?.text,
  ).toBe("User text");
  validateDocument(doc);
});
it("preserves nested instance swaps and rejects invalid property types and cycles", () => {
  const base = fixture(),
    inst = createComponentInstance(base, "main", base.pages[0].id, 0, 0);
  let doc = inst.doc;
  const nested = doc.nodes.find(
    (n) => n.componentOwner === inst.id && n.name === "Icon",
  )!;
  doc = swapComponentInstance(doc, nested.id, "iconB");
  expect(doc.nodes.find((n) => n.id === nested.id)?.componentId).toBe("iconB");
  doc = execute(doc, {
    type: "update",
    ids: ["label"],
    patch: { fill: "#ff0000" },
  }).doc;
  expect(doc.nodes.find((n) => n.id === nested.id)?.componentId).toBe("iconB");
  expect(() =>
    setComponentProperty(doc, "main", {
      id: "bad",
      name: "bad",
      type: "text",
      targetPath: "",
      defaultValue: "bad",
    }),
  ).toThrow();
});
it("protects locked instances and rejects malformed component metadata", () => {
  let doc = bind(fixture(), "text", "label");
  const inst = createComponentInstance(doc, "main", doc.pages[0].id, 0, 0);
  doc = inst.doc;
  doc.nodes.find((n) => n.id === inst.id)!.locked = true;
  expect(() => setComponentValue(doc, inst.id, "text", "bad")).toThrow(
    "Unlock",
  );
  expect(() => resetComponentInstance(doc, inst.id)).toThrow("Unlock");
  expect(() => detachComponentInstance(doc, inst.id)).toThrow("Unlock");
  const bad = structuredClone(doc);
  bad.nodes[0].componentProperties![0].type = "bad" as "text";
  expect(() => validateDocument(bad)).toThrow();
});
it("keeps slot node IDs stable across edits and isolates customization between instances", () => {
  let doc = bind(fixture(), "slot", "slot");
  const first = createComponentInstance(doc, "main", doc.pages[0].id, 0, 0),
    second = createComponentInstance(
      first.doc,
      "main",
      doc.pages[0].id,
      300,
      0,
    );
  doc = second.doc;
  const slot = doc.nodes.find(
    (n) => n.componentOwner === first.id && n.componentSlot,
  )!;
  doc = execute(doc, {
    type: "create",
    nodes: [
      makeNode("text", doc.pages[0].id, {
        id: "stable",
        parentId: slot.id,
        text: "One",
      }),
    ],
  }).doc;
  expect(doc.nodes.some((n) => n.id === "stable")).toBe(true);
  for (const text of ["Two", "Three", "Four"]) {
    doc = execute(doc, {
      type: "update",
      ids: ["stable"],
      patch: { text },
    }).doc;
    expect(doc.nodes.find((n) => n.id === "stable")?.text).toBe(text);
  }
  expect(
    doc.nodes.some((n) => n.componentOwner === second.id && n.text === "Four"),
  ).toBe(false);
  const duplicate = execute(doc, { type: "duplicate", ids: [first.id] });
  expect(new Set(duplicate.doc.nodes.map((n) => n.id)).size).toBe(
    duplicate.doc.nodes.length,
  );
  const custom = duplicate.doc.nodes.filter((n) => n.text === "Four");
  expect(custom).toHaveLength(2);
  const edited = execute(duplicate.doc, {
    type: "update",
    ids: [custom[1].id],
    patch: { text: "Independent" },
  }).doc;
  expect(edited.nodes.find((n) => n.id === "stable")?.text).toBe("Four");
  validateDocument(edited);
});
it("rejects duplicate variant combinations and recursive slot snapshots", () => {
  const d = fixture();
  d.componentSets = [
    {
      id: "bad",
      name: "Bad",
      axes: { State: ["A"] },
      variants: [
        { componentId: "main", values: { State: "A" } },
        { componentId: "iconA", values: { State: "A" } },
      ],
    },
  ];
  expect(() => validateDocument(d)).toThrow("Duplicate");
  delete d.componentSets;
  const n = d.nodes[0];
  n.componentSlots = { x: [n] };
  expect(() => validateDocument(d)).toThrow("nesting");
});
it("duplicates component property targets and copies customized slots across pages with valid metadata", () => {
  let doc = bind(fixture(), "text", "label");
  doc = bind(doc, "slot", "slot");
  const duplicate = execute(doc, { type: "duplicate", ids: ["main"] });
  const copiedMain = duplicate.doc.nodes.find(
    (n) => n.id === duplicate.selection![0],
  )!;
  const copiedTarget = componentTargets(duplicate.doc, copiedMain.id).find(
    (t) => t.node.type === "text",
  )!;
  expect(
    copiedMain.componentProperties!.find((p) => p.type === "text")?.targetPath,
  ).toBe(copiedTarget.path);
  const inst = createComponentInstance(
    duplicate.doc,
    copiedMain.id,
    doc.pages[0].id,
    0,
    0,
  );
  doc = setComponentValue(inst.doc, inst.id, "text", "Copied binding");
  expect(
    doc.nodes.some(
      (n) => n.componentOwner === inst.id && n.text === "Copied binding",
    ),
  ).toBe(true);
  validateDocument(doc);
});

it("propagates matching definitions across variants without losing their defaults", () => {
  let d = bind(fixture(), "text", "label");
  d.nodes.push(
    makeNode("component", d.pages[0].id, { id: "alt", name: "Alt" }),
    makeNode("text", d.pages[0].id, {
      id: "alt-label",
      parentId: "alt",
      name: "Label",
      text: "Alt default",
    }),
  );
  d = setComponentSet(d, {
    id: "set",
    name: "Cards",
    axes: { State: ["A", "B"] },
    variants: [
      { componentId: "main", values: { State: "A" } },
      { componentId: "alt", values: { State: "B" } },
    ],
  });
  d = propagatePropertiesToVariants(d, "main");
  const prop = d.nodes.find((n) => n.id === "alt")!.componentProperties![0];
  expect(prop.defaultValue).toBe("Alt default");
  expect(prop.targetPath).toBe(
    componentTargets(d, "alt").find((t) => t.node.id === "alt-label")!.path,
  );
  validateDocument(d);
});

it("pastes customized slot instances onto another page with remapped snapshot page IDs", () => {
  let d = bind(fixture(), "slot", "slot");
  const inst = createComponentInstance(d, "main", d.pages[0].id, 0, 0);
  d = inst.doc;
  const slot = d.nodes.find(
    (n) => n.componentOwner === inst.id && n.componentSlot,
  )!;
  d = execute(d, {
    type: "create",
    nodes: [
      makeNode("text", d.pages[0].id, {
        id: "custom-slot",
        parentId: slot.id,
        text: "Portable slot",
      }),
    ],
  }).doc;
  const ids = new Set(descendants(d, [inst.id]));
  const data = {
    documentId: d.id,
    nodes: d.nodes.filter((n) => ids.has(n.id)),
  };
  d.pages.push({ id: "second", name: "Second" });
  const pasted = pasteNodes(d, "second", data, [], "normal");
  validateDocument(pasted.doc);
  const root = pasted.doc.nodes.find((n) => n.id === pasted.selection[0])!;
  expect(root.type).toBe("instance");
  expect(
    Object.values(root.componentSlots ?? {})
      .flat()
      .every((n) => n.pageId === "second"),
  ).toBe(true);
  expect(
    pasted.doc.nodes.some(
      (n) => n.pageId === "second" && n.text === "Portable slot",
    ),
  ).toBe(true);
});

it("keeps a multi-target main property and its instances synchronized", () => {
  let doc = fixture();
  doc.nodes.push(
    makeNode("text", doc.pages[0].id, {
      id: "label2",
      parentId: "main",
      name: "Label 2",
      text: "Default",
    }),
  );
  const paths = componentTargets(doc, "main");
  doc = setComponentProperty(doc, "main", {
    id: "shared",
    name: "Shared",
    type: "text",
    targetPath: paths.find((t) => t.node.id === "label")!.path,
    additionalTargetPaths: [paths.find((t) => t.node.id === "label2")!.path],
    defaultValue: "Default",
  });
  const inserted = createComponentInstance(
    doc,
    "main",
    doc.pages[0].id,
    300,
    40,
  );
  doc = inserted.doc;
  doc = execute(doc, {
    type: "update",
    ids: ["label2"],
    patch: { text: "Main update" },
  }).doc;
  expect(
    doc.nodes
      .filter((n) => n.type === "text" && ["label", "label2"].includes(n.id))
      .map((n) => n.text),
  ).toEqual(["Main update", "Main update"]);
  expect(
    doc.nodes
      .filter((n) => n.type === "text" && n.componentOwner === inserted.id)
      .map((n) => n.text),
  ).toEqual(["Main update", "Main update"]);
  doc = setComponentValue(doc, inserted.id, "shared", "Override");
  doc = execute(doc, {
    type: "update",
    ids: ["label"],
    patch: { text: "New main" },
  }).doc;
  expect(
    doc.nodes
      .filter((n) => n.type === "text" && n.componentOwner === inserted.id)
      .map((n) => n.text),
  ).toEqual(["Override", "Override"]);
});
