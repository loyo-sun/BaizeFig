import { it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
  absolute,
  type Document,
} from "../src/core";
import {
  createComponentInstance,
  componentTargets,
  setComponentProperty,
  setComponentValue,
  setComponentSet,
  switchVariant,
  synchronizeInstances,
} from "../src/components";
import { insertAsset } from "../src/assetPlacement";
import { transitionPrototype } from "../src/prototype";

function workflow() {
  let d = emptyDocument();
  const p = d.pages[0].id;
  d.name = "组件验收 · Button 与 Card";
  for (const [index, key] of ["sd", "ld", "sa"].entries()) {
    d.nodes.push(
      makeNode("component", p, {
        id: key,
        name: "Button " + key,
        x: 1500,
        y: index * 140,
        width: key === "ld" ? 280 : 220,
        height: 64,
        fill: key === "sa" ? "#24845a" : "#0d99ff",
        layout: "horizontal",
        gap: 12,
        padding: 16,
        interactions: [
          {
            trigger: "click",
            actions: [
              { type: "changeTo", componentId: key === "sa" ? "sd" : "sa" },
            ],
          },
        ],
      }),
      makeNode("ellipse", p, {
        id: key + "left",
        parentId: key,
        name: "Left icon",
        width: 20,
        height: 20,
        fill: "#ffffff",
      }),
      makeNode("text", p, {
        id: key + "label",
        parentId: key,
        name: "Label",
        text: "继续",
        width: 100,
        height: 28,
        fontSize: 18,
        fill: "#ffffff",
      }),
      makeNode("rectangle", p, {
        id: key + "right",
        parentId: key,
        name: "Right icon",
        width: 20,
        height: 20,
        fill: "#ffffff",
      }),
    );
    for (const [id, type, target, value] of [
      ["label", "text", key + "label", "继续"],
      ["left", "boolean", key + "left", true],
      ["right", "boolean", key + "right", true],
    ] as const) {
      d = setComponentProperty(d, key, {
        id,
        name: id,
        type,
        targetPath: componentTargets(d, key).find((t) => t.node.id === target)!
          .path,
        defaultValue: value,
      });
    }
  }
  d = setComponentSet(d, {
    id: "buttons",
    name: "Controls/Button",
    axes: { Size: ["S", "L"], State: ["Default", "Active"] },
    defaultComponentId: "sd",
    variants: [
      { componentId: "sd", values: { Size: "S", State: "Default" } },
      { componentId: "ld", values: { Size: "L", State: "Default" } },
      { componentId: "sa", values: { Size: "S", State: "Active" } },
    ],
  });
  d.nodes.push(
    makeNode("frame", p, {
      id: "screen",
      name: "组件验收画板",
      width: 1000,
      height: 700,
      fill: "#f4f6f8",
    }),
    makeNode("component", p, {
      id: "card",
      name: "Content/Card",
      x: 2000,
      width: 320,
      height: 260,
      layout: "vertical",
      gap: 16,
      padding: 24,
      fill: "#ffffff",
    }),
    makeNode("text", p, {
      id: "title",
      parentId: "card",
      name: "Title",
      text: "白泽卡片",
      width: 240,
      height: 32,
      fontSize: 24,
    }),
    makeNode("frame", p, {
      id: "slot",
      parentId: "card",
      name: "Content slot",
      width: 260,
      height: 120,
      componentSlot: true,
      fill: "#edf2f6",
    }),
  );
  d = setComponentProperty(d, "card", {
    id: "content",
    name: "Content",
    type: "slot",
    targetPath: componentTargets(d, "card").find((t) => t.node.id === "slot")!
      .path,
    defaultValue: "",
  });
  let n = createComponentInstance(d, "sd", p, 0, 0);
  d = execute(n.doc, { type: "reparent", ids: [n.id], parentId: "card" }).doc;
  d = execute(d, {
    type: "update",
    ids: ["card"],
    patch: {
      exposedNestedInstances: [
        componentTargets(d, "card").find((t) => t.node.id === n.id)!.path,
      ],
    },
  }).doc;
  const a = createComponentInstance(d, "card", p, 40, 40);
  d = execute(a.doc, { type: "reparent", ids: [a.id], parentId: "screen" }).doc;
  const b = createComponentInstance(d, "card", p, 450, 40);
  d = execute(b.doc, { type: "reparent", ids: [b.id], parentId: "screen" }).doc;
  return { d, p, a: a.id, b: b.id };
}
it("keeps nested Button properties and Card slot content through variant changes, undo, and saved-file recovery", () => {
  let { d, p, a, b } = workflow();
  const nested = d.nodes.find(
    (n) => n.componentOwner === a && n.type === "instance" && n.id !== a,
  )!;
  d = setComponentValue(d, nested.id, "label", "保存修改");
  d = setComponentValue(d, nested.id, "right", false);
  d = switchVariant(d, nested.id, "State", "Active");
  const text = () =>
    d.nodes.find((n) => n.componentOwner === a && n.name === "Label")!;
  expect(text().text).toBe("保存修改");
  expect(
    d.nodes.find((n) => n.componentOwner === a && n.name === "Right icon")
      ?.visible,
  ).toBe(false);
  expect(
    d.nodes.find((n) => n.componentOwner === b && n.name === "Label")?.text,
  ).toBe("继续");
  const slot = d.nodes.find((n) => n.componentOwner === a && n.componentSlot)!;
  const pos = absolute(d, slot),
    h = new History();
  h.push(d);
  const inserted = insertAsset(d, "ld", p, { x: pos.x + 12, y: pos.y + 12 });
  const restored = h.undo(inserted.doc);
  expect(restored).toEqual(d);
  d = h.redo(restored);
  expect(d).toEqual(inserted.doc);
  d = JSON.parse(JSON.stringify(d));
  synchronizeInstances(d);
  validateDocument(d);
  expect(text().text).toBe("保存修改");
  expect(
    d.nodes.some((n) => n.componentId === "ld" && n.parentId === slot.id),
  ).toBe(true);
  if (process.env.COMPONENT_WORKFLOW_PATH)
    writeFileSync(process.env.COMPONENT_WORKFLOW_PATH, JSON.stringify(d));
});
it("runs inherited nested click transitions without mutating sibling Card or saved editor state", () => {
  const { d, a, b } = workflow(),
    before = JSON.stringify(d);
  const nested = d.nodes.find(
    (n) => n.componentOwner === a && n.type === "instance" && n.id !== a,
  )!;
  const other = d.nodes.find(
    (n) => n.componentOwner === b && n.type === "instance" && n.id !== b,
  )!;
  let state = transitionPrototype(
    d,
    { frameId: "screen", overlays: [], history: [] },
    nested.interactions![0].actions,
    {},
    nested.id,
  );
  expect(
    state.runtime!.nodes.find((n) => n.id === nested.id)?.componentId,
  ).toBe("sa");
  expect(state.runtime!.nodes.find((n) => n.id === other.id)?.componentId).toBe(
    "sd",
  );
  const active = state.runtime!.nodes.find((n) => n.id === nested.id)!;
  state = transitionPrototype(
    d,
    state,
    active.interactions![0].actions,
    {},
    active.id,
  );
  expect(
    state.runtime!.nodes.find((n) => n.id === nested.id)?.componentId,
  ).toBe("sd");
  expect(JSON.stringify(d)).toBe(before);
  validateDocument(state.runtime!);
});
