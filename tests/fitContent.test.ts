import { expect, it } from "vitest";
import { emptyDocument, makeNode, execute, worldTransform } from "../src/core";
import { createComponentInstance } from "../src/components";
import { canFitContent, fitContent } from "../src/fitContent";

it("fits an enlarged component child without scaling it again, and updates linked instances", () => {
  const original = emptyDocument(),
    page = original.pages[0].id;
  original.nodes = [
    makeNode("component", page, { id: "main", width: 169, height: 45 }),
    makeNode("rectangle", page, {
      id: "child",
      parentId: "main",
      x: 0,
      y: 0,
      width: 169,
      height: 45,
      constraints: { horizontal: "scale", vertical: "scale" },
    }),
  ];
  const instance = createComponentInstance(original, "main", page, 300, 0);
  const enlarged = execute(instance.doc, {
    type: "update",
    ids: ["child"],
    patch: { height: 141 },
  }).doc;
  expect(enlarged.nodes.find((n) => n.id === "main")!.height).toBe(45);
  const fitted = fitContent(enlarged, "main");
  for (const node of fitted.nodes) expect(node.height).toBe(141);
  expect(
    fitted.nodes.find((n) => n.id === "child")!.constraints?.vertical,
  ).toBe("scale");
  expect(enlarged.nodes.find((n) => n.id === "main")!.height).toBe(45);
});

it("fits rotated children and preserves world positions including hidden children", () => {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes = [
    makeNode("frame", page, { id: "frame", x: 200, y: 100, rotation: 30 }),
    makeNode("rectangle", page, {
      id: "a",
      parentId: "frame",
      x: -30,
      y: -20,
      width: 100,
      height: 50,
      rotation: 45,
    }),
    makeNode("rectangle", page, {
      id: "hidden",
      parentId: "frame",
      x: 1000,
      y: 1000,
      visible: false,
    }),
  ];
  const next = fitContent(doc, "frame");
  expect(next.nodes[0].width).toBeCloseTo(150 / Math.sqrt(2));
  expect(next.nodes[0].height).toBeCloseTo(150 / Math.sqrt(2));
  for (const n of doc.nodes.slice(1))
    worldTransform(doc, n).forEach((v, i) =>
      expect(
        worldTransform(
          next,
          next.nodes.find((a) => a.id === n.id)!,
        )[i],
      ).toBeCloseTo(v),
    );
});

it("does not offer fitting for instances, locked, empty or auto-layout containers", () => {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  const main = makeNode("component", page, { id: "main" });
  doc.nodes = [main];
  expect(canFitContent(doc, main)).toBe(false);
  doc.nodes.push(makeNode("rectangle", page, { parentId: main.id }));
  expect(canFitContent(doc, main)).toBe(true);
  for (const patch of [
    { locked: true },
    { layout: "horizontal" as const },
    { type: "instance" as const },
    { componentOwner: "owner" },
  ])
    expect(canFitContent(doc, { ...main, ...patch })).toBe(false);
});
