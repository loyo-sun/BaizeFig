import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createWelcomeDocument } from "../src/welcomeDocument";
import { execute } from "../src/core";

it("loads the exact editable source with independent document identities", () => {
  const source = JSON.parse(
    readFileSync("design/BaizeFig-欢迎页.baizefig", "utf8"),
  );
  const a = createWelcomeDocument(),
    b = createWelcomeDocument();
  expect(a.id).not.toBe(source.id);
  expect(a.id).not.toBe(b.id);
  expect({ ...a, id: source.id }).toEqual(source);
  a.nodes[0].name = "Edited locally";
  expect(b.nodes[0].name).toBe(source.nodes[0].name);
});

it("keeps linked component instances and editable text overrides", () => {
  const doc = createWelcomeDocument();
  const main = doc.nodes.find(
    (n) => n.type === "component" && n.name === "引导 / 功能说明",
  )!;
  const heading = doc.nodes.find(
    (n) => n.parentId === main.id && n.name === "标题",
  )!;
  const updated = execute(doc, {
    type: "update",
    ids: [heading.id],
    patch: { fill: "#334433" },
  }).doc;
  const copies = updated.nodes.filter(
    (n) => n.name === "标题" && n.componentOwner,
  );
  expect(copies).toHaveLength(5);
  expect(copies.every((n) => n.fill === "#334433")).toBe(true);
  expect(copies.map((n) => n.text)).toContain("细节，尽在掌握");
});
