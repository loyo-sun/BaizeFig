import { describe, expect, it } from "vitest";
import { emptyDocument, makeNode } from "../src/core";
import { svgString } from "../src/Canvas";
describe("shared renderer export", () => {
  it("exports selected nested nodes in world coordinates without unrelated content", async () => {
    const doc = emptyDocument(),
      page = doc.pages[0].id;
    doc.nodes = [
      makeNode("frame", page, { id: "f", x: 100, y: 200 }),
      makeNode("text", page, {
        id: "t",
        parentId: "f",
        x: 10,
        y: 20,
        text: "Selected",
      }),
      makeNode("text", page, { text: "Unrelated" }),
    ];
    const svg = await svgString(doc, page, ["t"]);
    expect(svg).toContain('viewBox="110 220 160 100"');
    expect(svg).toContain("Selected");
    expect(svg).not.toContain("Unrelated");
    expect(svg).not.toContain("clip-f");
  });
  it("escapes text rather than turning design content into executable markup", async () => {
    const doc = emptyDocument(),
      page = doc.pages[0].id;
    doc.nodes = [
      makeNode("text", page, { text: "<script>alert(1)</script> & text" }),
    ];
    const svg = await svgString(doc, page);
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&amp; text");
  });
});
