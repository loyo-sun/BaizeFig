import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  worldTransform,
  validateDocument,
  History,
} from "../src/core";
function sample() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("frame", p, { id: "a", x: 100, y: 40, rotation: 30 }),
    makeNode("frame", p, {
      id: "b",
      x: 500,
      y: 200,
      rotation: -20,
      fidelity: { size: [160, 100], linear: [-1, 0.2, 0, 1] },
    }),
    makeNode("rectangle", p, { id: "child", parentId: "a", x: 20, y: 10 }),
    makeNode("group", p, { id: "g", x: 50 }),
    makeNode("ellipse", p, { id: "nested", parentId: "g", x: 3 }),
  );
  return d;
}
it("keeps world transforms when reparenting into and out of a transformed container", () => {
  const d = sample(),
    before = worldTransform(d, d.nodes[2]),
    h = new History();
  h.push(d);
  const n = execute(d, { type: "reparent", ids: ["child"], parentId: "b" }).doc;
  worldTransform(
    n,
    n.nodes.find((n) => n.id === "child")!,
  ).forEach((x, i) => expect(x).toBeCloseTo(before[i]));
  const out = execute(n, {
    type: "reparent",
    ids: ["child"],
    parentId: null,
  }).doc;
  worldTransform(
    out,
    out.nodes.find((n) => n.id === "child")!,
  ).forEach((x, i) => expect(x).toBeCloseTo(before[i]));
  expect(h.undo(n)).toEqual(d);
  validateDocument(out);
});
it("moves multiple roots with their subtrees and inserts them in stable stacking order", () => {
  const d = sample(),
    m = worldTransform(d, d.nodes[4]);
  const n = execute(d, {
    type: "reparent",
    ids: ["g", "nested", "child"],
    parentId: null,
    targetId: "b",
    after: false,
  }).doc;
  expect(n.nodes.map((n) => n.id)).toEqual(["a", "child", "g", "nested", "b"]);
  expect(n.nodes.find((n) => n.id === "nested")!.parentId).toBe("g");
  expect(
    worldTransform(
      n,
      n.nodes.find((n) => n.id === "nested")!,
    ),
  ).toEqual(m);
  validateDocument(n);
});
it("rejects cycles, locked targets, instance structure edits and cross-page insertion without mutating input", () => {
  const d = sample(),
    before = JSON.stringify(d);
  expect(() =>
    execute(d, { type: "reparent", ids: ["g"], parentId: "nested" }),
  ).toThrow();
  d.nodes[4].type = "group";
  expect(() =>
    execute(d, { type: "reparent", ids: ["g"], parentId: "nested" }),
  ).toThrow(/descendants/);
  d.nodes[4].type = "ellipse";
  d.nodes[1].locked = true;
  expect(() =>
    execute(d, { type: "reparent", ids: ["child"], parentId: "b" }),
  ).toThrow();
  d.nodes[1].locked = false;
  d.nodes[1].type = "instance";
  expect(() =>
    execute(d, { type: "reparent", ids: ["child"], parentId: "b" }),
  ).toThrow(/Detach/);
  d.nodes[1].type = "frame";
  d.nodes[1].pageId = "other";
  expect(() =>
    execute(d, { type: "reparent", ids: ["child"], parentId: "b" }),
  ).toThrow(/same page/);
  d.nodes[1].pageId = d.pages[0].id;
  expect(JSON.stringify(d)).toBe(before);
});
it("reflows a managed target layout and preserves identities and references", () => {
  const d = sample();
  d.nodes[1].rotation = 0;
  delete d.nodes[1].fidelity;
  d.nodes[1].layout = "horizontal";
  d.nodes[1].gap = 10;
  d.nodes[1].padding = 12;
  const n = execute(d, {
    type: "reparent",
    ids: ["g", "child"],
    parentId: "b",
  }).doc;
  const children = n.nodes.filter((n) => n.parentId === "b");
  expect(children).toHaveLength(2);
  expect(children[0].x).toBe(12);
  expect(children[1].x).toBeCloseTo(children[0].x + children[0].width + 10);
  expect(n.nodes.find((n) => n.id === "nested")!.parentId).toBe("g");
  validateDocument(n);
});
