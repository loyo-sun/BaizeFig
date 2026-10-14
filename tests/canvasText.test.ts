import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  History,
  validateDocument,
  worldTransform,
} from "../src/core";
import { svgString } from "../src/Canvas";
import { writeFileSync } from "node:fs";
import { canonicalEditableText } from "../src/textEditing";
it("preserves intentional empty lines and removes only a final caret placeholder", () => {
  expect(canonicalEditableText("标题\n\n", 3)).toBe("标题\n");
  expect(canonicalEditableText("标题\n\n", 4)).toBe("标题\n\n");
  expect(canonicalEditableText("第一行\r\n第二行")).toBe("第一行\n第二行");
  expect(canonicalEditableText("")).toBe("");
});
function fixture() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.name = "画布交互验收";
  d.nodes = [
    makeNode("frame", p, {
      id: "text-board",
      name: "文字与嵌套选择",
      x: 0,
      y: 0,
      width: 800,
      height: 540,
      fill: "#f5f7ff",
    }),
    makeNode("text", p, {
      id: "editable-label",
      name: "可编辑标题",
      parentId: "text-board",
      x: 40,
      y: 40,
      width: 600,
      height: 60,
      text: "双击直接编辑 / Edit me",
      fontSize: 32,
    }),
    makeNode("frame", p, {
      id: "outer-frame",
      name: "外部矩形",
      parentId: "text-board",
      x: 40,
      y: 160,
      width: 300,
      height: 220,
      fill: "#d5e6ff",
    }),
    makeNode("rectangle", p, {
      id: "inner-rectangle",
      name: "内部矩形",
      parentId: "outer-frame",
      x: 50,
      y: 50,
      width: 130,
      height: 90,
      fill: "#0d99ff",
    }),
    makeNode("text", p, {
      id: "rotated-label",
      name: "旋转文字",
      parentId: "text-board",
      x: 430,
      y: 200,
      width: 240,
      height: 100,
      rotation: 15,
      text: "旋转中的文字",
      fontSize: 28,
    }),
    makeNode("text", p, {
      id: "locked-label",
      name: "锁定文字",
      parentId: "text-board",
      x: 40,
      y: 430,
      width: 500,
      text: "锁定文字不会进入编辑",
      locked: true,
      fontSize: 22,
    }),
  ];
  return d;
}
it("commits empty, multilingual and multiline content as an undoable text update while preserving hierarchy and transforms", async () => {
  const d = fixture(),
    history = new History(),
    id = "editable-label",
    before = d.nodes.find((n) => n.id === id)!;
  history.push(d);
  const text = "白泽 / BaizeFig\n选中、输入与删除 <script>",
    next = execute(d, { type: "update", ids: [id], patch: { text } }).doc;
  expect(next.nodes.find((n) => n.id === id)).toMatchObject({
    text,
    parentId: before.parentId,
  });
  expect(
    worldTransform(
      next,
      next.nodes.find((n) => n.id === id)!,
    ),
  ).toEqual(worldTransform(d, before));
  validateDocument(next);
  expect(history.undo(next)).toEqual(d);
  expect(history.redo(d)).toEqual(next);
  expect(await svgString(next, d.pages[0].id)).toContain("&lt;script&gt;");
  expect(
    execute(next, {
      type: "update",
      ids: [id],
      patch: { text: "" },
    }).doc.nodes.find((n) => n.id === id)?.text,
  ).toBe("");
});
it("provides the isolated browser verification document without committing private samples", () => {
  const d = fixture();
  validateDocument(d);
  if (process.env.CANVAS_TEXT_FIXTURE_PATH)
    writeFileSync(process.env.CANVAS_TEXT_FIXTURE_PATH, JSON.stringify(d));
});
