import { test, expect } from "@playwright/test";
test("user avatar, selected frame fullscreen presentation and drawing text selection", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await expect(
    page.locator(".profile-button .profile-avatar"),
  ).not.toHaveAttribute("src", "/baize.svg");
  await expect(page.locator(".profile-avatar svg")).toBeVisible();
  await page
    .locator("input[type=file][multiple]")
    .setInputFiles("design/BaizeFig-欢迎页.baizefig");
  await expect(page.getByLabel("文件名称")).toHaveValue(
    "BaizeFig · 欢迎页设计",
  );
  await page
    .locator(".layer-name")
    .filter({ hasText: /^欢迎页 \/ Desktop · 1280 × 900$/ })
    .click();
  await page.getByRole("button", { name: "演示", exact: true }).click();
  const preview = page.getByLabel("原型预览", { exact: true });
  await expect(preview).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  const box = await preview.boundingBox();
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
  }));
  expect(box!.width).toBe(viewport.width);
  expect(box!.height).toBe(viewport.height);
  await expect(preview).toHaveAttribute(
    "preserveAspectRatio",
    "xMidYMid slice",
  );
  expect(await page.evaluate(() => !!document.elementFromPoint(10, 100)?.closest(".presentation"))).toBe(true);
  await page.screenshot({
    path: "test-results/fullscreen-preview.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page.keyboard.press("Control+Alt+n");
  await expect(page.getByLabel("文件名称")).toHaveValue("未命名");
  await page.keyboard.press("f");
  const canvas = await page.locator(".design-canvas").boundingBox();
  await page.mouse.move(canvas!.x + 100, canvas!.y + 160);
  await page.mouse.down();
  await page.mouse.move(canvas!.x + 360, canvas!.y + 350, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(1);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  expect(
    await page
      .locator(".design-canvas")
      .evaluate((el) => getComputedStyle(el).userSelect),
  ).toBe("none");
  await page.screenshot({
    path: "test-results/editor-fixes-preview.png",
    fullPage: true,
  });
});
