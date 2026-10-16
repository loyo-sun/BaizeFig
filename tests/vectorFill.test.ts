import { expect, it } from "vitest";
import { demoDocument, execute, validateDocument } from "../src/core";
import { editableNetwork, networkPatch } from "../src/vectorGeometry";
import { svgString } from "../src/Canvas";

it("recolors edited welcome stars including saved region colors and paints", async () => {
  let doc = demoDocument();
  const star = doc.nodes.find((n) => n.name === "Baize star")!;
  const network = editableNetwork(star);
  network.regions[0].color = "#172006";
  network.regions[0].paints = [{ type: "solid", color: "#172006", opacity: 1 }];
  doc = execute(doc, {
    type: "update",
    ids: [star.id],
    patch: networkPatch(star, network),
  }).doc;
  const before = structuredClone(doc);
  const changed = execute(doc, {
    type: "update",
    ids: [star.id],
    patch: { fill: "#a80000" },
  }).doc;
  const node = changed.nodes.find((n) => n.id === star.id)!;
  expect(node.fill).toBe("#a80000");
  expect(node.fidelity!.network!.regions[0].color).toBeUndefined();
  expect(node.fidelity!.network!.regions[0].paints).toBeUndefined();
  expect(node.fidelity!.paths![0].color).toBeUndefined();
  expect(node.fidelity!.paths![0].paints).toBeUndefined();
  const restored = JSON.parse(JSON.stringify(changed));
  validateDocument(restored);
  expect(await svgString(restored, star.pageId, [star.id])).toContain(
    "#a80000",
  );
  expect(await svgString(restored, star.pageId, [star.id])).not.toContain(
    "#172006",
  );
  expect(doc).toEqual(before);
  // Subsequent node editing must not restore the previous region paint.
  const edited = execute(restored, {
    type: "update",
    ids: [star.id],
    patch: networkPatch(node, editableNetwork(node)),
  }).doc;
  expect(await svgString(edited, star.pageId, [star.id])).not.toContain(
    "#172006",
  );
});

it("keeps explicit region styles and converted stroke colors when editing a fill", () => {
  const doc = demoDocument(),
    star = doc.nodes.find((n) => n.name === "Baize star")!;
  const network = editableNetwork(star);
  network.regions[0].color = "#112233";
  let next = execute(doc, {
    type: "update",
    ids: [star.id],
    patch: { ...networkPatch(star, network), fill: "#a80000" },
  }).doc;
  let node = next.nodes.find((n) => n.id === star.id)!;
  expect(node.fidelity!.network!.regions[0].color).toBe("#112233");
  node.fidelity!.paths!.push({
    d: "M0 0L10 0L10 10Z",
    rule: "nonzero",
    color: "#445566",
    strokeOutline: true,
  });
  next = execute(next, {
    type: "update",
    ids: [star.id],
    patch: { fill: "none" },
  }).doc;
  node = next.nodes.find((n) => n.id === star.id)!;
  expect(node.fidelity!.paths!.at(-1)!.color).toBe("#445566");
  expect(node.fidelity!.network!.regions[0].color).toBeUndefined();
});

it("keeps instance fill overrides while inheriting later vector geometry changes", async () => {
  const { createComponentInstance } = await import("../src/components");
  let doc = demoDocument();
  const star = doc.nodes.find((n) => n.name === "Baize star")!;
  const network = editableNetwork(star);
  network.regions[0].color = "#172006";
  doc = execute(doc, {
    type: "update",
    ids: [star.id],
    patch: networkPatch(star, network),
  }).doc;
  const grouped = execute(doc, {
    type: "group",
    ids: [star.id],
    kind: "component",
  });
  const created = createComponentInstance(
    grouped.doc,
    grouped.selection![0],
    star.pageId,
    0,
    0,
  );
  const instanceStar = created.doc.nodes.find(
    (n) => n.componentOwner === created.id && n.type === "path",
  )!;
  doc = execute(created.doc, {
    type: "update",
    ids: [instanceStar.id],
    patch: { fill: "#a80000" },
  }).doc;
  const modified = structuredClone(network);
  modified.vertices[0].x += 17;
  doc = execute(JSON.parse(JSON.stringify(doc)), {
    type: "update",
    ids: [star.id],
    patch: networkPatch(star, modified),
  }).doc;
  const instance = doc.nodes.find((n) => n.id === instanceStar.id)!;
  expect(instance.fill).toBe("#a80000");
  expect(instance.fidelity!.network!.regions[0].color).toBeUndefined();
  expect(instance.fidelity!.network!.vertices[0].x).toBe(
    modified.vertices[0].x,
  );
});
