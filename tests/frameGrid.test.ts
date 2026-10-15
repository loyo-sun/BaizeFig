import { expect, it } from "vitest";
import { frameGridRects } from "../src/FrameGrid";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
it("fits columns and rows inside margins and gutters without modifying layout geometry", () => {
  const d = emptyDocument(),
    n = makeNode("frame", d.pages[0].id, {
      width: 100,
      height: 200,
      frameGrid: {
        axis: "columns",
        count: 4,
        gap: 5,
        margin: 10,
        visible: true,
      },
    });
  d.nodes.push(n);
  const cols = frameGridRects(n);
  expect(cols).toHaveLength(4);
  expect(cols[0]).toEqual({ x: 10, y: 0, width: 16.25, height: 200 });
  expect(cols.at(-1)!.x + cols.at(-1)!.width).toBe(90);
  const rows = frameGridRects({
    ...n,
    frameGrid: { ...n.frameGrid!, axis: "rows" },
  });
  expect(rows.at(-1)!.y + rows.at(-1)!.height).toBe(190);
  expect(n.width).toBe(100);
  expect(
    frameGridRects({ ...n, frameGrid: { ...n.frameGrid!, visible: false } }),
  ).toEqual([]);
});
it("validates grid edits and preserves them in native files", () => {
  const d = emptyDocument(),
    n = makeNode("frame", d.pages[0].id);
  d.nodes.push(n);
  const next = execute(d, {
    type: "update",
    ids: [n.id],
    patch: {
      frameGrid: { axis: "rows", count: 3, gap: 10, margin: 5, visible: true },
    },
  }).doc;
  validateDocument(JSON.parse(JSON.stringify(next)));
  expect(next.nodes[0].frameGrid?.count).toBe(3);
  expect(() =>
    execute(d, {
      type: "update",
      ids: [n.id],
      patch: {
        frameGrid: { axis: "rows", count: 0, gap: 0, margin: 0, visible: true },
      },
    }),
  ).toThrow(/grid/);
});
