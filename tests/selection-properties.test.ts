import { it, expect } from "vitest";
import { emptyDocument, makeNode, validateDocument } from "../src/core";
import { updateSelectionProperties } from "../src/selectionProperties";
it("multi-selection appearance preserves each object's fidelity and coordinate space", () => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("rectangle", p, { id: "a", width: 100, height: 80 }),
    makeNode("path", p, {
      id: "b",
      width: 220,
      height: 160,
      fidelity: {
        size: [110, 80],
        paths: [{ d: "M0 0L110 0L110 80Z", rule: "nonzero" }],
        effects: [
          {
            type: "blur",
            radius: 4,
            x: 0,
            y: 0,
            spread: 0,
            color: "#000000",
            visible: true,
          },
        ],
      },
    }),
  ];
  const next = updateSelectionProperties(doc, ["a", "b"], {
    fidelity: { size: [100, 80], blendMode: "multiply" },
  });
  validateDocument(next);
  expect(next.nodes[1].fidelity).toMatchObject({
    size: [110, 80],
    blendMode: "multiply",
    effects: doc.nodes[1].fidelity!.effects,
    paths: doc.nodes[1].fidelity!.paths,
  });
  expect(doc.nodes[1].fidelity!.blendMode).toBeUndefined();
});
it("shared nested changes retain unrelated per-layer style values", () => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("text", p, { id: "a" }),
    makeNode("text", p, {
      id: "b",
      textFlow: {
        autoResize: "height",
        verticalAlign: "bottom",
        letterSpacing: 4,
        direction: "rtl",
      },
    }),
  ];
  const next = updateSelectionProperties(doc, ["a", "b"], {
    textFlow: { autoResize: "fixed", verticalAlign: "top", letterSpacing: 6 },
  });
  expect(next.nodes[1].textFlow?.direction).toBe("rtl");
  expect(next.nodes[1].textFlow?.letterSpacing).toBe(6);
});
