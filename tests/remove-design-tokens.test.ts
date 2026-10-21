import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { removeDesignTokens } from "../src/removeDesignTokens";
import { emptyDocument, validateDocument } from "../src/core";
import { svgString } from "../src/Canvas";
import { refreshCompositeTokens } from "../src/compositeTokens";
import { save, loadLast, saveVersion } from "../src/storage";
import { retiredDesignTokens } from "./fixtures/retiredDesignTokens";
it("materializes all retired design bindings, preserving actual SVG and source data", async () => {
  const original = refreshCompositeTokens(retiredDesignTokens()),
    snapshot = structuredClone(original);
  const next = removeDesignTokens(original);
  validateDocument(next);
  for (const key of [
    "variables",
    "typedVariables",
    "variableCollections",
    "compositeTokens",
    "tokenThemes",
  ])
    expect(next).not.toHaveProperty(key);
  for (const n of next.nodes)
    for (const key of [
      "variableId",
      "variableModes",
      "bindings",
      "compositeBindings",
    ])
      expect(n).not.toHaveProperty(key);
  expect(next.nodes[0]).toMatchObject({
    text: "Preserved text",
    fontSize: 28,
    fontWeight: 600,
  });
  expect(next.nodes[2].visible).toBe(false);
  expect(next.nodes[1].fidelity?.effects?.[0].radius).toBe(8);
  expect(await svgString(next, next.pages[0].id)).toBe(
    await svgString(original, original.pages[0].id),
  );
  expect(original).toEqual(snapshot);
});
it("strips library and nested override references, including orphaned legacy bindings", () => {
  const doc = retiredDesignTokens();
  doc.nodes[1].componentOverrides = {
    child: { variableId: "brand", fill: "#8855cc" },
  };
  doc.componentLibrary = [
    {
      sourceId: "source",
      name: "Legacy",
      nodes: [structuredClone(doc.nodes[1])],
    },
  ];
  const next = removeDesignTokens(doc);
  const text = JSON.stringify(next);
  expect(text).not.toMatch(
    /"(?:variableId|variableModes|bindings|compositeBindings)"\s*:/,
  );
  expect(next.componentLibrary![0].nodes[0].fidelity?.effects?.[0].radius).toBe(
    8,
  );
});
it("opens broken legacy references with their saved appearance instead of retaining the feature", () => {
  const doc = retiredDesignTokens();
  doc.nodes[0].bindings = { text: "missing" };
  const next = removeDesignTokens(doc);
  validateDocument(next);
  expect(next.nodes[0].text).toBe("Preserved text");
  expect(next.nodes[0].bindings).toBeUndefined();
});
it("saves documents and new recovery versions without retired token data", async () => {
  const doc = retiredDesignTokens();
  await save(doc);
  const loaded = (await loadLast())!;
  expect(loaded.id).toBe(doc.id);
  expect(loaded.typedVariables).toBeUndefined();
  expect(loaded.nodes[0].fontSize).toBe(28);
  const version = await saveVersion(doc, "Recovery");
  expect(version.document.compositeTokens).toBeUndefined();
  expect(version.document.nodes[0].bindings).toBeUndefined();
});
it("keeps ordinary documents unchanged without cloning", () => {
  const doc = emptyDocument();
  expect(removeDesignTokens(doc)).toBe(doc);
});
