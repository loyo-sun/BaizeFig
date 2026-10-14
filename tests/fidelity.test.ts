import { describe, it, expect } from "vitest";
import {
  commandsPath,
  networkPaths,
  inverse,
  multiply,
  transformPoint,
} from "../src/fidelity";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  worldTransform,
  bounds,
  localDelta,
} from "../src/core";
import { svgString } from "../src/Canvas";
import {
  setVariableMode,
  editVariableColor,
  removeVariable,
} from "../src/variables";
function commandBlob() {
  const bytes = new Uint8Array(1 + 8 + 1 + 24 + 1);
  const v = new DataView(bytes.buffer);
  let p = 0;
  bytes[p++] = 1;
  for (const n of [2, 3]) {
    v.setFloat32(p, n, true);
    p += 4;
  }
  bytes[p++] = 4;
  for (const n of [4, 5, 6, 7, 8, 9]) {
    v.setFloat32(p, n, true);
    p += 4;
  }
  bytes[p] = 0;
  return bytes;
}
function network() {
  const b = new Uint8Array(12 + 24 + 28),
    v = new DataView(b.buffer);
  let p = 0;
  const u = (x: number) => {
      v.setUint32(p, x, true);
      p += 4;
    },
    f = (x: number) => {
      v.setFloat32(p, x, true);
      p += 4;
    };
  [2, 1, 0].forEach(u);
  u(0);
  f(0);
  f(0);
  u(0);
  f(10);
  f(10);
  u(0);
  u(0);
  f(2);
  f(0);
  u(1);
  f(-2);
  f(0);
  return b;
}
describe("compatibility geometry and rendering", () => {
  it("decodes cubic geometry and rejects unsupported/truncated/nonfinite commands", () => {
    expect(commandsPath(commandBlob())).toBe("M2 3 C4 5 6 7 8 9 Z");
    for (const b of [
      new Uint8Array([7]),
      new Uint8Array([1, 0]),
      new Uint8Array([2, 0, 0, 0, 0, 0, 0, 0, 0]),
    ])
      expect(() => commandsPath(b)).toThrow();
  });
  it("decodes vector network tangent deltas with normalized scaling and rejects broken indices", () => {
    expect(networkPaths(network(), 20, 30, { x: 10, y: 10 })[0].d).toBe(
      "M0 0 C4 0 16 30 20 30 ",
    );
    const bad = network();
    new DataView(bad.buffer).setUint32(40, 100, true);
    expect(() => networkPaths(bad, 20, 30, { x: 10, y: 10 })).toThrow();
  });
  it("preserves world geometry through group, ungroup and alignment under rotated/scaled parents", () => {
    const d = emptyDocument(),
      p = d.pages[0].id;
    d.nodes = [
      makeNode("frame", p, {
        id: "p",
        x: 200,
        y: 100,
        fidelity: { size: [160, 100], linear: [0, 2, -2, 0] },
      }),
      makeNode("rectangle", p, {
        id: "a",
        parentId: "p",
        x: 20,
        y: 30,
        width: 20,
        height: 10,
        rotation: 25,
      }),
      makeNode("rectangle", p, {
        id: "b",
        x: 500,
        y: 600,
        width: 40,
        height: 30,
      }),
    ];
    const expected = worldTransform(d, d.nodes[1]);
    const grouped = execute(d, { type: "group", ids: ["a"] });
    expect(
      worldTransform(
        grouped.doc,
        grouped.doc.nodes.find((n) => n.id === "a")!,
      ),
    ).toEqual(expected);
    const ungrouped = execute(grouped.doc, {
      type: "ungroup",
      ids: grouped.selection!,
    }).doc;
    expect(
      worldTransform(
        ungrouped,
        ungrouped.nodes.find((n) => n.id === "a")!,
      ),
    ).toEqual(expected);
    const aligned = execute(d, {
      type: "align",
      ids: ["a", "b"],
      axis: "left",
    }).doc;
    expect(bounds(aligned, [aligned.nodes[1]]).x).toBeCloseTo(
      bounds(aligned, [aligned.nodes[2]]).x,
    );
    expect(localDelta(d, d.nodes[1], 10, 20)).toEqual({ x: 10, y: -5 });
  });
  it("exports nested transformed selection using the same matrix and real paths as the scene", async () => {
    const d = emptyDocument(),
      p = d.pages[0].id;
    d.nodes = [
      makeNode("group", p, {
        id: "p",
        x: 100,
        y: 200,
        fidelity: { size: [100, 100], linear: [0, 1, -1, 0] },
      }),
      makeNode("path", p, {
        id: "v",
        parentId: "p",
        x: 10,
        y: 20,
        width: 20,
        height: 10,
        fill: "#abcdef",
        fidelity: {
          size: [10, 10],
          paths: [{ d: "M0 0 L10 0 L10 10 Z", rule: "evenodd" }],
        },
      }),
    ];
    const svg = await svgString(d, p, ["v"]);
    expect(svg).toContain('viewBox="70 210 10 20"');
    expect(svg).toContain("matrix(0 1 -1 0 80 210)");
    expect(svg).toContain("scale(2 1)");
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain("M0 0 L10 0 L10 10 Z");
  });
  it("renders crop inverse, rounded clips, fit and tiling without introducing external resources", async () => {
    const d = emptyDocument(),
      p = d.pages[0].id,
      n = makeNode("image", p, {
        id: "image",
        width: 100,
        height: 80,
        image: "data:image/png;base64,AAAA",
        fidelity: {
          size: [100, 80],
          corners: [10, 20, 30, 40],
          image: {
            mode: "crop",
            transform: [0.5, 0, 0, 0.5, 0.25, 0.25],
            width: 200,
            height: 100,
            scale: 1,
            opacity: 0.5,
          },
        },
      });
    d.nodes = [n];
    let svg = await svgString(d, p);
    expect(svg).toContain("matrix(200 0 0 160 -50 -40)");
    expect(svg).toContain("image-clip-image");
    expect(svg).toContain('opacity="0.5"');
    n.fidelity!.image!.mode = "fit";
    svg = await svgString(d, p);
    expect(svg).toContain("xMidYMid meet");
    n.fidelity!.image!.mode = "tile";
    svg = await svgString(d, p);
    expect(svg).toContain("<pattern");
    expect(svg).toContain('patternUnits="userSpaceOnUse"');
  });
  it("retains saved text baselines and mixed runs, invalidating layout cache on text/width edits", async () => {
    const d = emptyDocument(),
      p = d.pages[0].id,
      n = makeNode("text", p, {
        id: "text",
        text: "Hello world",
        fidelity: {
          size: [160, 100],
          text: {
            characters: "Hello world",
            letterSpacing: 1,
            lines: [
              { start: 0, end: 6, x: 2, y: 20 },
              { start: 6, end: 11, x: 3, y: 50 },
            ],
            spans: [{ start: 0, end: 5, fontWeight: 700, fill: "#ff0000" }],
          },
        },
      });
    d.nodes = [n];
    const svg = await svgString(d, p);
    expect(svg).toContain('x="2" y="20"');
    expect(svg).toContain('x="3" y="50"');
    expect(svg).toContain('font-weight="700"');
    const renamed = execute(d, {
      type: "update",
      ids: ["text"],
      patch: { name: "Title" },
    }).doc;
    expect(renamed.nodes[0].fidelity?.text).toBeDefined();
    const edited = execute(d, {
      type: "update",
      ids: ["text"],
      patch: { text: "New" },
    }).doc;
    expect(edited.nodes[0].fidelity?.text).toBeUndefined();
    expect(await svgString(edited, p)).toContain("New");
    expect(
      execute(d, { type: "update", ids: ["text"], patch: { width: 300 } }).doc
        .nodes[0].fidelity?.text,
    ).toBeUndefined();
  });
  it("rejects malicious/invalid serialized fidelity data and preserves valid JSON round trips", () => {
    const d = emptyDocument(),
      p = d.pages[0].id;
    d.nodes = [
      makeNode("path", p, {
        fidelity: {
          size: [100, 100],
          paths: [{ d: "M0 0 L20 20", rule: "nonzero" }],
        },
      }),
    ];
    expect(() => validateDocument(JSON.parse(JSON.stringify(d)))).not.toThrow();
    d.nodes[0].fidelity!.paths![0].d = "<script>alert(1)</script>";
    expect(() => validateDocument(d)).toThrow();
  });
  it("inverts affine transforms and rejects singular ones", () => {
    const m: [number, number, number, number, number, number] = [
      0, 2, -3, 0, 10, 20,
    ];
    expect(transformPoint(multiply(inverse(m), m), 3, 5)).toEqual({
      x: 3,
      y: 5,
    });
    expect(() => inverse([0, 0, 0, 0, 0, 0])).toThrow();
  });
});
describe("imported layout and variables", () => {
  it("keeps unrelated edits from reflowing imported layouts and recalculates fixed/hug alignment on geometry changes", () => {
    const d = emptyDocument(),
      p = d.pages[0].id;
    d.nodes = [
      makeNode("frame", p, {
        id: "f",
        width: 300,
        height: 80,
        layout: "horizontal",
        gap: 10,
        importedLayout: {
          padding: [10, 20, 10, 20],
          primary: "fixed",
          counter: "fixed",
          justify: "space-between",
          align: "center",
        },
      }),
      makeNode("rectangle", p, {
        id: "a",
        parentId: "f",
        x: 17,
        y: 18,
        width: 40,
        height: 20,
      }),
      makeNode("rectangle", p, {
        id: "b",
        parentId: "f",
        x: 100,
        y: 10,
        width: 60,
        height: 20,
      }),
    ];
    expect(
      execute(d, { type: "update", ids: ["a"], patch: { fill: "#abcdef" } }).doc
        .nodes[1].x,
    ).toBe(17);
    const next = execute(d, {
      type: "update",
      ids: ["a"],
      patch: { width: 50 },
    }).doc;
    expect(next.nodes[0].width).toBe(300);
    expect(next.nodes[1].x).toBe(20);
    expect(next.nodes[1].y).toBe(30);
    expect(next.nodes[2].x).toBe(220);
    next.nodes[0].importedLayout!.primary = "hug";
    next.nodes[0].importedLayout!.justify = "start";
    const hug = execute(next, {
      type: "layout",
      id: "f",
      direction: "horizontal",
      gap: 5,
    }).doc;
    expect(hug.nodes[0].width).toBe(155);
  });
  it("switches color modes through aliases, supports edits/deletion and round trips without changing original history", () => {
    const d = emptyDocument(),
      p = d.pages[0].id;
    d.variableCollections = [
      {
        id: "c",
        name: "Theme",
        activeMode: "light",
        modes: [
          { id: "light", name: "Light" },
          { id: "dark", name: "Dark" },
        ],
      },
    ];
    d.variables = [
      {
        id: "base",
        name: "Base",
        value: "#ffffff",
        collectionId: "c",
        values: { light: { color: "#ffffff" }, dark: { color: "#111111" } },
      },
      {
        id: "alias",
        name: "Surface",
        value: "#ffffff",
        collectionId: "c",
        values: { light: { alias: "base" }, dark: { alias: "base" } },
      },
    ];
    d.nodes = [
      makeNode("rectangle", p, { variableId: "alias", fill: "#ffffff" }),
    ];
    d.componentLibrary = [
      {
        sourceId: "source",
        name: "Library",
        nodes: [
          makeNode("rectangle", p, { variableId: "base", fill: "#ffffff" }),
        ],
      },
    ];
    const dark = setVariableMode(d, "c", "dark");
    expect(d.nodes[0].fill).toBe("#ffffff");
    expect(dark.nodes[0].fill).toBe("#111111");
    const edited = editVariableColor(dark, "base", "#222222");
    expect(edited.nodes[0].fill).toBe("#222222");
    const removed = removeVariable(edited, "base");
    expect(removed.nodes[0].fill).toBe("#222222");
    expect(removed.componentLibrary![0].nodes[0].variableId).toBeUndefined();
    expect(setVariableMode(removed, "c", "light").nodes[0].fill).toBe(
      "#ffffff",
    );
    expect(() =>
      validateDocument(JSON.parse(JSON.stringify(removed))),
    ).not.toThrow();
    dark.variables![0].values!.dark = { alias: "alias" };
    expect(() => setVariableMode(dark, "c", "dark")).toThrow("Cyclic");
  });
});
