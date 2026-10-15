import { expect, it } from "vitest";
import { emptyDocument, makeNode } from "../src/core";
import { snapCoordinates, snapTargets } from "../src/snapping";
const options = { objects: true, geometry: false, pixel: false };
it("snaps edges and centers using a fixed screen-space tolerance, with a spanning guide", () => {
  const d = emptyDocument(),
    page = d.pages[0].id;
  d.nodes.push(
    makeNode("rectangle", page, {
      id: "target",
      x: 100,
      y: 80,
      width: 100,
      height: 40,
    }),
  );
  const targets = snapTargets(d, page);
  expect(snapCoordinates([97], [20], targets, options, 1).x).toBe(3);
  expect(snapCoordinates([97], [20], targets, options, 2).x).toBe(0);
  const r = snapCoordinates([148], [20], targets, options, 1);
  expect(r.x).toBe(2);
  expect(r.guides[0]).toMatchObject({
    axis: "x",
    value: 150,
    from: 20,
    to: 120,
  });
  expect(snapCoordinates([97], [20], targets, options, 1, true)).toMatchObject({
    x: 0,
    y: 0,
    guides: [],
  });
});
it("excludes selected subtrees and hidden ancestors but keeps reference geometry in rotated world space", () => {
  const d = emptyDocument(),
    page = d.pages[0].id;
  const parent = makeNode("group", page, {
    id: "parent",
    x: 100,
    y: 200,
    rotation: 90,
    width: 100,
    height: 100,
  });
  const child = makeNode("rectangle", page, {
    id: "child",
    parentId: parent.id,
    x: 10,
    y: 20,
    width: 30,
    height: 40,
  });
  const hidden = makeNode("group", page, { id: "hidden", visible: false });
  d.nodes.push(
    parent,
    child,
    hidden,
    makeNode("rectangle", page, { parentId: hidden.id, x: 999, y: 999 }),
  );
  const targets = snapTargets(d, page);
  expect(targets.some((t) => t.value === 999)).toBe(false);
  const r = snapCoordinates(
    [181],
    [209],
    targets,
    { objects: false, geometry: true, pixel: false },
    1,
  );
  expect(r.x).toBeCloseTo(-1);
  expect(r.y).toBeCloseTo(1);
  expect(snapTargets(d, page, [parent.id])).toEqual([]);
});
it("keeps full precision when disabled and independently enables pixel snapping", () => {
  const r = snapCoordinates(
    [10.25],
    [20.8],
    [],
    { objects: false, geometry: false, pixel: true },
    1,
  );
  expect(r.x).toBe(-0.25);
  expect(r.y).toBeCloseTo(0.2);
  expect(
    snapCoordinates(
      [10.25],
      [20.8],
      [],
      { objects: false, geometry: false, pixel: false },
      1,
    ),
  ).toMatchObject({ x: 0, y: 0 });
});
