import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { emptyDocument, makeNode, History } from "../src/core";
import {
  save,
  saveVersion,
  listVersions,
  restoreVersion,
  loadLast,
  trashDocument,
  restoreDocument,
} from "../src/storage";
it("persists isolated snapshots, restores atomically with a recovery point, and supports undo", async () => {
  const d = emptyDocument();
  d.nodes.push(makeNode("text", d.pages[0].id, { text: "版本 A" }));
  await save(d);
  const v = await saveVersion(d, "A");
  d.nodes[0].text = "版本 B";
  await save(d);
  expect((await listVersions(d.id))[0].document.nodes[0].text).toBe("版本 A");
  const h = new History();
  h.push(d);
  const restored = await restoreVersion(d, v.id);
  expect(restored.nodes[0].text).toBe("版本 A");
  expect((await loadLast())?.nodes[0].text).toBe("版本 A");
  expect(
    (await listVersions(d.id)).find((v) => v.name === "Before restore")
      ?.document.nodes[0].text,
  ).toBe("版本 B");
  expect(h.undo(restored)).toEqual(d);
  expect(h.redo(d)).toEqual(restored);
  const other = emptyDocument();
  await expect(restoreVersion(other, v.id)).rejects.toThrow(
    "Version not found",
  );
  expect(await listVersions(other.id)).toEqual([]);
  await trashDocument(d.id);
  await expect(restoreVersion(d, v.id)).rejects.toThrow(
    "Restore the file from trash first",
  );
  await restoreDocument(d.id);
  expect(await listVersions(d.id)).toHaveLength(2);
});
