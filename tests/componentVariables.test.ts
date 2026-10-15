import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import {
  bindComponentProperty,
  componentPropertyState,
  componentTargets,
  createComponentInstance,
  setComponentProperty,
  setComponentValue,
  resetComponentInstance,
} from "../src/components";
import { setVariableMode } from "../src/variables";
import { editTypedVariable } from "../src/typedVariables";
function fixture() {
  let doc = emptyDocument();
  doc.name = "Component variable verification";
  const page = doc.pages[0].id;
  doc.variableCollections = [
    {
      id: "language",
      name: "Language",
      activeMode: "en",
      modes: [
        { id: "en", name: "English" },
        { id: "zh", name: "中文" },
      ],
    },
  ];
  doc.typedVariables = [
    {
      id: "label",
      name: "Button label",
      type: "string",
      collectionId: "language",
      value: "Hello",
      values: { en: { value: "Hello" }, zh: { value: "你好" } },
    },
    {
      id: "override",
      name: "Alternate label",
      type: "string",
      collectionId: "language",
      value: "World",
      values: { en: { value: "World" }, zh: { value: "世界" } },
    },
    {
      id: "show",
      name: "Show label",
      type: "boolean",
      collectionId: "language",
      value: true,
      values: { en: { value: true }, zh: { value: false } },
    },
  ];
  const root = makeNode("component", page, {
    id: "main",
    name: "Variable button",
    width: 200,
    height: 130,
    x: 30,
    y: 30,
    fill: "#e2eadb",
  });
  doc.nodes = [
    root,
    ...[1, 2].map((i) =>
      makeNode("text", page, {
        id: "label" + i,
        parentId: root.id,
        name: "Label " + i,
        text: "Default",
        x: 15,
        y: 20 + i * 30,
        width: 170,
        height: 25,
        fontSize: 20,
        fill: "#204d39",
        textFlow: {
          autoResize: "fixed",
          verticalAlign: "top",
          letterSpacing: 0,
        },
      }),
    ),
  ];
  const paths = componentTargets(doc, "main")
    .filter((t) => t.node.type === "text")
    .map((t) => t.path);
  doc = setComponentProperty(doc, "main", {
    id: "text",
    name: "Label",
    type: "text",
    targetPath: paths[0],
    additionalTargetPaths: [paths[1]],
    defaultValue: "Default",
  });
  doc = setComponentProperty(doc, "main", {
    id: "visible",
    name: "Show",
    type: "boolean",
    targetPath: paths[0],
    additionalTargetPaths: [paths[1]],
    defaultValue: true,
  });
  const a = createComponentInstance(doc, "main", page, 300, 30);
  const b = createComponentInstance(a.doc, "main", page, 550, 30);
  return { doc: b.doc, a: a.id, b: b.id };
}
const texts = (doc: ReturnType<typeof emptyDocument>, id: string) =>
  doc.nodes.filter((n) => n.componentOwner === id && n.type === "text");
it("binds multiple property targets with inherited modes, instance isolation, fixed overrides and reset", () => {
  const f = fixture();
  let doc = bindComponentProperty(f.doc, "main", "text", "label");
  expect(texts(doc, f.a).map((n) => n.text)).toEqual(["Hello", "Hello"]);
  doc = bindComponentProperty(doc, "main", "text", "override", f.a);
  doc = bindComponentProperty(doc, "main", "visible", "show", f.a);
  doc = setVariableMode(doc, "language", "zh");
  expect(texts(doc, f.a).map((n) => [n.text, n.visible])).toEqual([
    ["世界", false],
    ["世界", false],
  ]);
  expect(texts(doc, f.b).map((n) => [n.text, n.visible])).toEqual([
    ["你好", true],
    ["你好", true],
  ]);
  doc = execute(doc, {
    type: "update",
    ids: [f.a],
    patch: { name: "Rename retains bindings" },
  }).doc;
  expect(texts(doc, f.a).every((n) => n.bindings?.text === "override")).toBe(
    true,
  );
  const prop = doc.nodes.find((n) => n.id === "main")!.componentProperties![0];
  expect(componentPropertyState(doc, "main", prop, f.a)).toMatchObject({
    value: "世界",
    variableId: "override",
  });
  doc = setComponentValue(doc, f.a, "text", "Custom");
  doc = editTypedVariable(doc, "override", "Changed");
  expect(texts(doc, f.a).map((n) => n.text)).toEqual(["Custom", "Custom"]);
  doc = resetComponentInstance(doc, f.a);
  expect(texts(doc, f.a).map((n) => [n.text, n.visible])).toEqual([
    ["你好", true],
    ["你好", true],
  ]);
  validateDocument(JSON.parse(JSON.stringify(doc)));
});
it("supports unbinding to a fixed value, source property renaming, deep overrides and undo", () => {
  const f = fixture();
  let doc = bindComponentProperty(f.doc, "main", "text", "label");
  const prop = doc.nodes
    .find((n) => n.id === "main")!
    .componentProperties!.find((p) => p.id === "text")!;
  doc = setComponentProperty(doc, "main", { ...prop, name: "Renamed label" });
  expect(texts(doc, f.a).every((n) => n.bindings?.text === "label")).toBe(true);
  const history = new History();
  history.push(doc);
  doc = bindComponentProperty(doc, "main", "text", undefined, f.a);
  doc = editTypedVariable(doc, "label", "Updated");
  expect(texts(doc, f.a).map((n) => n.text)).toEqual(["Hello", "Hello"]);
  expect(texts(doc, f.b).map((n) => n.text)).toEqual(["Updated", "Updated"]);
  doc = history.undo(doc);
  expect(texts(doc, f.a).every((n) => n.bindings?.text === "label")).toBe(true);
  doc = execute(doc, {
    type: "update",
    ids: [texts(doc, f.a)[0].id],
    patch: { text: "Deep edit" },
  }).doc;
  expect(texts(doc, f.a).map((n) => n.text)).toEqual([
    "Deep edit",
    "Deep edit",
  ]);
  expect(texts(doc, f.a).every((n) => !n.bindings?.text)).toBe(true);
  expect(() => bindComponentProperty(doc, "main", "text", "show", f.a)).toThrow(
    "Invalid component property binding",
  );
  if (process.env.BAIZEFIG_COMPONENT_VARIABLE_FIXTURE)
    writeFileSync(
      "/private/tmp/baizefig-component-variables.baizefig",
      JSON.stringify(bindComponentProperty(f.doc, "main", "text", "label")),
    );
});
