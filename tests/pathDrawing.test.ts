import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  worldTransform,
  validateDocument,
  History,
} from "../src/core";
import {
  penNetwork,
  pencilNetwork,
  drawnPath,
  type PenAnchor,
} from "../src/pathDrawing";
import { transformPoint } from "../src/fidelity";
import { networkStroke, validateNetwork } from "../src/vectorNetwork";
const anchor = (x: number, y: number): PenAnchor => ({
  x,
  y,
  incoming: { x: 0, y: 0 },
  outgoing: { x: 0, y: 0 },
});
it("creates straight click segments, symmetric dragged cubic handles and a closed region without a duplicate endpoint", () => {
  const anchors = [
    anchor(100, 100),
    {
      ...anchor(200, 180),
      incoming: { x: -40, y: 0 },
      outgoing: { x: 40, y: 0 },
    },
    anchor(300, 100),
  ];
  const n = penNetwork(anchors, true);
  validateNetwork(n);
  expect(n.vertices).toHaveLength(3);
  expect(n.segments).toHaveLength(3);
  expect(n.segments[0].hb).toEqual({ x: -40, y: 0 });
  expect(n.segments[1].ha).toEqual({ x: 40, y: 0 });
  expect(n.regions[0].loops[0]).toHaveLength(3);
  expect(networkStroke(penNetwork(anchors))).toContain("C");
});
it("keeps pencil samples and exact endpoints on the interpolating curve, including negative excursions", () => {
  const points = [
    { x: 120, y: 150 },
    { x: 80, y: 110 },
    { x: 40, y: 160 },
    { x: 95, y: 220 },
    { x: 121, y: 151 },
  ];
  const n = pencilNetwork(points);
  validateNetwork(n);
  expect(n.vertices).toEqual(points);
  expect(n.segments).toHaveLength(4);
  expect(n.segments.some((s) => s.ha.x !== 0 || s.ha.y !== 0)).toBe(true);
  const d = emptyDocument(),
    node = drawnPath(d, d.pages[0].id, n, null);
  d.nodes.push(node);
  validateDocument(d);
  const restored = node.fidelity!.network!.vertices.map((p) =>
    transformPoint(worldTransform(d, node), p.x, p.y),
  );
  restored.forEach((p, i) => {
    expect(p.x).toBeCloseTo(points[i].x, 9);
    expect(p.y).toBeCloseTo(points[i].y, 9);
  });
  expect(node.fidelity!.size).toEqual([node.width, node.height]);
});
it("retains world-space strokes inside rotated and sheared frames and round-trips through undo", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("frame", p, {
      id: "frame",
      x: 80,
      y: 40,
      width: 300,
      height: 250,
      rotation: 30,
      fidelity: { size: [300, 250], linear: [1, 0.2, 0.3, 1] },
    }),
  ];
  const network = penNetwork([
    anchor(180, 160),
    {
      ...anchor(310, 280),
      incoming: { x: -20, y: 30 },
      outgoing: { x: 20, y: -30 },
    },
  ]);
  const node = drawnPath(d, p, network, "frame"),
    next = { ...d, nodes: [...d.nodes, node] },
    m = worldTransform(next, node);
  network.vertices.forEach((v, i) => {
    const actual = transformPoint(
      m,
      node.fidelity!.network!.vertices[i].x,
      node.fidelity!.network!.vertices[i].y,
    );
    expect(actual.x).toBeCloseTo(v.x);
    expect(actual.y).toBeCloseTo(v.y);
  });
  validateDocument(JSON.parse(JSON.stringify(next)));
  const history = new History();
  history.push(d);
  expect(history.undo(next).nodes).toHaveLength(1);
  expect(history.redo(d).nodes).toHaveLength(2);
});

it("breaks one handle without jumping at the hit target edge or changing its opposite after Alt release", async () => {
  const { dragHandle } = await import("../src/pathDrawing");
  const drag = {
    start: { x: 102, y: 48 },
    original: { x: 40, y: 10 },
    opposite: { x: -40, y: -10 },
    independent: true,
  };
  expect(dragHandle(drag, { x: 102, y: 48 }, true)).toEqual({
    handle: { x: 40, y: 10 },
    opposite: { x: -40, y: -10 },
  });
  expect(dragHandle(drag, { x: 122, y: 68 }, false)).toEqual({
    handle: { x: 60, y: 30 },
    opposite: { x: -40, y: -10 },
  });
  expect(dragHandle(drag, { x: 122, y: 88 }, true, true).opposite).toEqual({
    x: -40,
    y: -10,
  });
});
it("freezes the current opposite when Alt is pressed midway through creating a curve", async () => {
  const { dragHandle } = await import("../src/pathDrawing");
  const drag = {
    start: { x: 100, y: 100 },
    original: { x: 0, y: 0 },
    opposite: { x: 0, y: 0 },
    independent: false,
  };
  expect(dragHandle(drag, { x: 140, y: 110 }, false).opposite).toEqual({
    x: -40,
    y: -10,
  });
  expect(dragHandle(drag, { x: 160, y: 130 }, true).opposite).toEqual({
    x: -40,
    y: -10,
  });
  expect(dragHandle(drag, { x: 170, y: 150 }, false).opposite).toEqual({
    x: -40,
    y: -10,
  });
});
