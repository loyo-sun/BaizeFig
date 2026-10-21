import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("first launch opens the complete welcome file, fits it and restores local edits", async ({
  page,
}) => {
  const source = JSON.parse(
    await readFile("design/BaizeFig-欢迎页.baizefig", "utf8"),
  );
  await page.goto("/");
  await expect(page.getByLabel("文件名称")).toHaveValue(source.name);
  await expect(
    page.getByRole("button", { name: "01 · 欢迎页", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "02 · 组件库", exact: true }),
  ).toBeVisible();
  const frame = page.locator(
    `.design-canvas [data-node-id="${source.nodes.find((n) => n.type === "frame" && n.pageId === source.pages[0].id).id}"]`,
  );
  await expect
    .poll(async () => (await frame.boundingBox())!.width)
    .toBeLessThan(800);
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { loadLast } = await import("/src/storage.ts");
        return await loadLast();
      }),
    )
    .toMatchObject({
      name: source.name,
      pages: source.pages,
      nodes: source.nodes,
    });
  await page.screenshot({
    path: "test-results/default-welcome.png",
    fullPage: true,
  });
  const name = page.getByLabel("文件名称");
  await name.fill("我的欢迎页编辑");
  await name.press("Tab");
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { loadLast } = await import("/src/storage.ts");
        return (await loadLast())?.name;
      }),
    )
    .toBe("我的欢迎页编辑");
  await page.reload();
  await expect(name).toHaveValue("我的欢迎页编辑");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  const all = await page.evaluate(async () => {
    const { listDocuments } = await import("/src/storage.ts");
    return await listDocuments();
  });
  expect(all).toHaveLength(1);
  expect(all[0].nodes).toEqual(source.nodes);
});
