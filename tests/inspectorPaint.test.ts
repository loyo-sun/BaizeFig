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

import { selectionColors, replaceSelectionColor } from "../src/selectionColors";
it("replaces selection colors without flattening paint stacks or touching locked and unselected nodes", () => {
  const doc = demoDocument();
  const nodes = doc.nodes.filter((n) => n.type === "rectangle");
  const a = nodes[0],
    b = nodes[1];
  a.fidelity = {
    size: [a.width, a.height],
    paints: [
      { type: "solid", color: "#112233", opacity: 0.4 },
      {
        type: "linear",
        opacity: 0.7,
        stops: [
          { position: 0, color: "#11223380" },
          { position: 1, color: "#ffffff" },
        ],
      },
    ],
  };
  b.fill = "#112233";
  b.locked = true;
  const before = structuredClone(doc);
  const entries = selectionColors(doc, [a.id, b.id]);
  const next = replaceSelectionColor(doc, entries.get("#112233")!, "#aabbcc");
  const result = next.nodes.find((n) => n.id === a.id)!;
  expect(result.fidelity!.paints).toHaveLength(2);
  expect(result.fidelity!.paints![0]).toMatchObject({
    color: "#aabbcc",
    opacity: 0.4,
  });
  expect(result.fidelity!.paints![1]).toEqual(a.fidelity.paints![1]);
  expect(next.nodes.find((n) => n.id === b.id)!.fill).toBe("#112233");
  const alpha = replaceSelectionColor(
    next,
    entries.get("#11223380")!,
    "#445566",
  );
  expect(
    alpha.nodes.find((n) => n.id === a.id)!.fidelity!.paints![1].stops![0]
      .color,
  ).toBe("#44556680");
  expect(doc).toEqual(before);
  validateDocument(alpha);
});

it("restores hidden stroke opacity after serializing and keeps independent corners", async () => {
  let doc = demoDocument();
  const node = doc.nodes.find((n) => n.type === "rectangle")!;
  doc = execute(doc, {
    type: "update",
    ids: [node.id],
    patch: {
      stroke: "#123456",
      strokeWidth: 2,
      fidelity: {
        size: [node.width, node.height],
        strokeOpacity: 0,
        hiddenStrokeOpacity: 0.55,
        corners: [8, 16, 24, 32],
      },
    },
  }).doc;
  const restored = JSON.parse(JSON.stringify(doc));
  validateDocument(restored);
  const n = restored.nodes.find((n: typeof node) => n.id === node.id)!;
  expect(n.fidelity.hiddenStrokeOpacity).toBe(0.55);
  const result = execute(restored, {
    type: "update",
    ids: [node.id],
    patch: {
      fidelity: {
        ...n.fidelity,
        strokeOpacity: n.fidelity.hiddenStrokeOpacity,
        hiddenStrokeOpacity: undefined,
      },
    },
  }).doc;
  expect(result.nodes.find((n) => n.id === node.id)!.fidelity!.corners).toEqual(
    [8, 16, 24, 32],
  );
  expect(await svgString(result, node.pageId, [node.id])).toContain(
    'stroke-opacity="0.55"',
  );
});
