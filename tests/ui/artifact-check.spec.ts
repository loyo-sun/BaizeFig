import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
test("editable welcome artifact imports and renders linked components", async ({
  page,
}) => {
  const file = "design/BaizeFig-欢迎页.baizefig";
  const d = JSON.parse(await readFile(file, "utf8"));
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await page.locator("input[type=file][multiple]").setInputFiles(file);

  await expect(page.getByLabel("文件名称")).toHaveValue(
    "BaizeFig · 欢迎页设计",
  );
  await page.keyboard.press("Shift+1");
  await page.screenshot({
    path: "test-results/welcome-artifact-import.png",
    fullPage: true,
  });
  const result = await page.evaluate(async (doc) => {
    const { validateDocument, execute } = await import("/src/core.ts");
    const { svgString } = await import("/src/Canvas.tsx");
    validateDocument(doc);
    const master = doc.nodes.find(
      (n) => n.type === "component" && n.name === "引导 / 功能说明",
    );
    const title = doc.nodes.find(
      (n) => n.parentId === master.id && n.name === "标题",
    );
    const changed = execute(doc, {
      type: "update",
      ids: [title.id],
      patch: { fill: "#334433" },
    }).doc;
    const instanceTitles = changed.nodes.filter(
      (n) => n.name === "标题" && n.componentOwner,
    );
    if (
      instanceTitles.length !== 5 ||
      instanceTitles.some((n) => n.fill !== "#334433")
    )
      throw Error("Component synchronization failed");
    const f = doc.nodes.find(
      (n) => n.pageId === doc.pages[0].id && n.type === "frame",
    );
    const svg = await svgString(doc, doc.pages[0].id, [f.id]);
    return { svg, titles: instanceTitles.map((n) => n.text) };
  }, d);
  expect(result.titles).toContain("细节，尽在掌握");
  await writeFile("design/BaizeFig-欢迎页.preview.svg", result.svg);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(
    "<style>html,body{margin:0;width:1280px;height:900px}svg{display:block;width:1280px;height:900px}</style>" +
      result.svg,
  );
  await page.screenshot({ path: "design/BaizeFig-欢迎页.preview.png" });
});
