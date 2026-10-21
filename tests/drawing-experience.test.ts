import { describe, it, expect } from "vitest";
import { drawingBox, commonNumber } from "../src/drawingExperience";
import { History, emptyDocument, makeNode } from "../src/core";

describe("drawing reference geometry", () => {
  const start = { x: 182, y: 280 };
  it("preserves ordinary, constrained, reverse and centered drags", () => {
    expect(drawingBox(start, { x: 382, y: 400 }, false, false)).toEqual({
      x: 182,
      y: 280,
      width: 200,
      height: 120,
    });
    expect(drawingBox(start, { x: 382, y: 400 }, true, false)).toEqual({
      x: 182,
      y: 280,
      width: 200,
      height: 200,
    });
    expect(drawingBox(start, { x: -18, y: 160 }, false, false)).toEqual({
      x: -18,
      y: 160,
      width: 200,
      height: 120,
    });
    expect(drawingBox(start, { x: 382, y: 400 }, false, true)).toEqual({
      x: -18,
      y: 160,
      width: 400,
      height: 240,
    });
    expect(drawingBox(start, { x: -18, y: 160 }, true, true)).toEqual({
      x: -18,
      y: 80,
      width: 400,
      height: 400,
    });
  });
  it("distinguishes common and mixed values including zero", () => {
    expect(commonNumber([{ x: 0 }, { x: 0 }], (n) => n.x)).toBe(0);
    expect(commonNumber([{ x: 200 }, { x: 120 }], (n) => n.x)).toBeNull();
  });
});
it("restores selection across update, delete, undo and redo without serializing UI into files", () => {
  const before = emptyDocument();
  const node = makeNode("rectangle", before.pages[0].id, { width: 200 });
  before.nodes.push(node);
  const history = new History();
  history.push(before, [node.id]);
  const after = structuredClone(before);
  after.nodes[0].width = 240;
  expect(history.undo(after, [node.id]).nodes[0].width).toBe(200);
  expect(history.selection).toEqual([node.id]);
  expect(history.redo(before, [node.id]).nodes[0].width).toBe(240);
  expect(history.selection).toEqual([node.id]);
  history.push(after, [node.id]);
  const removed = { ...after, nodes: [] };
  expect(history.undo(removed, []).nodes).toHaveLength(1);
  expect(history.selection).toEqual([node.id]);
  expect(history.redo(after, [node.id]).nodes).toHaveLength(0);
  expect(history.selection).toEqual([]);
  expect(Object.keys(before)).not.toContain("selection");
});
