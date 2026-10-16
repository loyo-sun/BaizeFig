import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  emptyDocument,
  makeNode,
  validateDocument,
  History,
} from "../src/core";
import { EffectDefinitions, type ImportedEffect } from "../src/appearance";
import { svgString } from "../src/Canvas";
const effect = (type: ImportedEffect["type"]): ImportedEffect => ({
  type,
  color: "#23456780",
  radius: 16,
  spread: 3,
  x: -8,
  y: 12,
  visible: true,
});
it("preserves an editable effect stack through history, native reload and SVG", async () => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("rectangle", p, {
      id: "effects",
      width: 10,
      height: 20,
      fidelity: {
        size: [10, 20],
        effects: [
          effect("drop-shadow"),
          effect("inner-shadow"),
          effect("blur"),
          effect("background-blur"),
        ],
      },
    }),
  ];
  const history = new History();
  history.push(doc);
  const changed = structuredClone(doc);
  changed.nodes[0].fidelity!.effects![0].visible = false;
  const undone = history.undo(changed);
  expect(undone.nodes[0].fidelity!.effects![0].visible).toBe(true);
  const redone = history.redo(undone);
  expect(redone.nodes[0].fidelity!.effects![0].visible).toBe(false);
  const loaded = JSON.parse(JSON.stringify(undone));
  validateDocument(loaded);
  const svg = await svgString(loaded, p);
  expect(svg).toContain('flood-color="#23456780"');
  expect(svg).toContain("backdrop-filter-");
  expect(svg).toContain('operator="erode"');
  expect(svg).toContain('operator="dilate"');
  expect(svg).toContain('stdDeviation="8"');
});
it("expands small-shape filter bounds for large shadows and chained blur", () => {
  const node = makeNode("rectangle", "page", {
    width: 10,
    height: 20,
    fidelity: {
      size: [10, 20],
      effects: [effect("drop-shadow"), effect("blur")],
    },
  });
  const markup = renderToStaticMarkup(
    React.createElement(EffectDefinitions, { node }),
  );
  expect(markup).toContain('width="1980%"');
  expect(markup).toContain('height="1040%"');
  node.fidelity!.effects!.forEach((e) => (e.visible = false));
  expect(
    renderToStaticMarkup(React.createElement(EffectDefinitions, { node })),
  ).toBe("");
});
