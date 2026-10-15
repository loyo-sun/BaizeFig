import { expect, it } from "vitest";
import { emptyDocument, makeNode } from "../src/core";
import { copyCss } from "../src/copyCss";
it("copies selected roots with world transforms, typography and safe comment names", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("frame", p, {
      id: "parent",
      x: 100,
      y: 50,
      width: 300,
      height: 300,
    }),
    makeNode("text", p, {
      id: "text",
      parentId: "parent",
      name: "a */ b",
      x: 20,
      y: 30,
      text: "白泽",
      fill: "#123456",
      textFlow: {
        autoResize: "fixed",
        verticalAlign: "top",
        letterSpacing: 2,
        direction: "rtl",
      },
    }),
  ];
  const css = copyCss(d, ["text"]);
  expect(css).toContain("matrix(1, 0, 0, 1, 120, 80)");
  expect(css).toContain("color: #123456");
  expect(css).toContain("direction: rtl");
  expect(css).toContain("a * / b");
  expect(
    copyCss(d, ["parent", "text"]).match(/data-baizefig-id/g),
  ).toHaveLength(1);
});
