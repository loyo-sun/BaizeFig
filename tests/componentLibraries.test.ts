import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  type Document,
} from "../src/core";
import {
  publishLibrary,
  useLibrary,
  toggleLibrary,
  availableLibraryEntries,
  validateLibraryPackage,
} from "../src/componentLibraries";
import {
  createComponentInstance,
  setComponentProperty,
  setComponentValue,
  componentTargets,
  editLibraryComponent,
  setComponentSet,
  switchVariant,
} from "../src/components";
import { saveLibrary, listLibraryVersions } from "../src/storage";
function source() {
  let d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("component", p, { id: "main", name: "Button" }),
    makeNode("text", p, {
      id: "label",
      parentId: "main",
      name: "Label",
      text: "Default",
    }),
  ];
  d = setComponentProperty(d, "main", {
    id: "title",
    name: "Title",
    type: "text",
    targetPath: componentTargets(d, "main").find((t) => t.node.id === "label")!
      .path,
    defaultValue: "Default",
  });
  return d;
}
it("uses one library in independent documents, applies published updates, and retains instance overrides", () => {
  let publisher = source();
  const v1 = publishLibrary(publisher),
    a = useLibrary(emptyDocument(), v1),
    b = useLibrary(emptyDocument(), v1),
    ref = a.componentLibrary![0].sourceId,
    first = createComponentInstance(a, ref, a.pages[0].id, 40, 50),
    second = createComponentInstance(b, ref, b.pages[0].id, 0, 0);
  const custom = setComponentValue(first.doc, first.id, "title", "Custom");
  publisher = execute(publisher, {
    type: "update",
    ids: ["label"],
    patch: { text: "Version two", fill: "#ff0000" },
  }).doc;
  const v2 = publishLibrary(publisher, v1),
    updatedA = useLibrary(custom, v2),
    updatedB = useLibrary(second.doc, v2);
  expect(updatedA.nodes.find((n) => n.type === "text")).toMatchObject({
    text: "Custom",
    fill: "#ff0000",
  });
  expect(updatedB.nodes.find((n) => n.type === "text")?.text).toBe(
    "Version two",
  );
  expect(custom.nodes.find((n) => n.type === "text")?.fill).not.toBe("#ff0000");
  validateDocument(JSON.parse(JSON.stringify(updatedA)));
});
it("disables insertion but keeps cached instances editable offline and retains removed dependencies", () => {
  const publisher = source(),
    v1 = publishLibrary(publisher);
  let d = useLibrary(emptyDocument(), v1);
  const ref = d.componentLibrary![0].sourceId,
    inst = createComponentInstance(d, ref, d.pages[0].id, 0, 0);
  d = toggleLibrary(inst.doc, v1.id, false);
  expect(availableLibraryEntries(d)).toHaveLength(0);
  expect(() => createComponentInstance(d, ref, d.pages[0].id, 0, 0)).toThrow(
    "Enable",
  );
  d = setComponentValue(d, inst.id, "title", "Offline");
  expect(d.nodes.find((n) => n.type === "text")?.text).toBe("Offline");
  const v2 = structuredClone(v1);
  v2.revision = 2;
  v2.components = [
    {
      sourceId: "other",
      name: "Other",
      nodes: [makeNode("component", "library", { id: "other" })],
    },
  ];
  d = useLibrary(d, v2);
  expect(d.componentLibrary!.find((c) => c.sourceId === ref)?.missing).toBe(
    true,
  );
  expect(d.nodes.find((n) => n.type === "text")?.text).toBe("Offline");
  expect(availableLibraryEntries(d)).toHaveLength(1);
});
it("requires an explicit choice before replacing local main edits and refreshes editable main identity", () => {
  let publisher = source(),
    pack = publishLibrary(publisher),
    d = useLibrary(emptyDocument(), pack);
  const ref = d.componentLibrary![0].sourceId,
    opened = editLibraryComponent(d, ref),
    localId = opened.id;
  d = execute(opened.doc, {
    type: "update",
    ids: [localId],
    patch: { radius: 20 },
  }).doc;
  expect(d.componentLibrary![0].localEdits).toBe(true);
  publisher = execute(publisher, {
    type: "update",
    ids: ["main"],
    patch: { radius: 6 },
  }).doc;
  pack = publishLibrary(publisher, pack);
  expect(() => useLibrary(d, pack)).toThrow("local main edits");
  const updated = useLibrary(d, pack, true);
  expect(updated.nodes.find((n) => n.id === localId)?.radius).toBe(6);
  expect(updated.componentLibrary![0].localEdits).toBe(false);
  validateDocument(updated);
});
it("namespaces nested components and variant sets for multiple libraries without reference collisions", () => {
  let p = source();
  p.nodes.push(
    makeNode("component", p.pages[0].id, { id: "other", name: "Other" }),
  );
  p = setComponentSet(p, {
    id: "set",
    name: "States",
    axes: { State: ["A", "B"] },
    variants: [
      { componentId: "main", values: { State: "A" } },
      { componentId: "other", values: { State: "B" } },
    ],
  });
  const one = publishLibrary(p),
    two = { ...structuredClone(one), id: "another-library" };
  let doc = useLibrary(useLibrary(emptyDocument(), one), two);
  expect(new Set(doc.componentLibrary!.map((c) => c.sourceId)).size).toBe(4);
  expect(doc.componentSets).toHaveLength(2);
  const ref = doc.componentLibrary![0].sourceId,
    inst = createComponentInstance(doc, ref, doc.pages[0].id, 0, 0);
  doc = switchVariant(inst.doc, inst.id, "State", "B");
  expect(doc.nodes.find((n) => n.id === inst.id)?.componentId).toContain(
    one.id,
  );
  validateDocument(doc);
});
it("stores immutable revisions and exports a library independent of its publisher document", async () => {
  const publisher = source(),
    one = publishLibrary(publisher);
  await saveLibrary(one);
  const imported = JSON.parse(JSON.stringify(one));
  validateLibraryPackage(imported);
  await saveLibrary(imported);
  const two = publishLibrary(publisher, one);
  await saveLibrary(two);
  expect((await listLibraryVersions(one.id)).map((p) => p.revision)).toEqual([
    2, 1,
  ]);
  const conflict = { ...structuredClone(one), name: "Conflict" };
  await expect(saveLibrary(conflict)).rejects.toThrow("revision");
  const d = useLibrary(emptyDocument(), imported),
    ref = d.componentLibrary![0].sourceId;
  expect(
    createComponentInstance(d, ref, d.pages[0].id, 0, 0).doc.nodes.some(
      (n) => n.text === "Default",
    ),
  ).toBe(true);
});
it("rejects invalid format, missing dependencies and cyclic component graphs without mutating documents", () => {
  const pack = publishLibrary(source());
  expect(() => validateLibraryPackage({ ...pack, revision: 0 })).toThrow();
  pack.components[0].nodes.push(
    makeNode("instance", "library", {
      id: "cycle",
      parentId: "main",
      componentId: "main",
    }),
  );
  expect(() => validateLibraryPackage(pack)).toThrow("Cyclic");
  pack.components[0].nodes.at(-1)!.componentId = "missing";
  expect(() => validateLibraryPackage(pack)).toThrow("dependency");
});

it("preserves variable dependencies with namespaced aliases, modes, and explicit property overrides", () => {
  let p = source();
  const col = {
    id: "colors",
    name: "Colors",
    activeMode: "dark",
    modes: [
      { id: "light", name: "Light" },
      { id: "dark", name: "Dark" },
    ],
  };
  p.variableCollections = [col];
  p.variables = [
    {
      id: "base",
      name: "Base",
      collectionId: "colors",
      value: "#ff0000",
      values: { light: { color: "#ff0000" }, dark: { color: "#0000ff" } },
    },
    {
      id: "alias",
      name: "Alias",
      collectionId: "colors",
      value: "#ff0000",
      values: { light: { alias: "base" }, dark: { alias: "base" } },
    },
  ];
  p.typedVariables = [
    {
      id: "titleVar",
      name: "Title",
      type: "string",
      value: "Variable default",
    },
  ];
  p.nodes[1].variableId = "alias";
  p.nodes[1].bindings = { text: "titleVar" };
  const pack = publishLibrary(p);
  validateLibraryPackage(pack);
  let doc = useLibrary(emptyDocument(), pack);
  const ref = doc.componentLibrary![0].sourceId,
    inst = createComponentInstance(doc, ref, doc.pages[0].id, 0, 0);
  doc = setComponentValue(inst.doc, inst.id, "title", "Override");
  doc = execute(doc, { type: "update", ids: [inst.id], patch: { x: 20 } }).doc;
  expect(doc.nodes.find((n) => n.type === "text")?.text).toBe("Override");
  expect(doc.nodes.find((n) => n.type === "text")?.fill).toBe("#0000ff");
  expect(doc.variables?.every((v) => v.id.includes(pack.id))).toBe(true);
  validateDocument(doc);
});
