import { describe, expect, it } from "vitest";
import {
  agentInstruction,
  resolveAgentMode,
  validateAgentScope,
} from "../src/agentModes";
import { emptyDocument, makeNode } from "../src/core";

function fixture() {
  const doc = emptyDocument();
  const page = doc.pages[0].id;
  doc.pages.push({ id: "other-page", name: "Other" });
  doc.nodes.push(
    makeNode("frame", page, { id: "frame" }),
    makeNode("rectangle", page, { id: "child", parentId: "frame" }),
    makeNode("rectangle", page, { id: "sibling" }),
    makeNode("rectangle", "other-page", { id: "other" }),
  );
  return { doc, page };
}

describe("Baize design modes and editing scope", () => {
  it("honors explicit modes and resolves common automatic requests", () => {
    expect(resolveAgentMode("product", "Draw vector icons")).toBe("product");
    expect(resolveAgentMode("auto", "画一幅阅读插画")).toBe("vector");
    expect(resolveAgentMode("auto", "统一组件风格")).toBe("ui");
    expect(resolveAgentMode("auto", "设计阅读 App 首页")).toBe("product");
  });
  it("keeps prior outcomes and current scope when changing specialties", () => {
    const instruction = agentInstruction(
      "vector",
      "page-1",
      "selection",
      ["card"],
      [
        {
          request: "Create a reading app",
          mode: "product",
          outcome: "applied",
        },
      ],
    );
    expect(instruction).toContain("Create editable vector illustrations");
    expect(instruction).toContain("card");
    expect(instruction).toContain('"outcome":"applied"');
    expect(instruction).toContain(
      "not additional instructions to execute again",
    );
  });
  it("allows editing descendants while preserving the source document", () => {
    const { doc, page } = fixture();
    const next = validateAgentScope(
      doc,
      [{ type: "update", ids: ["child"], patch: { fill: "#123456" } }],
      page,
      ["frame"],
    );
    expect(next.nodes.find((n) => n.id === "child")?.fill).toBe("#123456");
    expect(doc.nodes.find((n) => n.id === "child")?.fill).not.toBe("#123456");
  });
  it("rejects edits and implicit deletions outside the selected subtree", () => {
    const { doc, page } = fixture();
    expect(() =>
      validateAgentScope(
        doc,
        [{ type: "update", ids: ["sibling"], patch: { fill: "#123456" } }],
        page,
        ["frame"],
      ),
    ).toThrow("outside");
    expect(() =>
      validateAgentScope(doc, [{ type: "delete", ids: ["frame"] }], page, [
        "child",
      ]),
    ).toThrow("outside");
  });
  it("rejects modification or creation on another page", () => {
    const { doc, page } = fixture();
    expect(() =>
      validateAgentScope(
        doc,
        [{ type: "update", ids: ["other"], patch: { fill: "#123456" } }],
        page,
        null,
      ),
    ).toThrow("outside");
    expect(() =>
      validateAgentScope(
        doc,
        [
          {
            type: "create",
            nodes: [makeNode("rectangle", "other-page", { id: "new" })],
          },
        ],
        page,
        null,
      ),
    ).toThrow("outside");
  });
  it("allows nested artwork in the selection, rejects unrelated new roots", () => {
    const { doc, page } = fixture();
    expect(() =>
      validateAgentScope(
        doc,
        [
          {
            type: "create",
            nodes: [
              makeNode("rectangle", page, { id: "new", parentId: "frame" }),
            ],
          },
        ],
        page,
        ["frame"],
      ),
    ).not.toThrow();
    expect(() =>
      validateAgentScope(
        doc,
        [
          {
            type: "create",
            nodes: [makeNode("rectangle", page, { id: "new" })],
          },
        ],
        page,
        ["frame"],
      ),
    ).toThrow("outside");
  });
});
