import { describe, it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  absolute,
  validateDocument,
  History,
} from "../src/core";
function fixture() {
  const d = emptyDocument(),
    page = d.pages[0].id;
  d.nodes = [
    makeNode("rectangle", page, {
      id: "a",
      x: 20,
      y: 30,
      width: 100,
      height: 60,
    }),
    makeNode("ellipse", page, {
      id: "b",
      x: 160,
      y: 80,
      width: 80,
      height: 80,
    }),
  ];
  return d;
}
describe("document command invariants", () => {
  it("resolves a color variable and detaches it on manual fill edits", () => {
    const d = fixture();
    d.variables = [{ id: "brand", name: "Brand", value: "#0d99ff" }];
    const bound = execute(d, {
      type: "update",
      ids: ["a"],
      patch: { variableId: "brand" },
    }).doc;
    expect(bound.nodes[0].fill).toBe("#0d99ff");
    const detached = execute(bound, {
      type: "update",
      ids: ["a"],
      patch: { fill: "#112233" },
    }).doc;
    expect(detached.nodes[0].variableId).toBeUndefined();
    expect(detached.nodes[0].fill).toBe("#112233");
    expect(() =>
      execute(d, {
        type: "update",
        ids: ["a"],
        patch: { variableId: "missing" },
      }),
    ).toThrow("Invalid color variable");
  });
  it("groups and ungroups without moving children in world coordinates", () => {
    const d = fixture();
    const grouped = execute(d, { type: "group", ids: ["a", "b"] });
    expect(
      absolute(
        grouped.doc,
        grouped.doc.nodes.find((n) => n.id === "a")!,
      ),
    ).toEqual({ x: 20, y: 30 });
    const restored = execute(grouped.doc, {
      type: "ungroup",
      ids: grouped.selection!,
    }).doc;
    expect(restored.nodes.map((n) => [n.id, n.x, n.y])).toEqual(
      d.nodes.map((n) => [n.id, n.x, n.y]),
    );
    expect(d.nodes).toHaveLength(2);
  });
  it("duplicates a nested subtree with fresh identities and remapped parents", () => {
    const d = execute(fixture(), { type: "group", ids: ["a", "b"] });
    const copy = execute(d.doc, { type: "duplicate", ids: d.selection! });
    expect(copy.doc.nodes).toHaveLength(6);
    const parent = copy.selection![0];
    expect(copy.doc.nodes.filter((n) => n.parentId === parent)).toHaveLength(2);
    expect(new Set(copy.doc.nodes.map((n) => n.id)).size).toBe(6);
    validateDocument(copy.doc);
  });
  it("deletes descendants and clears prototype references", () => {
    let d = fixture();
    const f = makeNode("frame", d.pages[0].id, { id: "frame" });
    d.nodes.push(f);
    d.nodes[0].parentId = f.id;
    d.nodes[1].targetId = f.id;
    d = execute(d, { type: "delete", ids: [f.id] }).doc;
    expect(d.nodes.map((n) => n.id)).toEqual(["b"]);
    expect(d.nodes[0].targetId).toBeUndefined();
  });
  it("rejects corrupt imported trees before changing the original", () => {
    const d = fixture();
    const corrupt = structuredClone(d);
    corrupt.nodes[0].parentId = "unknown";
    expect(() => validateDocument(corrupt)).toThrow("Invalid parent");
    const grouped = execute(d, { type: "group", ids: ["a", "b"] }).doc;
    const group = grouped.nodes.find((n) => n.type === "group")!;
    group.parentId = group.id;
    expect(() => validateDocument(grouped)).toThrow("Cyclic");
    expect(d.nodes[0].parentId).toBeNull();
  });
  it("protects descendants of locked ancestors", () => {
    const r = execute(fixture(), { type: "group", ids: ["a", "b"] });
    const parent = r.doc.nodes.find((n) => n.id === r.selection![0])!;
    parent.locked = true;
    const changed = execute(r.doc, {
      type: "update",
      ids: ["a"],
      patch: { x: 999 },
    }).doc;
    expect(changed.nodes.find((n) => n.id === "a")!.x).toBe(
      r.doc.nodes.find((n) => n.id === "a")!.x,
    );
    expect(
      execute(changed, { type: "delete", ids: ["a"] }).doc.nodes,
    ).toHaveLength(3);
  });
  it("creates consistent auto-layout positions and frame size", () => {
    const r = execute(fixture(), {
      type: "group",
      ids: ["a", "b"],
      kind: "frame",
    });
    const next = execute(r.doc, {
      type: "layout",
      id: r.selection![0],
      direction: "horizontal",
      gap: 10,
      padding: 20,
    }).doc;
    expect(next.nodes.find((n) => n.id === "a")!.x).toBe(20);
    expect(next.nodes.find((n) => n.id === "b")!.x).toBe(130);
    const frame = next.nodes.find((n) => n.id === r.selection![0])!;
    expect(frame.width).toBe(230);
    expect(frame.height).toBe(120);
  });
  it("round-trips JSON and undo/redo preserves complete document state", () => {
    const d = fixture(),
      history = new History();
    validateDocument(JSON.parse(JSON.stringify(d)));
    history.push(d);
    const edited = execute(d, {
      type: "update",
      ids: ["a"],
      patch: { fill: "#ff0000" },
    }).doc;
    expect(history.undo(edited)).toEqual(d);
    expect(history.redo(d)).toEqual(edited);
    history.undo(edited);
    history.push(d);
    expect(history.future).toHaveLength(0);
  });
  it("aligns objects with different parents in world space", () => {
    const d = fixture();
    const frame = makeNode("frame", d.pages[0].id, { id: "f", x: 200, y: 100 });
    d.nodes.push(frame);
    d.nodes[1].parentId = "f";
    const next = execute(d, {
      type: "align",
      ids: ["a", "b"],
      axis: "left",
    }).doc;
    expect(
      absolute(
        next,
        next.nodes.find((n) => n.id === "a")!,
      ).x,
    ).toBe(
      absolute(
        next,
        next.nodes.find((n) => n.id === "b")!,
      ).x,
    );
  });
  it("rejects executable external image and style payloads", () => {
    const d = fixture();
    const n = makeNode("image", d.pages[0].id, {
      image: "https://example.com/tracker.png",
    });
    expect(() => execute(d, { type: "create", nodes: [n] })).toThrow(
      "Invalid image",
    );
    expect(() =>
      execute(d, {
        type: "update",
        ids: ["a"],
        patch: { fill: "url(https://example.com)" },
      }),
    ).toThrow("Only hex");
    expect(d.nodes[0].fill).not.toBe("url(https://example.com)");
  });
});
