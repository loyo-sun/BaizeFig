import { it, expect } from "vitest";
import { createWelcomeDocument } from "../src/welcomeDocument";
import {
  execute,
  descendants,
  worldTransform,
  validateDocument,
} from "../src/core";
it("preserves the black background and white vector children when ungrouping the logo instance", () => {
  const doc = createWelcomeDocument();
  const logo = doc.nodes.find(
    (n) => n.type === "instance" && n.name === "白泽 / 品牌标志",
  )!;
  const childIds = new Set(descendants(doc, [logo.id]));
  const children = doc.nodes.filter(
    (n) => childIds.has(n.id) && n.id !== logo.id,
  );
  const matrices = new Map(children.map((n) => [n.id, worldTransform(doc, n)]));
  const result = execute(doc, { type: "ungroup", ids: [logo.id] }).doc;
  validateDocument(result);
  expect(result.nodes.some((n) => n.id === logo.id)).toBe(false);
  for (const child of children) {
    const next = result.nodes.find((n) => n.id === child.id)!;
    expect(next).toBeDefined();
    expect(next.fill).toBe(child.fill);
    expect(next.stroke).toBe(child.stroke);
    expect(worldTransform(result, next)).toEqual(matrices.get(child.id));
    expect(next.componentOwner).not.toBe(logo.id);
  }
  const background = result.nodes.find(
    (n) => n.name === logo.name + " / Background",
  )!;
  expect(background.fill).toBe("#000");
  expect(worldTransform(result, background)).toEqual(worldTransform(doc, logo));
  expect(doc.nodes.some((n) => n.id === logo.id)).toBe(true);
});
