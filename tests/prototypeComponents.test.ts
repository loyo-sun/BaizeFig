import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  ancestors,
} from "../src/core";
import {
  createComponentInstance,
  changePrototypeComponent,
} from "../src/components";
import { transitionPrototype } from "../src/prototype";
function fixture() {
  let d = emptyDocument();
  const p = d.pages[0].id;
  d.name = "组件状态原型验收";
  d.nodes = [
    makeNode("frame", p, {
      id: "screen",
      name: "组件状态演示",
      width: 600,
      height: 400,
      fill: "#f5f5f5",
    }),
    makeNode("component", p, {
      id: "default",
      name: "Button",
      x: 2000,
      width: 220,
      height: 80,
      fill: "#0d99ff",
      interactions: [
        {
          trigger: "hover",
          actions: [{ type: "changeTo", componentId: "active" }],
        },
      ],
    }),
    makeNode("text", p, {
      id: "default-label",
      parentId: "default",
      name: "Label",
      x: 20,
      y: 25,
      width: 180,
      height: 40,
      text: "默认状态",
      fontSize: 20,
      fill: "#ffffff",
    }),
    makeNode("component", p, {
      id: "active",
      name: "Button active",
      x: 2500,
      width: 220,
      height: 80,
      fill: "#35a968",
      interactions: [
        {
          trigger: "click",
          actions: [{ type: "changeTo", componentId: "default" }],
        },
      ],
    }),
    makeNode("text", p, {
      id: "active-label",
      parentId: "active",
      name: "Label",
      x: 20,
      y: 25,
      width: 180,
      height: 40,
      text: "悬停状态",
      fontSize: 20,
      fill: "#ffffff",
    }),
  ];
  const a = createComponentInstance(d, "default", p, 50, 80);
  d = a.doc;
  d.nodes.find((n) => n.id === a.id)!.parentId = "screen";
  d.nodes.find((n) => n.id === a.id)!.name = "交互按钮";
  const b = createComponentInstance(d, "default", p, 320, 80);
  d = b.doc;
  d.nodes.find((n) => n.id === b.id)!.parentId = "screen";
  d.nodes.find((n) => n.id === b.id)!.name = "另一个实例";
  return { d, a: a.id, b: b.id };
}
it("changes only the active instance subtree, preserving its identity and placement", () => {
  const { d, a, b } = fixture(),
    before = JSON.stringify(d),
    s = transitionPrototype(
      d,
      { frameId: "screen", overlays: [], history: [] },
      [{ type: "changeTo", componentId: "active" }],
      {},
      a,
    );
  expect(s.runtime!.nodes.find((n) => n.id === a)).toMatchObject({
    componentId: "active",
    fill: "#35a968",
    x: 50,
    y: 80,
    parentId: "screen",
  });
  expect(s.runtime!.nodes.find((n) => n.id === b)).toMatchObject({
    componentId: "default",
    fill: "#0d99ff",
  });
  expect(s.frameId).toBe("screen");
  expect(s.history).toEqual([]);
  expect(JSON.stringify(d)).toBe(before);
  validateDocument(d);
  validateDocument(s.runtime!);
  if (process.env.COMPONENT_FIXTURE_PATH)
    writeFileSync(process.env.COMPONENT_FIXTURE_PATH, JSON.stringify(d));
});
it("resolves child hotspots to their own instance and preserves corresponding override text and node identity across variants", () => {
  let { d, a } = fixture();
  const label = d.nodes.find((n) => n.parentId === a && n.type === "text")!;
  d = execute(d, {
    type: "update",
    ids: [label.id],
    patch: { text: "本地文案" },
  }).doc;
  let s = transitionPrototype(
    d,
    { frameId: "screen", overlays: [], history: [] },
    [{ type: "changeTo", componentId: "active" }],
    {},
    label.id,
  );
  expect(s.runtime!.nodes.find((n) => n.id === label.id)).toMatchObject({
    text: "本地文案",
    parentId: a,
  });
  s = transitionPrototype(
    d,
    s,
    [{ type: "changeTo", componentId: "default" }],
    {},
    label.id,
  );
  expect(s.runtime!.nodes.find((n) => n.id === label.id)!.text).toBe(
    "本地文案",
  );
});
it("switches nested instances without rebuilding their outer instance or sibling", () => {
  const { d, a, b } = fixture(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("instance", p, {
      id: "outer",
      parentId: "screen",
      componentId: "default",
      width: 500,
      height: 200,
    }),
  );
  d.nodes.find((n) => n.id === a)!.parentId = "outer";
  d.nodes.find((n) => n.id === a)!.componentOwner = "outer";
  const next = changePrototypeComponent(d, a, "active");
  expect(next.nodes.find((n) => n.id === a)).toMatchObject({
    componentId: "active",
    parentId: "outer",
  });
  expect(next.nodes.find((n) => n.id === "outer")).toEqual(
    d.nodes.find((n) => n.id === "outer"),
  );
  expect(next.nodes.find((n) => n.id === b)).toEqual(
    d.nodes.find((n) => n.id === b),
  );
});
it("retains new variant interactions and restores the previous component on a subsequent action", () => {
  const { d, a } = fixture();
  let s = transitionPrototype(
    d,
    { frameId: "screen", overlays: [], history: [] },
    [{ type: "changeTo", componentId: "active" }],
    {},
    a,
  );
  const n = s.runtime!.nodes.find((n) => n.id === a)!;
  expect(n.interactions![0].trigger).toBe("click");
  s = transitionPrototype(d, s, n.interactions![0].actions, {}, a);
  expect(s.runtime!.nodes.find((n) => n.id === a)!.componentId).toBe("default");
  expect(
    ancestors(
      s.runtime!,
      s.runtime!.nodes.find((n) => n.id === a)!,
    )[0].id,
  ).toBe("screen");
});
it("round-trips references, rejects missing definitions and ignores change-to outside an instance", () => {
  const { d } = fixture();
  validateDocument(JSON.parse(JSON.stringify(d)));
  expect(() => changePrototypeComponent(d, "missing", "active")).toThrow(
    "Missing main component",
  );
  const s = transitionPrototype(
    d,
    { frameId: "screen", overlays: [], history: [] },
    [{ type: "changeTo", componentId: "active" }],
    {},
    "screen",
  );
  expect(s.runtime).toBeUndefined();
  d.nodes[0].interactions = [
    { trigger: "click", actions: [{ type: "changeTo", componentId: "" }] },
  ];
  expect(() => validateDocument(d)).toThrow("Invalid prototype component");
});
it("keeps linked duplicate state references and retains deleted definitions for restoration", () => {
  const { d } = fixture(),
    copy = execute(d, { type: "duplicate", ids: ["default", "active"] }).doc;
  const copied = copy.nodes.find(
      (n) => n.id !== "default" && n.name === "Button copy",
    )!,
    active = copy.nodes.find(
      (n) => n.id !== "active" && n.name === "Button active copy",
    )!;
  expect(copied.interactions![0].actions[0]).toEqual({
    type: "changeTo",
    componentId: "active",
  });
  expect(active.type).toBe("instance");
  const independent = execute(d, {
    type: "duplicate",
    ids: ["default", "active"],
    independentMain: true,
  }).doc;
  const newActive = independent.nodes.find(
    (n) => n.id !== "active" && n.name === "Button active copy",
  )!;
  expect(
    independent.nodes.find(
      (n) => n.id !== "default" && n.name === "Button copy",
    )!.interactions![0].actions[0],
  ).toEqual({ type: "changeTo", componentId: newActive.id });
  const deleted = execute(d, { type: "delete", ids: ["active"] }).doc;
  expect(deleted.nodes.find((n) => n.id === "default")!.interactions).toEqual(
    d.nodes.find((n) => n.id === "default")!.interactions,
  );
  expect(
    deleted.componentLibrary?.find((c) => c.sourceId === "active")?.deleted,
  ).toBe(true);
  validateDocument(deleted);
});
