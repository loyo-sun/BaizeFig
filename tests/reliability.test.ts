import "fake-indexeddb/auto";
import { it, expect, vi } from "vitest";
import {
  emptyDocument,
  makeNode,
  History,
  validateDocument,
} from "../src/core";
import { documentIndex } from "../src/documentIndex";
it("indexes a render snapshot once and refreshes on a new snapshot or replaced node list", () => {
  const d = emptyDocument();
  d.nodes = [
    makeNode("frame", d.pages[0].id, { id: "parent" }),
    makeNode("rectangle", d.pages[0].id, { parentId: "parent" }),
  ];
  const index = documentIndex(d);
  expect(documentIndex(d)).toBe(index);
  expect(index.children.get("parent")).toHaveLength(1);
  const copy = structuredClone(d);
  copy.nodes[1].parentId = null;
  expect(documentIndex(copy).children.get(null)).toHaveLength(2);
  d.nodes = [d.nodes[0]];
  expect(documentIndex(d).byId.size).toBe(1);
});
it("bounds undo memory estimates while keeping exact independent snapshots and redo", () => {
  const d = emptyDocument();
  d.nodes = [makeNode("text", d.pages[0].id, { text: "a".repeat(10000) })];
  const h = new History(100, 100000);
  for (let i = 0; i < 100; i++) {
    d.name = String(i);
    h.push(d);
  }
  expect(h.past.length).toBeLessThan(5);
  expect(h.estimatedBytes).toBeLessThanOrEqual(100000);
  d.nodes[0].text = "changed";
  const before = h.undo(d);
  expect(before.nodes[0].text).toHaveLength(10000);
  expect(h.redo(before).nodes[0].text).toBe("changed");
  const tiny = new History(100, 1);
  tiny.push(d);
  expect(tiny.past).toHaveLength(1);
});
it("validates deep trees iteratively and still rejects cycles, invalid parents and prototype targets", () => {
  const d = emptyDocument();
  for (let i = 0; i < 1000; i++)
    d.nodes.push(
      makeNode("frame", d.pages[0].id, {
        id: String(i),
        parentId: i ? String(i - 1) : null,
      }),
    );
  expect(() => validateDocument(d)).not.toThrow();
  d.nodes[0].parentId = "999";
  expect(() => validateDocument(d)).toThrow("Cyclic");
  d.nodes[0].parentId = null;
  d.nodes[999].parentId = "missing";
  expect(() => validateDocument(d)).toThrow("parent");
});
it("protects against separate-tab stale writes and preserves a recoverable copy", async () => {
  const a = await import("../src/storage"),
    d = emptyDocument();
  await a.save(d);
  vi.resetModules();
  const b = await import("../src/storage");
  const stale = await b.getDocument(d.id);
  await a.save({ ...d, name: "Tab A newer" });
  await expect(b.save({ ...stale, name: "Tab B unsaved" })).rejects.toThrow(
    "another tab",
  );
  expect((await a.getDocument(d.id)).name).toBe("Tab A newer");
  const copy = await b.saveRecoveryCopy({ ...stale, name: "Tab B unsaved" });
  expect(copy.id).not.toBe(d.id);
  expect((await b.getDocument(copy.id)).name).toContain("Tab B unsaved");
  const fresh = await b.getDocument(d.id);
  await b.save({ ...fresh, name: "Tab B after reload" });
  expect((await a.getDocument(d.id)).name).toBe("Tab B after reload");
});
it("a transaction failure preserves the last committed file and a later retry succeeds", async () => {
  const s = await import("../src/storage"),
    d = emptyDocument();
  await s.save(d);
  const put = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementationOnce(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
  await expect(s.save({ ...d, name: "unsaved" })).rejects.toMatchObject({
    name: "QuotaExceededError",
  });
  put.mockRestore();
  expect((await s.getDocument(d.id)).name).toBe(d.name);
  await s.save({ ...d, name: "retried" });
  expect((await s.getDocument(d.id)).name).toBe("retried");
});

it("an aborted write transaction leaves the committed document intact without unhandled completion rejection", async () => {
  const s = await import("../src/storage"),
    d = emptyDocument();
  await s.save(d);
  const original = IDBObjectStore.prototype.put;
  const spy = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      const request = original.apply(this, args);
      this.transaction.abort();
      return request;
    });
  await expect(s.save({ ...d, name: "interrupted" })).rejects.toBeDefined();
  spy.mockRestore();
  expect((await s.getDocument(d.id)).name).toBe(d.name);
});
it("serializes rapid edits and reads the final committed value after reopening", async () => {
  const s = await import("../src/storage"),
    d = emptyDocument();
  await s.save(d);
  await Promise.all(
    Array.from({ length: 40 }, (_, i) => s.save({ ...d, name: `Edit ${i}` })),
  );
  vi.resetModules();
  const reopened = await import("../src/storage");
  expect((await reopened.getDocument(d.id)).name).toBe("Edit 39");
});
