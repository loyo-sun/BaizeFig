import React from "react";
import { describe, it, expect } from "vitest";
import paper from "paper";
import {
  emptyDocument,
  makeNode,
  validateDocument,
  History,
  worldTransform,
} from "../src/core";
import {
  parsePaths,
  editableNetwork,
  networkPatch,
  vectorCoordinateSize,
  convertToPaths,
  strokeOutline,
  transformedPath,
} from "../src/vectorGeometry";
import {
  networkGeometry,
  validateNetwork,
  splitSegment,
  removeVertices,
  joinVertices,
} from "../src/vectorNetwork";
import { combineShapes } from "../src/combine";
import { renderToStaticMarkup } from "react-dom/server";
import { Scene } from "../src/Canvas";
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
const area = (d: string, fillRule = "nonzero") =>
  new scope.CompoundPath({ pathData: d, fillRule, insert: false });
function fixture() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("rectangle", p, {
      id: "a",
      width: 100,
      height: 100,
      strokeWidth: 0,
      fill: "#ff0000",
    }),
    makeNode("rectangle", p, {
      id: "b",
      x: 50,
      width: 100,
      height: 100,
      strokeWidth: 0,
      fill: "#00ff00",
    }),
  ];
  return d;
}
describe("editable vector topology", () => {
  it("preserves cubic handles, holes, rules and independent region styles", () => {
    const n = parsePaths([
      {
        d: "M0 0 C20 -30 80 -30 100 0 L100 100 L0 100 Z M20 20 L80 20 L80 80 L20 80 Z",
        rule: "evenodd",
        color: "#ff0000",
      },
      {
        d: "M150 0 L200 0 L200 50 Z",
        rule: "nonzero",
        paints: [
          {
            type: "linear",
            opacity: 0.5,
            stops: [
              { position: 0, color: "#ff0000" },
              { position: 1, color: "#0000ff" },
            ],
          },
        ],
      },
    ]);
    validateNetwork(n);
    expect(n.regions[0].loops).toHaveLength(2);
    expect(n.segments[0].ha.y).toBe(-30);
    expect(networkGeometry(n)[1].paints?.[0].type).toBe("linear");
    expect(
      area(networkGeometry(n)[0].d, "evenodd").contains(
        new scope.Point(50, 50),
      ),
    ).toBe(false);
  });
  it("splits a Bezier with no change to its curve and updates all region references", () => {
    const n = parsePaths([
        { d: "M0 0 C20 60 80 60 100 0 L0 0 Z", rule: "nonzero" },
      ]),
      result = splitSegment(n, 0, 0.37);
    validateNetwork(result);
    const before = area(networkGeometry(n)[0].d),
      after = area(networkGeometry(result)[0].d);
    expect(Math.abs(before.area - after.area)).toBeLessThan(0.001);
    expect(result.vertices).toHaveLength(n.vertices.length + 1);
    expect(n.vertices).toHaveLength(2);
  });
  it("supports a branching graph and closes a trail to create a region", () => {
    let n = parsePaths([{ d: "M0 0 L100 0 L100 100", rule: "nonzero" }]);
    n.vertices.push({ x: 150, y: 0 });
    n.segments.push({ a: 1, b: 3, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } });
    n = joinVertices(n, 2, 0);
    validateNetwork(n);
    expect(n.regions).toHaveLength(1);
    expect(n.segments).toHaveLength(4);
  });
  it("deletes and heals a node while keeping the closed region valid", () => {
    const n = parsePaths([
      { d: "M0 0 L100 0 L100 100 L0 100 Z", rule: "nonzero" },
    ]);
    const result = removeVertices(n, [0], true);
    validateNetwork(result);
    expect(result.vertices).toHaveLength(3);
    expect(result.regions).toHaveLength(1);
    expect(Math.abs(area(networkGeometry(result)[0].d).area)).toBeCloseTo(5000);
  });
  it("invalidates faces when deleting a boundary without healing", () => {
    const n = parsePaths([{ d: "M0 0 L100 0 L100 100 Z", rule: "nonzero" }]);
    const result = removeVertices(n, [1]);
    validateNetwork(result);
    expect(result.regions).toHaveLength(0);
  });
  it("rejects out of range indices and nonfinite coordinates", () => {
    const n = parsePaths([{ d: "M0 0 L1 1", rule: "nonzero" }]);
    n.segments[0].b = 99;
    expect(() => validateNetwork(n)).toThrow();
    n.segments[0].b = 1;
    n.vertices[0].x = NaN;
    expect(() => validateNetwork(n)).toThrow();
  });
});
describe("real path conversions", () => {
  for (const [mode, expected] of [
    ["union", 15000],
    ["subtract", 5000],
    ["intersect", 5000],
    ["exclude", 10000],
  ] as const)
    it(`resolves ${mode} into editable path geometry without child masks`, () => {
      const d = fixture(),
        combined = combineShapes(d, ["a", "b"], mode),
        r = convertToPaths(combined.doc, [combined.id], "flatten");
      validateDocument(r.doc);
      expect(r.doc.nodes).toHaveLength(1);
      const n = r.doc.nodes[0];
      expect(n.type).toBe("path");
      expect(n.fidelity?.booleanOperation).toBeUndefined();
      expect(
        mode === "exclude"
          ? area(networkGeometry(n.fidelity!.network!)[0].d).children.reduce(
              (sum, p) => sum + Math.abs((p as paper.Path).area),
              0,
            )
          : Math.abs(area(networkGeometry(n.fidelity!.network!)[0].d).area),
      ).toBeCloseTo(expected, 1);
      expect(editableNetwork(n).vertices.length).toBeGreaterThan(2);
    });
  it("preserves independent styled regions when flattening disjoint colored layers", () => {
    const r = convertToPaths(fixture(), ["a", "b"], "flatten");
    validateDocument(r.doc);
    expect(r.doc.nodes).toHaveLength(1);
    expect(
      r.doc.nodes[0].fidelity?.network?.regions.map((r) => r.color),
    ).toEqual(["#ff0000", "#00ff00"]);
  });
  it("keeps parent transforms and negative coordinates for nested rotated paths", () => {
    const d = fixture();
    const parent = makeNode("frame", d.pages[0].id, {
      id: "parent",
      rotation: 25,
      x: 200,
      y: 50,
    });
    d.nodes.forEach((n) => (n.parentId = parent.id));
    d.nodes[0].rotation = 35;
    d.nodes[0].fidelity = { size: [100, 100], linear: [1, 0.3, 0.2, 1] };
    d.nodes.unshift(parent);
    const before = worldTransform(d, d.nodes[1]),
      r = convertToPaths(d, ["a", "b"], "flatten");
    validateDocument(r.doc);
    expect(
      worldTransform(
        r.doc,
        r.doc.nodes.find((n) => n.id === "a")!,
      ),
    ).toEqual(before);
    expect(r.doc.nodes).toHaveLength(2);
  });
  it("outlines round caps into filled contours with no center stroke", () => {
    const d = emptyDocument(),
      n = makeNode("line", d.pages[0].id, {
        id: "line",
        width: 100,
        height: 0,
        fill: "none",
        stroke: "#123456",
        strokeWidth: 10,
        fidelity: { size: [100, 0], strokeCap: "round" },
      });
    d.nodes = [n];
    const r = convertToPaths(d, ["line"], "outline");
    validateDocument(r.doc);
    expect(r.doc.nodes[0].strokeWidth).toBe(0);
    const p = area(r.doc.nodes[0].fidelity!.paths![0].d);
    expect(p.bounds.left).toBeCloseTo(-5, 1);
    expect(p.bounds.right).toBeCloseTo(105, 1);
    expect(Math.abs(p.area) - (1000 + Math.PI * 25)).toBeGreaterThan(-1);
  });
  it("preserves holes in a closed stroke and distinguishes butt and square caps", () => {
    const d = fixture(),
      n = d.nodes[0];
    n.fill = "none";
    n.strokeWidth = 10;
    const p = area(strokeOutline(n)[0].d);
    expect(p.contains(new scope.Point(50, 50))).toBe(false);
    expect(p.contains(new scope.Point(0, 50))).toBe(true);
    n.type = "line";
    n.height = 0;
    n.fidelity = { size: [100, 0], strokeCap: "butt" };
    expect(area(strokeOutline(n)[0].d).bounds.width).toBeCloseTo(100);
    n.fidelity.strokeCap = "square";
    expect(area(strokeOutline(n)[0].d).bounds.width).toBeCloseTo(110);
  });
  it("preserves native fill along with converted stroke and undo/native round trips", () => {
    const d = fixture();
    d.nodes[0].strokeWidth = 8;
    const h = new History();
    h.push(d);
    const r = convertToPaths(d, ["a"], "outline");
    validateDocument(JSON.parse(JSON.stringify(r.doc)));
    expect(r.doc.nodes[0].fidelity?.network?.regions).toHaveLength(2);
    expect(h.undo(r.doc)).toEqual(d);
  });
  it("refuses raster/text and effects instead of silently flattening their bounds", () => {
    const d = fixture();
    d.nodes[0].type = "text";
    expect(() => convertToPaths(d, ["a"], "flatten")).toThrow(/vector/);
    expect(d.nodes).toHaveLength(2);
  });
  it("exports styled region gradients and shared boundary strokes once", () => {
    const d = fixture();
    d.nodes = d.nodes.slice(0, 1);
    d.nodes[0].type = "path";
    d.nodes[0].fidelity = {
      size: [100, 100],
      network: parsePaths([
        {
          d: "M0 0 L100 0 L100 100 Z",
          rule: "evenodd",
          paints: [
            {
              type: "linear",
              opacity: 0.5,
              stops: [
                { position: 0, color: "#ff0000" },
                { position: 1, color: "#0000ff" },
              ],
            },
          ],
        },
      ]),
    };
    const svg = renderToStaticMarkup(
      React.createElement(Scene, { doc: d, pageId: d.pages[0].id }),
    );
    expect(svg).toContain("linearGradient");
    expect(svg).toContain("evenodd");
    expect(svg).toContain("0.5");
  });
});
describe("stroke and topology edge cases", () => {
  it("outlines inside and outside strokes on opposite sides of the boundary", () => {
    const n = fixture().nodes[0];
    n.strokeWidth = 10;
    n.fidelity = { size: [100, 100], strokeAlign: "inside" };
    let p = area(strokeOutline(n)[0].d);
    expect(p.bounds.width).toBeCloseTo(100);
    expect(p.contains(new scope.Point(5, 50))).toBe(true);
    expect(p.contains(new scope.Point(-5, 50))).toBe(false);
    n.fidelity.strokeAlign = "outside";
    p = area(strokeOutline(n)[0].d);
    expect(p.bounds.width).toBeCloseTo(120);
    expect(p.contains(new scope.Point(5, 50))).toBe(false);
    expect(p.contains(new scope.Point(-5, 50))).toBe(true);
  });
  it("converts dash gaps and bevel joins to real empty/filled regions", () => {
    const n = makeNode("line", fixture().pages[0].id, {
      width: 100,
      height: 0,
      strokeWidth: 10,
      fidelity: { size: [100, 0], strokeDash: [10, 10] },
    });
    let p = area(strokeOutline(n)[0].d);
    expect(p.contains(new scope.Point(5, 0))).toBe(true);
    expect(p.contains(new scope.Point(15, 0))).toBe(false);
    expect(p.contains(new scope.Point(25, 0))).toBe(true);
    n.type = "path";
    n.fidelity = {
      size: [100, 100],
      paths: [{ d: "M0 0 L100 0 L100 100", rule: "nonzero" }],
      strokeJoin: "bevel",
    };
    p = area(strokeOutline(n)[0].d);
    expect(p.contains(new scope.Point(104, -4))).toBe(false);
    expect(p.contains(new scope.Point(101, -1))).toBe(true);
  });
  it("clips children when flattening a clipping frame and clears removed prototype targets", () => {
    const d = fixture(),
      p = d.pages[0].id;
    d.nodes = [
      makeNode("frame", p, { id: "clip", width: 50, height: 50, fill: "none" }),
      makeNode("rectangle", p, {
        id: "child",
        parentId: "clip",
        x: 20,
        y: 20,
        width: 100,
        height: 100,
        fill: "#ff0000",
        strokeWidth: 0,
      }),
      makeNode("rectangle", p, { id: "link", targetId: "child" }),
    ];
    const r = convertToPaths(d, ["clip"], "flatten");
    validateDocument(r.doc);
    const shape = r.doc.nodes.find((n) => n.id === "clip")!;
    expect(Math.abs(area(shape.fidelity!.paths![0].d).area)).toBeCloseTo(900);
    expect(r.doc.nodes.find((n) => n.id === "link")!.targetId).toBeUndefined();
  });
  it("updates a shared edge in both adjacent region loops when splitting it", () => {
    const n = parsePaths([{ d: "M0 0 L100 0 L100 100 Z", rule: "nonzero" }]);
    n.vertices.push({ x: 0, y: 100 });
    n.segments.push(
      { a: 0, b: 3, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } },
      { a: 3, b: 2, ha: { x: 0, y: 0 }, hb: { x: 0, y: 0 } },
    );
    n.regions.push({
      loops: [
        [
          { segment: 2, reverse: true },
          { segment: 4, reverse: true },
          { segment: 3, reverse: true },
        ],
      ],
      rule: "nonzero",
      color: "#00ff00",
    });
    validateNetwork(n);
    const result = splitSegment(n, 2, 0.3);
    validateNetwork(result);
    expect(
      result.regions.every((r) => r.loops[0].some((e) => e.segment === 5)),
    ).toBe(true);
  });
  it("refuses conversion through a locked ancestor and preserves the original document", () => {
    const d = fixture();
    const parent = makeNode("frame", d.pages[0].id, {
      id: "locked",
      locked: true,
    });
    d.nodes[0].parentId = parent.id;
    d.nodes.unshift(parent);
    const before = JSON.stringify(d);
    expect(() => convertToPaths(d, ["a"], "outline")).toThrow(/Unlock/);
    expect(JSON.stringify(d)).toBe(before);
  });
});
it("renders an image clipped to its vector region and applies resized geometry only once", () => {
  const d = fixture();
  d.nodes = d.nodes.slice(0, 1);
  const n = d.nodes[0];
  n.width = 200;
  n.height = 200;
  n.fidelity = {
    size: [100, 100],
    network: parsePaths([
      {
        d: "M0 0 L100 0 L100 100 Z",
        rule: "nonzero",
        paints: [
          { type: "image", opacity: 1, image: "data:image/png;base64,AAAA" },
        ],
      },
    ]),
  };
  const svg = renderToStaticMarkup(
    React.createElement(Scene, { doc: d, pageId: n.pageId }),
  );
  expect(svg).toContain("<image");
  expect(svg).toContain("data:image/png;base64,AAAA");
  expect(svg).toContain("image-clip");
  expect(svg.match(/scale\(2 2\)/g)).toHaveLength(1);
});
it("exports overshooting curves and round stroke caps without cropping to the old layer bounds", async () => {
  const { svgString } = await import("../src/Canvas");
  const d = fixture(),
    n = d.nodes[0];
  d.nodes = [n];
  n.type = "path";
  n.width = 100;
  n.height = 100;
  n.strokeWidth = 10;
  n.fidelity = {
    size: [100, 100],
    paths: [{ d: "M0 50 C20 -100 80 -100 100 50", rule: "nonzero" }],
    strokeCap: "round",
  };
  n.fill = "none";
  const svg = await svgString(d, n.pageId);
  const view = svg
    .match(/viewBox="([^"]+)"/)![1]
    .split(" ")
    .map(Number);
  expect(view[0]).toBeLessThan(0);
  expect(view[1]).toBeLessThan(-50);
  expect(view[2]).toBeGreaterThan(100);
});
it("bakes gradient coordinates and image geometry through rotated and mirrored Flatten transforms", () => {
  const d = fixture(),
    n = d.nodes[1];
  n.type = "path";
  n.rotation = 30;
  n.fidelity = {
    size: [100, 100],
    linear: [-1, 0.2, 0, 1],
    network: parsePaths([
      {
        d: "M0 0 L100 0 L100 100 Z",
        rule: "nonzero",
        paints: [
          {
            type: "linear",
            opacity: 1,
            stops: [
              { position: 0, color: "#ff0000" },
              { position: 1, color: "#0000ff" },
            ],
          },
          { type: "image", opacity: 1, image: "data:image/png;base64,AAAA" },
        ],
      },
    ]),
  };
  const r = convertToPaths(d, ["a", "b"], "flatten");
  validateDocument(r.doc);
  const paints = r.doc.nodes[0].fidelity!.network!.regions[1].paints!;
  expect(paints[0].space).toBe("user");
  expect(paints[0].transform).toHaveLength(6);
  expect(paints[1].geometry?.matrix[0]).toBeLessThan(0);
  const svg = renderToStaticMarkup(
    React.createElement(Scene, { doc: r.doc, pageId: n.pageId }),
  );
  expect(svg).toContain("userSpaceOnUse");
  expect(svg).toContain("<image");
});
it("flattens boolean operations on groups from their child silhouettes instead of rectangular group bounds", () => {
  const d = fixture(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("group", p, {
      id: "group",
      width: 100,
      height: 100,
      fill: "none",
    }),
    makeNode("rectangle", p, {
      id: "small",
      parentId: "group",
      width: 10,
      height: 10,
      fill: "#ffffff",
      strokeWidth: 0,
    }),
    makeNode("rectangle", p, {
      id: "b",
      x: 50,
      width: 10,
      height: 10,
      fill: "#ffffff",
      strokeWidth: 0,
    }),
  ];
  const combined = combineShapes(d, ["group", "b"], "union");
  const r = convertToPaths(combined.doc, [combined.id], "flatten");
  validateDocument(r.doc);
  expect(Math.abs(area(r.doc.nodes[0].fidelity!.paths![0].d).area)).toBeCloseTo(
    200,
  );
});

it("keeps styled primitive coordinates when entering vector editing", () => {
  const n = makeNode("rectangle", "page", {
    width: 266,
    height: 120,
    fidelity: { size: [1, 1], fills: [] },
  });
  const network = editableNetwork(n);
  expect(vectorCoordinateSize(n)).toEqual([266, 120]);
  const edited = { ...n, ...networkPatch(n, network) };
  expect(edited.fidelity?.size).toEqual([266, 120]);
  expect(Math.max(...network.vertices.map((v) => v.x))).toBe(266);
  expect(Math.max(...network.vertices.map((v) => v.y))).toBe(120);
  expect(vectorCoordinateSize({ ...edited, width: 532 })).toEqual([266, 120]);
});
