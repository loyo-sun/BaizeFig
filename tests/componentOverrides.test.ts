import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import {
  createComponentInstance,
  componentTargets,
  setComponentProperty,
  setComponentValue,
} from "../src/components";
import {
  listComponentOverrides,
  resetComponentOverride,
  pushComponentOverrides,
  canPushComponentOverrides,
} from "../src/componentOverrides";
function fixture() {
  let doc = emptyDocument();
  const page = doc.pages[0].id;
  doc.nodes.push(
    makeNode("component", page, { id: "main" }),
    makeNode("text", page, {
      id: "label",
      parentId: "main",
      text: "Default",
      fill: "#000000",
    }),
  );
  const a = createComponentInstance(doc, "main", page, 300, 0);
  const b = createComponentInstance(a.doc, "main", page, 600, 0);
  return { doc: b.doc, a: a.id, b: b.id };
}
it("resets a single field without clearing another override and pushes to other instances", () => {
  let { doc, a, b } = fixture();
  const child = doc.nodes.find(
    (n) => n.componentOwner === a && n.type === "text",
  )!;
  doc = execute(doc, {
    type: "update",
    ids: [child.id],
    patch: { text: "Custom", fill: "#ff0000" },
  }).doc;
  expect(listComponentOverrides(doc, a).map((e) => e.field)).toContain("fill");
  doc = resetComponentOverride(doc, a, child.componentPath, "fill");
  expect(doc.nodes.find((n) => n.id === child.id)).toMatchObject({
    text: "Custom",
    fill: "#000000",
  });
  doc = pushComponentOverrides(doc, a);
  expect(doc.nodes.find((n) => n.id === "label")?.text).toBe("Custom");
  expect(
    doc.nodes.find((n) => n.componentOwner === b && n.type === "text")?.text,
  ).toBe("Custom");
  expect(doc.nodes.find((n) => n.id === "main")?.x).toBe(0);
  expect(listComponentOverrides(doc, a)).toHaveLength(0);
  validateDocument(doc);
});
it("resets exposed text values and prevents pushing locked mains", () => {
  let { doc, a } = fixture();
  const path = componentTargets(doc, "main").find(
    (t) => t.node.id === "label",
  )!.path;
  doc = setComponentProperty(doc, "main", {
    id: "caption",
    name: "Caption",
    type: "text",
    targetPath: path,
    defaultValue: "Default",
  });
  doc = setComponentValue(doc, a, "caption", "Custom");
  doc = resetComponentOverride(doc, a, path, "text");
  expect(
    doc.nodes.find((n) => n.componentOwner === a && n.type === "text")?.text,
  ).toBe("Default");
  doc.nodes.find((n) => n.id === "main")!.locked = true;
  expect(canPushComponentOverrides(doc, a)).toBe(false);
  expect(() => pushComponentOverrides(doc, a)).toThrow();
});
it("resets one fidelity field without clearing other style overrides", () => {
  let { doc, a } = fixture();
  const child = doc.nodes.find(
    (n) => n.componentOwner === a && n.type === "text",
  )!;
  doc = execute(doc, {
    type: "update",
    ids: [child.id],
    patch: {
      fidelity: {
        size: [child.width, child.height],
        corners: [4, 4, 4, 4],
        strokeOpacity: 0.5,
      },
    },
  }).doc;
  expect(
    listComponentOverrides(doc, a).some((e) => e.field === "fidelity.corners"),
  ).toBe(true);
  doc = resetComponentOverride(doc, a, child.componentPath, "fidelity.corners");
  expect(
    doc.nodes.find((n) => n.id === child.id)?.fidelity?.corners,
  ).toBeUndefined();
  expect(
    doc.nodes.find((n) => n.id === child.id)?.fidelity?.strokeOpacity,
  ).toBe(0.5);
});
