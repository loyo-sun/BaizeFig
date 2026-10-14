import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { emptyDocument } from "../src/core";
import {
  save,
  loadLast,
  listDocuments,
  trashDocument,
  listTrash,
  restoreDocument,
} from "../src/storage";
it("deletes atomically, prevents delayed saves from resurrecting files and supports persisted restore", async () => {
  const a = emptyDocument(),
    b = emptyDocument();
  await save(a);
  await save(b);
  await trashDocument(b.id);
  expect((await listDocuments()).some((d) => d.id === b.id)).toBe(false);
  expect((await loadLast())?.id).toBe(a.id);
  expect(await save({ ...b, name: "stale autosave" })).toBe(false);
  expect((await listDocuments()).some((d) => d.id === b.id)).toBe(false);
  expect(
    (await listTrash()).find((r) => r.document.id === b.id)?.document.name,
  ).toBe(b.name);
  await restoreDocument(b.id);
  expect((await listDocuments()).some((d) => d.id === b.id)).toBe(true);
  expect((await listTrash()).some((r) => r.document.id === b.id)).toBe(false);
  await trashDocument(a.id);
  await trashDocument(b.id);
  expect(await loadLast()).toBeUndefined();
  expect(await save(b)).toBe(false);
  await restoreDocument(b.id);
  expect((await loadLast())?.id).toBe(b.id);
});
it("orders concurrent save/delete transactions so the deleted file stays deleted", async () => {
  const d = emptyDocument();
  await save(d);
  await Promise.all([
    save({ ...d, name: "pending" }),
    trashDocument(d.id),
    save({ ...d, name: "late" }),
  ]);
  expect((await listDocuments()).some((a) => a.id === d.id)).toBe(false);
  expect((await listTrash()).some((r) => r.document.id === d.id)).toBe(true);
});
