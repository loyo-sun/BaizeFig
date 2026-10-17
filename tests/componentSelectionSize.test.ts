import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  reflowAfterPointerEdit,
} from "../src/core";
import { createComponentInstance } from "../src/components";
import { resizeInWorld } from "../src/geometry";
import { canvasTarget } from "../src/canvasSelection";

it("keeps a newly wrapped shape inside its main and instance selection bounds after resizing", () => {
  const original = emptyDocument(),
    page = original.pages[0].id;
  original.nodes.push(
    makeNode("rectangle", page, { id: "shape", width: 169, height: 141 }),
  );
  const grouped = execute(original, {
    type: "group",
    kind: "component",
    ids: ["shape"],
  });
  const mainId = grouped.selection![0];
  const inserted = createComponentInstance(grouped.doc, mainId, page, 300, 0);
  const resized = reflowAfterPointerEdit(
    inserted.doc,
    resizeInWorld(inserted.doc, mainId, "s", 0, -96),
  );
  const main = resized.nodes.find((n) => n.id === mainId)!;
  const shape = resized.nodes.find((n) => n.id === "shape")!;
  const instance = resized.nodes.find((n) => n.id === inserted.id)!;
  const instanceShape = resized.nodes.find((n) => n.parentId === instance.id)!;
  expect(main.height).toBe(45);
  expect(shape.height).toBe(45);
  expect(instance.height).toBe(45);
  expect(instanceShape.height).toBe(45);
  expect(canvasTarget(resized, shape.id, null)?.id).toBe(mainId);
  expect(canvasTarget(resized, shape.id, mainId)?.id).toBe(shape.id);
  expect(canvasTarget(resized, instanceShape.id, null)?.id).toBe(instance.id);
  expect(canvasTarget(resized, instanceShape.id, instance.id)?.id).toBe(
    instanceShape.id,
  );
});

it("preserves explicit constraints when creating a component", () => {
  const doc = emptyDocument();
  doc.nodes.push(
    makeNode("rectangle", doc.pages[0].id, {
      id: "shape",
      width: 169,
      height: 141,
      constraints: { horizontal: "stretch", vertical: "min" },
    }),
  );
  const grouped = execute(doc, {
    type: "group",
    kind: "component",
    ids: ["shape"],
  });
  const resized = execute(grouped.doc, {
    type: "update",
    ids: grouped.selection!,
    patch: { height: 45 },
  }).doc;
  expect(resized.nodes.find((n) => n.id === "shape")!.height).toBe(141);
  expect(resized.nodes.find((n) => n.id === "shape")!.constraints).toEqual({
    horizontal: "stretch",
    vertical: "min",
  });
});
