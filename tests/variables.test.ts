import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import {
  resolveTypedVariable,
  applyTypedBindings,
  editTypedVariable,
} from "../src/typedVariables";
import {
  setVariableMode,
  resolveVariable,
  editVariableColor,
} from "../src/variables";
it("reflows layout when a bound size changes and lets direct editing release that binding", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.typedVariables = [{ id: "size", name: "Size", type: "number", value: 40 }];
  d.nodes = [
    makeNode("frame", p, {
      id: "frame",
      layout: "horizontal",
      importedLayout: {
        padding: [0, 0, 0, 0],
        primary: "hug",
        counter: "hug",
        justify: "start",
        align: "start",
      },
      gap: 10,
    }),
    makeNode("rectangle", p, {
      id: "first",
      parentId: "frame",
      width: 40,
      bindings: { width: "size" },
    }),
    makeNode("rectangle", p, { id: "second", parentId: "frame", width: 20 }),
  ];
  const changed = editTypedVariable(d, "size", 80);
  expect(changed.nodes[2].x).toBe(90);
  expect(changed.nodes[0].width).toBe(110);
  const edited = execute(changed, {
    type: "update",
    ids: ["first"],
    patch: { width: 50 },
  }).doc;
  expect(edited.nodes[1].width).toBe(50);
  expect(edited.nodes[1].bindings?.width).toBeUndefined();
  expect(editTypedVariable(edited, "size", 100).nodes[1].width).toBe(50);
});
it("preserves typed values, aliases, inherited modes and per-node overrides across native round trips", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.variableCollections = [
    {
      id: "theme",
      name: "Theme",
      modes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      activeMode: "a",
    },
  ];
  d.typedVariables = [
    {
      id: "size",
      name: "Size",
      type: "number",
      collectionId: "theme",
      value: 40,
      values: { a: { value: 40 }, b: { value: 80 } },
    },
    {
      id: "alias",
      name: "Alias",
      type: "number",
      collectionId: "theme",
      value: 40,
      values: { a: { alias: "size" }, b: { alias: "size" } },
    },
    { id: "label", name: "Label", type: "string", value: "Bound text" },
    { id: "shown", name: "Shown", type: "boolean", value: false },
  ];
  d.nodes = [
    makeNode("frame", p, { id: "parent", variableModes: { theme: "b" } }),
    makeNode("text", p, {
      id: "child",
      parentId: "parent",
      bindings: { width: "alias", text: "label", visible: "shown" },
    }),
    makeNode("rectangle", p, {
      id: "local",
      parentId: "parent",
      variableModes: { theme: "a" },
      bindings: { width: "size" },
    }),
  ];
  applyTypedBindings(d);
  expect(d.nodes[1]).toMatchObject({
    width: 80,
    text: "Bound text",
    visible: false,
  });
  expect(d.nodes[2].width).toBe(40);
  validateDocument(JSON.parse(JSON.stringify(d)));
  const changed = setVariableMode(d, "theme", "b");
  expect(changed.nodes[2].width).toBe(40);
});
it("retains transparent colors and resolves node-local color modes without changing other nodes", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.variableCollections = [
    {
      id: "theme",
      name: "Theme",
      activeMode: "a",
      modes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    },
  ];
  d.variables = [
    {
      id: "color",
      name: "Color",
      value: "#ff000080",
      collectionId: "theme",
      values: { a: { color: "#ff000080" }, b: { color: "#00ff0033" } },
    },
  ];
  d.nodes = [
    makeNode("rectangle", p, { id: "a", variableId: "color" }),
    makeNode("rectangle", p, {
      id: "b",
      variableId: "color",
      variableModes: { theme: "b" },
    }),
  ];
  const next = execute(d, {
    type: "update",
    ids: ["a"],
    patch: { name: "Name" },
  }).doc;
  expect(next.nodes.map((n) => n.fill)).toEqual(["#ff000080", "#00ff0033"]);
  validateDocument(next);
  expect(editVariableColor(next, "color", "#0000ff55").nodes[1].fill).toBe(
    "#00ff0033",
  );
});
it("rejects alias cycles, wrong value types and unsafe dimensions", () => {
  const d = emptyDocument();
  d.typedVariables = [
    {
      id: "bad",
      name: "Bad",
      type: "number",
      value: 0,
      values: { mode: { alias: "bad" } },
    },
  ];
  expect(() => resolveTypedVariable(d, "bad")).toThrow("Cyclic");
  expect(() => validateDocument(d)).toThrow("Cyclic");
  d.typedVariables = [
    { id: "negative", name: "Negative", type: "number", value: -1 },
  ];
  d.nodes = [
    makeNode("rectangle", d.pages[0].id, { bindings: { width: "negative" } }),
  ];
  expect(() => applyTypedBindings(d)).toThrow("Invalid variable binding");
});
