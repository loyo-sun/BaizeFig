import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  validateDocument,
  History,
  worldTransform,
} from "../src/core";
import { parsePaths } from "../src/vectorGeometry";
import { splitVectorLayers } from "../src/vectorSplit";
import { networkGeometry } from "../src/vectorNetwork";
import paper from "paper";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
function fixture(d = "M0 0 L100 0 M200 0 L300 0") {
  const doc = emptyDocument();
  doc.nodes = [
    makeNode("path", doc.pages[0].id, {
      id: "source",
      width: 300,
      height: 100,
      fill: "none",
      strokeWidth: 3,
      fidelity: {
        size: [300, 100],
        network: parsePaths([{ d, rule: "evenodd" }]),
      },
    }),
  ];
  return doc;
}
it("splits disconnected open subpaths into editable child layers with a stable wrapper id", () => {
  const d = fixture(),
    r = splitVectorLayers(d, ["source"]);
  validateDocument(r.doc);
  expect(r.doc.nodes).toHaveLength(3);
  expect(r.doc.nodes[0].id).toBe("source");
  expect(r.doc.nodes[0].type).toBe("group");
  expect(r.selection).toHaveLength(2);
  expect(
    r.doc.nodes
      .slice(1)
      .every((n) => n.type === "path" && n.parentId === "source"),
  ).toBe(true);
  expect(d.nodes).toHaveLength(1);
});
it("keeps holes with the containing island instead of filling them in separate layers", () => {
  const d = fixture(
    "M0 0 L100 0 L100 100 L0 100 Z M20 20 L40 20 L40 40 L20 40 Z M200 0 L300 0 L300 100 L200 100 Z",
  );
  d.nodes[0].fill = "#ff0000";
  const r = splitVectorLayers(d, ["source"]);
  validateDocument(r.doc);
  expect(r.selection).toHaveLength(2);
  const first = r.doc.nodes[1],
    p = new scope.CompoundPath({
      pathData: networkGeometry(first.fidelity!.network!)[0].d,
      fillRule: "evenodd",
      insert: false,
    });
  expect(p.contains(new scope.Point(30, 30))).toBe(false);
  expect(first.fidelity!.network!.regions[0].loops).toHaveLength(2);
});
it("breaks a branching open network into independent trails", () => {
  const d = fixture("M0 0 L100 0 L200 0");
  const n = d.nodes[0].fidelity!.network!;
  n.vertices.push({ x: 100, y: 100 });
  n.segments.push({ a: 1, b: 3, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } });
  d.nodes[0].strokeWidth = 3;
  const r = splitVectorLayers(d, ["source"]);
  validateDocument(r.doc);
  expect(r.selection).toHaveLength(3);
  expect(r.doc.nodes.slice(1).every((n) => n.strokeWidth === 3)).toBe(true);
  expect(
    r.doc.nodes
      .slice(1)
      .every((n) => n.fidelity!.network!.segments.length === 1),
  ).toBe(true);
});
it("preserves parent transforms, opacity/effects and reference identity on the wrapper", () => {
  const d = fixture(),
    n = d.nodes[0];
  n.rotation = 25;
  n.opacity = 0.5;
  n.fidelity!.linear = [1, 0.3, 0.2, 1];
  n.fidelity!.effects = [
    {
      type: "blur",
      color: "#000000",
      radius: 2,
      spread: 0,
      x: 0,
      y: 0,
      visible: true,
    },
  ];
  const m = worldTransform(d, n),
    r = splitVectorLayers(d, ["source"]);
  validateDocument(r.doc);
  expect(worldTransform(r.doc, r.doc.nodes[0])).toEqual(m);
  expect(r.doc.nodes[0].opacity).toBe(0.5);
  expect(r.doc.nodes[0].fidelity!.effects).toEqual(n.fidelity!.effects);
  expect(r.doc.nodes[1].opacity).toBe(1);
});
it("preserves baked fill coordinates, native round trips and a single undo transaction", () => {
  const d = fixture("M0 0 L100 0 L100 100 Z M200 0 L300 0 L300 100 Z");
  d.nodes[0].fidelity!.network!.regions[0].paints = [
    {
      type: "linear",
      opacity: 0.6,
      stops: [
        { position: 0, color: "#ff0000" },
        { position: 1, color: "#ffffff" },
      ],
    },
  ];
  const h = new History();
  h.push(d);
  const r = splitVectorLayers(d, ["source"]);
  validateDocument(JSON.parse(JSON.stringify(r.doc)));
  expect(r.doc.nodes[1].fidelity!.network!.regions[0].paints![0].space).toBe(
    "user",
  );
  expect(h.undo(r.doc)).toEqual(d);
});
it("leaves a single trail unchanged and rejects locked/instance structure changes", () => {
  const d = fixture("M0 0 L100 0");
  expect(splitVectorLayers(d, ["source"]).doc).toEqual(d);
  d.nodes[0].locked = true;
  expect(() => splitVectorLayers(d, ["source"])).toThrow(/Unlock/);
});
