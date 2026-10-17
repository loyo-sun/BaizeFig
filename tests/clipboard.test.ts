import { createComponentInstance } from "../src/components";
import { expect, it } from "vitest";
import {
  execute,
  emptyDocument,
  makeNode,
  bounds,
  History,
  validateDocument,
  worldTransform,
} from "../src/core";
import { pasteNodes } from "../src/clipboard";
function source(page: string) {
  const root = makeNode("frame", page, {
      id: "source",
      x: 10,
      y: 20,
      width: 100,
      height: 100,
    }),
    child = makeNode("rectangle", page, {
      id: "child",
      parentId: root.id,
      x: 5,
      y: 8,
      targetId: root.id,
      interactions: [
        {
          trigger: "click",
          actions: [{ type: "navigate", targetId: root.id }],
        },
      ],
    });
  return { nodes: [root, child] };
}
it("copies nested geometry and internal prototype references with fresh IDs on repeated paste", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    clip = source(p);
  let r = pasteNodes(d, p, clip, []);
  const root = r.doc.nodes.find((n) => r.selection.includes(n.id))!,
    child = r.doc.nodes.find((n) => n.parentId === root.id)!;
  expect(root.x).toBe(30);
  expect(child.x).toBe(5);
  expect(child.targetId).toBe(root.id);
  expect(child.interactions?.[0].actions[0]).toMatchObject({
    targetId: root.id,
  });
  r = pasteNodes(r.doc, p, clip, []);
  expect(new Set(r.doc.nodes.map((n) => n.id)).size).toBe(4);
  validateDocument(r.doc);
});
it("overlays a selection in a rotated parent, preserving destination and world center", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    parent = makeNode("frame", p, {
      id: "parent",
      rotation: 30,
      x: 200,
      y: 80,
      width: 500,
      height: 500,
    }),
    target = makeNode("rectangle", p, {
      parentId: parent.id,
      width: 200,
      height: 150,
      x: 50,
      y: 50,
    });
  d.nodes.push(parent, target);
  const r = pasteNodes(d, p, source(p), [target.id], "over");
  expect(r.doc.nodes.some((n) => n.id === target.id)).toBe(true);
  const pasted = r.doc.nodes.find((n) => r.selection.includes(n.id))!;
  expect(pasted.parentId).toBe(parent.id);
  const a = bounds(d, [target]),
    b = bounds(r.doc, [pasted]);
  expect(b.x + b.width / 2).toBeCloseTo(a.x + a.width / 2);
  expect(b.y + b.height / 2).toBeCloseTo(a.y + a.height / 2);
  validateDocument(r.doc);
});
it("replaces each selected sibling as one undoable transaction, redirects inbound links and preserves order", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    a = makeNode("frame", p, { id: "a", x: 300 }),
    b = makeNode("frame", p, { id: "b", x: 600 }),
    link = makeNode("rectangle", p, { targetId: "a" });
  d.nodes.push(a, b, link);
  const h = new History();
  h.push(d);
  const r = pasteNodes(d, p, source(p), ["a", "b"], "replace");
  expect(r.selection).toHaveLength(2);
  expect(r.doc.nodes.some((n) => ["a", "b"].includes(n.id))).toBe(false);
  expect(r.doc.nodes.find((n) => n.id === link.id)?.targetId).toBe(
    r.selection[0],
  );
  expect(r.doc.nodes[0].id).toBe(r.selection[0]);
  expect(r.doc.nodes[2].id).toBe(r.selection[1]);
  expect(h.undo(r.doc)).toEqual(d);
  expect(h.redo(d)).toEqual(r.doc);
  validateDocument(r.doc);
});
it("keeps a copied instance linked in-document but detaches unrelated references across documents", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    main = makeNode("component", p, { id: "main" });
  d.nodes.push(main);
  const instance = makeNode("instance", p, {
      id: "inst",
      componentId: "main",
      componentOwner: "inst",
    }),
    clip = { nodes: [instance], documentId: d.id };
  const r = pasteNodes(d, p, clip, []);
  const pasted = r.doc.nodes.find((n) => r.selection.includes(n.id))!;
  expect(pasted.componentId).toBe("main");
  expect(pasted.componentOwner).toBe(pasted.id);
  const other = emptyDocument();
  const detached = pasteNodes(other, other.pages[0].id, clip, []);
  expect(detached.doc.nodes[0].type).toBe("group");
  expect(detached.doc.nodes[0].componentId).toBeUndefined();
  expect(detached.doc.nodes[0].componentOwner).toBeUndefined();
  validateDocument(detached.doc);
});
it("does not alter locked destinations, and rejects malformed/cyclic clipboard data atomically", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    n = makeNode("rectangle", p, { locked: true });
  d.nodes.push(n);
  expect(() => pasteNodes(d, p, source(p), [n.id], "replace")).toThrow();
  const invalid = source(p);
  invalid.nodes[0].parentId = "child";
  expect(() => pasteNodes(d, p, invalid, [])).toThrow();
  expect(d.nodes).toEqual([n]);
});

it("retains overrides when the clipboard contains a main component and its instance", () => {
  let d = emptyDocument();
  const p = d.pages[0].id;
  d.nodes.push(
    makeNode("component", p, { id: "main" }),
    makeNode("text", p, { id: "label", parentId: "main", text: "Base" }),
  );
  const created = createComponentInstance(d, "main", p, 400, 0);
  d = created.doc;
  const member = d.nodes.find(
    (n) => n.componentOwner === created.id && n.type === "text",
  )!;
  d = execute(d, {
    type: "update",
    ids: [member.id],
    patch: { text: "Override" },
  }).doc;
  const r = pasteNodes(
    d,
    p,
    { nodes: structuredClone(d.nodes), documentId: d.id },
    [],
  );
  const instance = r.doc.nodes.find(
    (n) => n.id === r.selection[1] && n.type === "instance",
  )!;
  expect(
    r.doc.nodes.find(
      (n) => n.componentOwner === instance.id && n.type === "text",
    )?.text,
  ).toBe("Override");
  validateDocument(r.doc);
});

it("keeps embedded image bytes and the source document unchanged on copy", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    clip = source(p),
    image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
  clip.nodes[1].type = "image";
  clip.nodes[1].image = image;
  const before = structuredClone(clip);
  const r = pasteNodes(d, p, clip, []);
  expect(r.doc.nodes.find((n) => n.type === "image")?.image).toBe(image);
  expect(clip).toEqual(before);
  expect(d.nodes).toEqual([]);
  validateDocument(r.doc);
});
