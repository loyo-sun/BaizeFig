import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  emptyDocument,
  makeNode,
  validateDocument,
  execute,
  History,
} from "../src/core";
import {
  createComponentInstance,
  setComponentValue,
  switchVariant,
  swapComponentInstance,
  componentTargets,
  setComponentProperty,
} from "../src/components";
import { restoreFigComponentModels } from "../src/figComponents";
import { propertyPaths } from "../src/componentModel";
const g = (localID: number) => ({ sessionID: 0, localID });
function fixture() {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  const source: any[] = [
    {
      guid: g(10),
      type: "FRAME",
      isStateGroup: true,
      name: "Button",
      componentPropDefs: [
        {
          id: g(1),
          name: "Label",
          type: "TEXT",
          initialValue: { textValue: { characters: "Default" } },
        },
        {
          id: g(2),
          name: "Visible",
          type: "BOOL",
          initialValue: { boolValue: true },
        },
        { id: g(3), name: "State", type: "VARIANT" },
      ],
    },
  ];
  for (let i = 0; i < 2; i++) {
    const base = 11 + i * 10,
      root = makeNode("component", page, {
        id: `main${i}`,
        name: `State ${i}`,
        width: 260,
        height: 130,
        fidelity: { size: [260, 130], sourceId: `0:${base}` },
      });
    const nodes = [
      root,
      ...[1, 2].map((k) =>
        makeNode("text", page, {
          id: `label${i}-${k}`,
          parentId: root.id,
          name: `Label ${k}`,
          text: "Default",
          x: 20,
          y: k * 35,
          width: 180,
          height: 25,
          fontSize: 20,
          fidelity: { size: [180, 25], sourceId: `0:${base + k}` },
        }),
      ),
    ];
    (doc.componentLibrary ??= []).push({
      sourceId: `0:${base}`,
      name: root.name,
      nodes,
    });
    source.push({
      guid: g(base),
      type: "SYMBOL",
      parentIndex: { guid: g(10) },
      componentPropDefs: [
        { id: g(base + 100), parentPropDefId: g(1) },
        { id: g(base + 200), parentPropDefId: g(2) },
      ],
      variantPropSpecs: [{ propDefId: g(3), value: i ? "Hover" : "Default" }],
    });
    for (let k = 1; k <= 2; k++)
      source.push({
        guid: g(base + k),
        type: "TEXT",
        componentPropRefs: [
          { defID: g(base + 100), componentPropNodeField: "TEXT_DATA" },
          { defID: g(base + 200), componentPropNodeField: "VISIBLE" },
        ],
      });
  }
  const inserted = createComponentInstance(doc, "0:11", page, 100, 100);
  inserted.doc.nodes.find((n) => n.id === inserted.id)!.fidelity!.sourceId =
    "0:90";
  source.push({
    guid: g(90),
    type: "INSTANCE",
    componentPropAssignments: [
      { defID: g(111), value: { textValue: { characters: "" } } },
    ],
  });
  const warnings = new Set<string>();
  restoreFigComponentModels(inserted.doc, source, warnings);
  return { ...inserted, source, warnings };
}
it("restores inherited properties, multiple targets, explicit empty values and variant axes", () => {
  const { doc, id, warnings } = fixture();
  expect(warnings.size).toBe(0);
  validateDocument(doc);
  expect(doc.componentSets).toMatchObject([
    { axes: { State: ["Default", "Hover"] } },
  ]);
  const properties = doc.componentLibrary![0].nodes[0].componentProperties!;
  expect(properties).toHaveLength(2);
  expect(propertyPaths(properties[0])).toHaveLength(2);
  expect(
    doc.nodes.find((n) => n.id === id)!.componentValues?.["figprop:0:1"],
  ).toBe("");
  let changed = setComponentValue(doc, id, "figprop:0:1", "白泽 BaizeFig");
  expect(
    changed.nodes
      .filter((n) => n.componentOwner === id && n.type === "text")
      .map((n) => n.text),
  ).toEqual(["白泽 BaizeFig", "白泽 BaizeFig"]);
  changed = setComponentValue(changed, id, "figprop:0:2", false);
  expect(
    changed.nodes
      .filter((n) => n.componentOwner === id && n.type === "text")
      .every((n) => !n.visible),
  ).toBe(true);
  changed = switchVariant(changed, id, "State", "Hover");
  expect(changed.nodes.find((n) => n.id === id)!.componentId).toBe("0:21");
  expect(
    changed.nodes
      .filter((n) => n.componentOwner === id && n.type === "text")
      .map((n) => [n.text, n.visible]),
  ).toEqual([
    ["白泽 BaizeFig", false],
    ["白泽 BaizeFig", false],
  ]);
  const history = new History();
  history.push(doc);
  expect(history.undo(changed)).toEqual(doc);
  validateDocument(JSON.parse(JSON.stringify(changed)));
  if (process.env.BAIZEFIG_FIG_COMPONENT_FIXTURE)
    writeFileSync(
      "/private/tmp/baizefig-fig-components.baizefig",
      JSON.stringify(doc),
    );
});
it("edits all targets and validates duplicate or absent additional target paths", () => {
  const { doc } = fixture();
  const root = doc.componentLibrary![0].nodes[0],
    property = root.componentProperties![0];
  const changed = setComponentProperty(doc, "0:11", {
    ...property,
    defaultValue: "Shared",
  });
  expect(
    changed
      .componentLibrary![0].nodes.filter((n) => n.type === "text")
      .map((n) => n.text),
  ).toEqual(["Shared", "Shared"]);
  expect(() =>
    setComponentProperty(doc, "0:11", {
      ...property,
      additionalTargetPaths: ["/missing"],
    }),
  ).toThrow("Missing property target");
  const invalid = structuredClone(doc);
  invalid.componentLibrary![0].nodes[0].componentProperties![0].additionalTargetPaths =
    [property.targetPath];
  expect(() => validateDocument(invalid)).toThrow("Invalid component property");
  const targets = componentTargets(doc, "0:11");
  expect(targets).toHaveLength(3);
});
it("preserves ambiguous variant identities, overrides and stable same-value selection", () => {
  const {doc, source, id} = fixture();
  for (const n of source.filter(n => n.type === "SYMBOL")) n.variantPropSpecs[0].value = "Duplicate";
  const warnings = new Set<string>();
  restoreFigComponentModels(doc, source, warnings);
  expect(warnings.has("Some component variants could not be restored.")).toBe(false);
  expect(doc.componentSets![0].variants).toHaveLength(2);
  if (process.env.BAIZEFIG_FIG_COMPONENT_FIXTURE) writeFileSync("/private/tmp/baizefig-ambiguous-components.baizefig", JSON.stringify(doc));
  let changed = setComponentValue(doc, id, "figprop:0:1", "Retained");
  changed = swapComponentInstance(changed, id, "0:21");
  expect(switchVariant(changed, id, "State", "Duplicate")).toBe(changed);
  validateDocument(JSON.parse(JSON.stringify(changed)));
  expect(changed.nodes.filter(n => n.componentOwner === id && n.type === "text").map(n => n.text)).toEqual(["Retained", "Retained"]);
});

it("restores omitted variant values from explicit empty defaults and preserves switching", () => {
  const { doc, source } = fixture();
  source[0].componentPropDefs.push({
    id: g(999),
    name: "Optional",
    type: "VARIANT",
    initialValue: { textValue: { characters: "" } },
  });
  const warnings = new Set<string>();
  restoreFigComponentModels(doc, source, warnings);
  const set = doc.componentSets![0];
  expect(set.axes.Optional).toEqual([""]);
  expect(set.variants.every((v) => v.values.Optional === "")).toBe(true);
  expect(warnings.has("Some component variants could not be restored.")).toBe(
    false,
  );
  validateDocument(doc);
  const instance = doc.nodes.find((n) => n.type === "instance")!;
  const switched = switchVariant(doc, instance.id, "State", "Hover");
  expect(switched.nodes.find((n) => n.id === instance.id)?.componentId).toBe(
    "0:21",
  );
  validateDocument(JSON.parse(JSON.stringify(switched)));
});
