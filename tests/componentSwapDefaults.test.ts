import { it, expect } from "vitest";
import { emptyDocument, makeNode, execute } from "../src/core";
import {
  createComponentInstance,
  swapComponentInstance,
} from "../src/components";
it("preserves text but drops style overrides when the destination uses different defaults", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  for (const [id, color, text] of [
    ["a", "#000000", "A"],
    ["b", "#ffffff", "B"],
  ])
    d.nodes.push(
      makeNode("component", p, { id }),
      makeNode("text", p, {
        id: id + "label",
        parentId: id,
        name: "Label",
        text,
        fill: color,
        fontSize: 16,
      }),
    );
  d.componentSets = [
    {
      id: "states",
      name: "Button",
      axes: { State: ["A", "B"] },
      variants: [
        { componentId: "a", values: { State: "A" } },
        { componentId: "b", values: { State: "B" } },
      ],
    },
  ];
  const instance = createComponentInstance(d, "a", p, 300, 0);
  const text = instance.doc.nodes.find(
    (n) => n.componentOwner === instance.id && n.type === "text",
  )!;
  const edited = execute(instance.doc, {
    type: "update",
    ids: [text.id],
    patch: { text: "User", fill: "#ff0000", fontSize: 24 },
  }).doc;
  const swapped = swapComponentInstance(edited, instance.id, "b");
  const result = swapped.nodes.find(
    (n) => n.componentOwner === instance.id && n.type === "text",
  )!;
  expect(result.text).toBe("User");
  expect(result.fill).toBe("#ffffff");
  expect(result.fontSize).toBe(24);
});
it("does not map overrides to a differently named layer", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("component", p, { id: "a" }),
    makeNode("text", p, { id: "one", parentId: "a", name: "Label", text: "A" }),
    makeNode("component", p, { id: "b" }),
    makeNode("text", p, { id: "two", parentId: "b", name: "Other", text: "B" }),
  );
  const instance = createComponentInstance(d, "a", p, 0, 0);
  const text = instance.doc.nodes.find(
    (n) => n.componentOwner === instance.id && n.type === "text",
  )!;
  const edited = execute(instance.doc, {
    type: "update",
    ids: [text.id],
    patch: { text: "User" },
  }).doc;
  expect(
    swapComponentInstance(edited, instance.id, "b").nodes.find(
      (n) => n.componentOwner === instance.id && n.type === "text",
    )!.text,
  ).toBe("B");
});
