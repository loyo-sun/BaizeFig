import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { emptyDocument, makeNode, validateDocument } from "../src/core";
import {
  compareDesign,
  resolvedDesign,
  compareSnapshots,
} from "../src/designMerge";
import {
  save,
  createDesignBranch,
  branchContext,
  getDocument,
  reviewDesignBranch,
  mergeDesignBranch,
  listVersions,
  trashDocument,
  restoreDocument,
} from "../src/storage";
function fixture() {
  const d = emptyDocument();
  d.nodes = [
    makeNode("frame", d.pages[0].id, { id: "parent" }),
    makeNode("rectangle", d.pages[0].id, {
      id: "shape",
      parentId: "parent",
      x: 10,
      y: 20,
    }),
  ];
  return d;
}
it("merges independent fields, additions, assets and variables without mutating sources", () => {
  const b = fixture(),
    m = structuredClone(b),
    r = structuredClone(b);
  m.nodes[1].x = 40;
  r.nodes[1].y = 60;
  r.nodes.push(
    makeNode("image", b.pages[0].id, {
      id: "photo",
      image: "data:image/png;base64,AAA",
    }),
  );
  r.variables = [{ id: "brand", name: "Brand", value: "#123456" }];
  const merged = resolvedDesign(b, m, r, {});
  expect(merged.nodes[1]).toMatchObject({ x: 40, y: 60 });
  expect(merged.nodes[2].image).toContain("AAA");
  expect(merged.variables?.[0].id).toBe("brand");
  expect(b.nodes[1].x).toBe(10);
  validateDocument(merged);
});
it("requires explicit conflict resolution and handles edits versus deletion", () => {
  const b = fixture(),
    m = structuredClone(b),
    r = structuredClone(b);
  m.nodes[1].x = 30;
  r.nodes[1].x = 50;
  const c = compareDesign(b, m, r);
  expect(c.conflicts).toHaveLength(1);
  expect(() => resolvedDesign(b, m, r, {})).toThrow("Resolve every");
  expect(
    resolvedDesign(b, m, r, { [c.conflicts[0].id]: "branch" }).nodes[1].x,
  ).toBe(50);
  r.nodes.pop();
  const deletion = compareDesign(b, m, r);
  expect(deletion.conflicts).toHaveLength(1);
  expect(
    resolvedDesign(b, m, r, { [deletion.conflicts[0].id]: "branch" }).nodes,
  ).toHaveLength(1);
});
it("preserves branch reorder, reports competing reorders and keeps additions in authored order", () => {
  const b = fixture();
  b.nodes.push(makeNode("rectangle", b.pages[0].id, { id: "other" }));
  const m = structuredClone(b),
    r = structuredClone(b);
  r.nodes = [r.nodes[2], r.nodes[0], r.nodes[1]];
  expect(resolvedDesign(b, m, r, {}).nodes.map((n) => n.id)).toEqual([
    "other",
    "parent",
    "shape",
  ]);
  m.nodes = [m.nodes[1], m.nodes[0], m.nodes[2]];
  const c = compareDesign(b, m, r);
  expect(c.conflicts[0].path).toEqual(["nodes", "$order"]);
  expect(
    resolvedDesign(b, m, r, { [c.conflicts[0].id]: "branch" }).nodes[0].id,
  ).toBe("other");
});
it("rejects a merged dangling reference instead of saving broken geometry", () => {
  const b = fixture(),
    m = structuredClone(b),
    r = structuredClone(b);
  r.nodes = [];
  m.nodes.push(makeNode("rectangle", b.pages[0].id, { parentId: "parent" }));
  expect(() => resolvedDesign(b, m, r, {})).toThrow();
});
it("compares version names and field changes", () => {
  const b = fixture(),
    r = structuredClone(b);
  r.name = "renamed";
  r.nodes[1].y = 90;
  expect(compareSnapshots(b, r).map((c) => c.path)).toContainEqual(["name"]);
  expect(compareSnapshots(b, r).map((c) => c.path)).toContainEqual([
    "nodes",
    "shape",
    "y",
  ]);
});
it("persists isolated branches, merges atomically with checkpoints, supports repeated merges and stale review protection", async () => {
  const b = fixture();
  await save(b);
  const draft = await createDesignBranch(b, "方案B");
  expect(draft.id).not.toBe(b.id);
  expect((await branchContext(draft.id)).mainId).toBe(b.id);
  draft.nodes[1].y = 80;
  await save(draft);
  const main = await getDocument(b.id);
  expect(main.nodes[1].y).toBe(20);
  main.nodes[1].x = 100;
  const review = await reviewDesignBranch(main, draft.id);
  const merged = await mergeDesignBranch(review, {});
  expect(merged.nodes[1]).toMatchObject({ x: 100, y: 80 });
  expect((await listVersions(main.id))[0].name).toBe("Before merge");
  expect((await listVersions(draft.id))[0].document.nodes[1].y).toBe(80);
  const again = await getDocument(draft.id);
  again.nodes[1].y = 95;
  await save(again);
  const review2 = await reviewDesignBranch(merged, again.id);
  expect(
    compareDesign(review2.branch.base, review2.main, review2.draft).conflicts,
  ).toHaveLength(0);
  await save({ ...merged, background: "#123456" });
  await expect(mergeDesignBranch(review2, {})).rejects.toThrow(
    "Design changed",
  );
  expect((await getDocument(main.id)).nodes[1].y).toBe(80);
  await expect(createDesignBranch(again, "nested")).rejects.toThrow(
    "main design",
  );
});
it("does not merge deleted files and resumes after trash restore", async () => {
  const b = fixture();
  await save(b);
  const draft = await createDesignBranch(b, "recover");
  const review = await reviewDesignBranch(b, draft.id);
  await trashDocument(draft.id);
  await expect(mergeDesignBranch(review, {})).rejects.toThrow("Design changed");
  await restoreDocument(draft.id);
  expect((await branchContext(draft.id)).branches).toHaveLength(1);
});
