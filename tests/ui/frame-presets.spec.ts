import { test, expect } from "@playwright/test";
test("frame tool exposes only requested presets and uses selected or custom dimensions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await page.keyboard.press("f");
  const panel = page.getByRole("region", { name: "画板尺寸预设" });
  // A section with an accessible label is a region.
  await expect(panel).toBeVisible();
  await expect(panel.locator(".frame-preset-list > button")).toHaveCount(10);
  await panel.getByRole("button", { name: "手机标准", exact: false }).click();
  await expect(panel.getByLabel("新画板宽度")).toHaveValue("390");
  await expect(panel.getByLabel("新画板高度")).toHaveValue("844");
  await page.screenshot({
    path: "test-results/frame-presets-preview.png",
    fullPage: true,
  });
  await page.keyboard.press("Control+Alt+n");
  await expect(page.getByLabel("文件名称")).toHaveValue("未命名");
  await page.keyboard.press("f");
  await panel.getByRole("button", { name: "手机标准", exact: false }).click();
  await page.locator(".design-canvas").click({ position: { x: 200, y: 160 } });
  await expect(
    page.getByRole("spinbutton", { name: "宽", exact: true }),
  ).toHaveValue("390");
  await expect(
    page.getByRole("spinbutton", { name: "高", exact: true }),
  ).toHaveValue("844");
  await page.keyboard.press("f");
  await panel.getByRole("button", { name: "自定义", exact: false }).click();
  await panel.getByLabel("新画板宽度").fill("512");
  await panel.getByLabel("新画板宽度").press("Tab");
  await panel.getByLabel("新画板高度").fill("256");
  await panel.getByLabel("新画板高度").press("Tab");
  await panel.getByRole("button", { name: "在视图中心创建画板" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "宽", exact: true }),
  ).toHaveValue("512");
  await expect(
    page.getByRole("spinbutton", { name: "高", exact: true }),
  ).toHaveValue("256");
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(2);
});
