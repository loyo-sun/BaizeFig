import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("frame name selects and drags the whole frame without changing its children", async ({
  page,
}) => {
  const source = JSON.parse(
    await readFile("design/BaizeFig-欢迎页.baizefig", "utf8"),
  );
  const frame = source.nodes.find(
    (n) => n.pageId === source.pages[0].id && n.type === "frame",
  );
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await page
    .locator("input[type=file][multiple]")
    .setInputFiles("design/BaizeFig-欢迎页.baizefig");
  await expect(page.getByLabel("文件名称")).toHaveValue(source.name);
  await page.keyboard.press("Shift+1");
  const label = page.locator(`[data-frame-label="${frame.id}"]`);
  await label.click();
  await expect(
    page.getByRole("spinbutton", { name: "宽", exact: true }),
  ).toHaveValue("1280");
  const box = (await label.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 80,
    box.y + box.height / 2 + 40,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect
    .poll(async () =>
      page.evaluate(async (id) => {
        const { loadLast } = await import("/src/storage.ts");
        const d = await loadLast();
        return d?.nodes.find((n) => n.id === id)?.x;
      }, frame.id),
    )
    .toBeGreaterThan(frame.x);
  const saved = await page.evaluate(async () => {
    const { loadLast } = await import("/src/storage.ts");
    return loadLast();
  });
  expect(saved!.nodes.filter((n) => n.id !== frame.id)).toEqual(
    source.nodes.filter((n) => n.id !== frame.id),
  );
  expect(saved!.nodes.find((n) => n.id === frame.id)!.y).toBeGreaterThan(
    frame.y,
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await page.screenshot({
    path: "test-results/frame-label-drag.png",
    fullPage: true,
  });
  await page.keyboard.press("Meta+z");
  await expect(
    page.getByRole("spinbutton", { name: "X", exact: true }),
  ).toHaveValue("0");
});
