import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { editTypedVariable, applyTypedBindings } from "../src/typedVariables";
import { svgString } from "../src/Canvas";
import { writeFileSync } from "node:fs";
function fixture() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.name = "变量布局与圆角验收";
  d.typedVariables = [
    { id: "padding", name: "内边距", type: "number", value: 12 },
    { id: "corner", name: "圆角", type: "number", value: 16 },
    { id: "weight", name: "字重", type: "number", value: 600 },
    { id: "spacing", name: "字间距", type: "number", value: 2 },
    { id: "line", name: "行高", type: "number", value: 1.6 },
    { id: "paragraph", name: "段间距", type: "number", value: 20 },
  ];
  d.nodes = [
    makeNode("frame", p, {
      id: "frame",
      name: "Bound Frame",
      layout: "horizontal",
      x: 50,
      y: 50,
      width: 320,
      height: 200,
      bindings: { paddingTop: "padding", paddingLeft: "padding" },
      importedLayout: {
        padding: [0, 0, 0, 0],
        primary: "fixed",
        counter: "fixed",
        justify: "start",
        align: "start",
      },
    }),
    makeNode("text", p, {
      id: "text",
      parentId: "frame",
      width: 160,
      height: 80,
      text: "白泽 BaizeFig\n通万物、识万象",
      bindings: {
        fontWeight: "weight",
        letterSpacing: "spacing",
        lineHeight: "line",
        paragraphSpacing: "paragraph",
      },
    }),
    makeNode("rectangle", p, {
      id: "box",
      x: 400,
      y: 80,
      width: 100,
      height: 100,
      bindings: { cornerTopLeft: "corner", cornerBottomRight: "corner" },
    }),
  ];
  return execute(d, {
    type: "update",
    ids: ["frame"],
    patch: { name: "Bound Frame" },
  }).doc;
}
it("applies nested padding/corners and typography bindings to layout, renderer and native round trips", async () => {
  const d = fixture();
  expect(d.nodes[1]).toMatchObject({
    x: 12,
    y: 12,
    fontWeight: 600,
    lineHeight: 1.6,
  });
  expect(d.nodes[1].textFlow).toMatchObject({
    letterSpacing: 2,
    paragraphSpacing: 20,
  });
  expect(d.nodes[2].fidelity?.corners).toEqual([16, 0, 16, 0]);
  validateDocument(JSON.parse(JSON.stringify(d)));
  const svg = await svgString(d, d.pages[0].id);
  expect(svg).toContain('font-weight="600"');
  expect(svg).toContain('letter-spacing="2"');
  if (process.env.BAIZEFIG_ADVANCED_BINDINGS_FIXTURE)
    writeFileSync(
      "/private/tmp/baizefig-advanced-bindings.baizefig",
      JSON.stringify(d),
    );
});
it("reflows variable padding and releases only the manually edited nested field", () => {
  const d = fixture(),
    changed = editTypedVariable(d, "padding", 30);
  expect(changed.nodes[1].x).toBe(30);
  expect(changed.nodes[1].y).toBe(30);
  const edited = execute(changed, {
    type: "update",
    ids: ["frame"],
    patch: {
      importedLayout: {
        ...changed.nodes[0].importedLayout!,
        padding: [8, 0, 0, 30],
      },
    },
  }).doc;
  expect(edited.nodes[0].bindings?.paddingTop).toBeUndefined();
  expect(edited.nodes[0].bindings?.paddingLeft).toBe("padding");
  const next = editTypedVariable(edited, "padding", 40);
  expect(next.nodes[1].y).toBe(8);
  expect(next.nodes[1].x).toBe(40);
});
it("global radius edits clear corner bindings and unrelated stroke edits retain them", () => {
  const d = fixture(),
    stroke = execute(d, {
      type: "update",
      ids: ["box"],
      patch: { fidelity: { ...d.nodes[2].fidelity!, strokeOpacity: 0.5 } },
    }).doc;
  expect(stroke.nodes[2].bindings?.cornerTopLeft).toBe("corner");
  const manual = execute(stroke, {
    type: "update",
    ids: ["box"],
    patch: { radius: 5 },
  }).doc;
  expect(manual.nodes[2].fidelity?.corners).toEqual([5, 5, 5, 5]);
  expect(manual.nodes[2].bindings?.cornerTopLeft).toBeUndefined();
  expect(
    editTypedVariable(manual, "corner", 40).nodes[2].fidelity?.corners,
  ).toEqual([5, 5, 5, 5]);
});
it("releases text spacing on direct style edits and retains correct undo", () => {
  const d = fixture(),
    h = new History();
  h.push(d);
  const n = execute(d, {
    type: "update",
    ids: ["text"],
    patch: { textFlow: { ...d.nodes[1].textFlow!, letterSpacing: 4 } },
  }).doc;
  expect(n.nodes[1].bindings?.letterSpacing).toBeUndefined();
  expect(
    editTypedVariable(n, "spacing", 7).nodes[1].textFlow?.letterSpacing,
  ).toBe(4);
  expect(h.undo(n).nodes[1].textFlow?.letterSpacing).toBe(2);
});
it("validates negative layout values and numeric typography limits", () => {
  const d = fixture();
  expect(() => editTypedVariable(d, "padding", -1)).toThrow();
  expect(() => editTypedVariable(d, "line", 0)).toThrow();
  expect(() => editTypedVariable(d, "weight", 1200)).toThrow();
  const changed = editTypedVariable(d, "spacing", -1);
  expect(changed.nodes[1].textFlow?.letterSpacing).toBe(-1);
});
it("maps min/max sizing bindings and detects conflicting bounds", () => {
  const d = fixture();
  d.nodes[1].bindings = { minWidth: "padding", maxWidth: "corner" };
  applyTypedBindings(d);
  expect(d.nodes[1].layoutItem).toMatchObject({ minWidth: 12, maxWidth: 16 });
  expect(() => editTypedVariable(d, "padding", 40)).toThrow(
    "Invalid variable binding",
  );
});
it("keeps cached main-component navigation valid in the owning document context after an unrelated edit", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("component", p, {
      id: "main",
      fidelity: { size: [160, 100], sourceId: "source" },
    }),
    makeNode("rectangle", p, {
      id: "button",
      parentId: "main",
      interactions: [
        {
          trigger: "click",
          actions: [{ type: "navigate", targetId: "destination" }],
        },
      ],
    }),
    makeNode("frame", p, { id: "destination" }),
  ];
  d.componentLibrary = [
    { sourceId: "source", name: "Main", nodes: [structuredClone(d.nodes[0])] },
  ];
  const changed = execute(d, {
    type: "update",
    ids: ["main"],
    patch: { name: "Renamed" },
  }).doc;
  expect(
    changed.componentLibrary![0].nodes[1].interactions![0].actions[0],
  ).toMatchObject({ targetId: "destination" });
  validateDocument(changed);
  const invalid = structuredClone(changed);
  invalid.nodes = invalid.nodes.filter((n) => n.id !== "destination");
  expect(() => validateDocument(invalid)).toThrow("prototype target");
});
