import { expect, it } from "vitest";
import { demoDocument, execute, validateDocument } from "../src/core";
import { editableFills, fillStackPatch } from "../src/FillProperties";
import { svgString } from "../src/Canvas";

it("persists hidden fill opacity and restores it without losing the paint stack", async () => {
  let doc = demoDocument();
  const node = doc.nodes.find((n) => n.type === "rectangle")!;
  const paints = [
    {
      type: "solid" as const,
      color: "#a80000",
      opacity: 0,
      hiddenOpacity: 0.4,
    },
  ];
  doc = execute(doc, {
    type: "update",
    ids: [node.id],
    patch: fillStackPatch(node, paints),
  }).doc;
  const restored = JSON.parse(JSON.stringify(doc));
  validateDocument(restored);
  const current = restored.nodes.find((n: typeof node) => n.id === node.id)!;
  expect(editableFills(current)[0]).toMatchObject({
    opacity: 0,
    hiddenOpacity: 0.4,
  });
  expect(await svgString(restored, node.pageId, [node.id])).toContain(
    'opacity="0"',
  );
  const visible = editableFills(current).map((p) => ({
    ...p,
    opacity: p.hiddenOpacity!,
    hiddenOpacity: undefined,
  }));
  const changed = execute(restored, {
    type: "update",
    ids: [node.id],
    patch: fillStackPatch(current, visible),
  }).doc;
  expect(await svgString(changed, node.pageId, [node.id])).toContain(
    'opacity="0.4"',
  );
  expect(editableFills(current)[0].opacity).toBe(0);
});
