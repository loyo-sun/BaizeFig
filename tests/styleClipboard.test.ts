import { expect, it, vi } from "vitest";
import {
  emptyDocument,
  makeNode,
  History,
  validateDocument,
} from "../src/core";
import {
  copyProperties,
  pasteProperties,
  propertyPatch,
  readDefaultStyles,
  DEFAULT_STYLES_KEY,
} from "../src/styleClipboard";
it("transfers complex paints/strokes while retaining geometry, hierarchy, text, vector data and identity", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  const source = makeNode("rectangle", p, {
      fill: "#ff0000",
      strokeWidth: 4,
      opacity: 0.4,
      fidelity: {
        size: [160, 100],
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
        strokeDash: [4, 2],
        strokeCap: "round",
      },
    }),
    target = makeNode("text", p, {
      text: "保留文字",
      x: 250,
      fidelity: { size: [120, 40], linear: [0, 1, -1, 0] },
    }),
    locked = makeNode("rectangle", p, { locked: true });
  d.nodes.push(source, target, locked);
  const h = new History();
  h.push(d);
  const n = pasteProperties(d, [target.id, locked.id], copyProperties(source));
  expect(n.nodes[1].fidelity?.paints).toEqual(source.fidelity?.paints);
  expect(n.nodes[1].fidelity?.linear).toEqual(target.fidelity?.linear);
  expect(n.nodes[1].text).toBe("保留文字");
  expect(n.nodes[1].id).toBe(target.id);
  expect(n.nodes[1].x).toBe(250);
  expect(n.nodes[1].opacity).toBe(0.4);
  expect(n.nodes[2]).toEqual(locked);
  expect(h.undo(n)).toEqual(d);
  validateDocument(n);
});
it("clears old paints/effects without copying source paths, references, constraints or text ranges", () => {
  const d = emptyDocument(),
    p = d.pages[0].id,
    s = makeNode("text", p, {
      fontSize: 40,
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 2,
        runs: [{ start: 0, end: 2, fontWeight: 900 }],
      },
    }),
    t = makeNode("text", p, {
      fidelity: {
        size: [160, 100],
        paints: [{ type: "solid", opacity: 1, color: "#00ff00" }],
        effects: [],
        paths: [{ d: "M0 0L10 0L0 10Z", rule: "nonzero" }],
      },
    });
  const patch = propertyPatch(t, copyProperties(s));
  expect(patch.fidelity?.paints).toBeUndefined();
  expect(patch.fidelity?.paths).toEqual(t.fidelity?.paths);
  expect(patch.textFlow?.runs).toBeUndefined();
  expect(patch.textFlow?.letterSpacing).toBe(2);
  expect(patch).not.toHaveProperty("id");
  expect(patch).not.toHaveProperty("text");
  expect(patch).not.toHaveProperty("parentId");
});
it("restores validated per-tool defaults and discards malformed data", () => {
  const p = emptyDocument().pages[0].id;
  let raw = JSON.stringify({
    text: copyProperties(makeNode("text", p, { fontSize: 42 })),
    rectangle: copyProperties(makeNode("rectangle", p, { fill: "#abcdef" })),
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === DEFAULT_STYLES_KEY ? raw : null),
  });
  expect(readDefaultStyles().text?.values.fontSize).toBe(42);
  expect(readDefaultStyles().rectangle?.values.fill).toBe("#abcdef");
  raw = '{"text":{"values":{"fontSize":-3},"fidelity":{},"text":true}}';
  expect(readDefaultStyles()).toEqual({});
  raw = "null";
  expect(readDefaultStyles()).toEqual({});
  vi.unstubAllGlobals();
});
