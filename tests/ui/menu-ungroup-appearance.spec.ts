import { test, expect } from "@playwright/test";
test("context highlight follows hovered item and Command Backspace keeps white logo on its black backing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: "展开或折叠 欢迎页 / Desktop · 1280 × 900",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "展开或折叠 03 / 品牌主视觉", exact: true })
    .click();
  const logo = page
    .locator(".layer-name")
    .filter({ hasText: /^白泽 \/ 品牌标志$/ });
  await logo.click();
  await page
    .locator(".design-canvas")
    .click({ button: "right", position: { x: 40, y: 700 } });
  const menu = page.getByRole("menu", { name: "右键菜单" });
  await expect(page.locator(".command-menu-panel")).toBeVisible();
  await expect(page.locator(".command-menu-panel button.active")).toHaveCount(
    0,
  );
  await page.getByRole("menuitem", { name: "复制", exact: true }).hover();
  await expect(page.locator(".command-menu-panel button.active")).toHaveCount(
    1,
  );
  await expect(
    page.locator(".command-menu-panel button.active"),
  ).toHaveAttribute("aria-label", "复制");
  await page.getByRole("menuitem", { name: "取消编组", exact: true }).hover();
  await expect(
    page.locator(".command-menu-panel button.active"),
  ).toHaveAttribute("aria-label", "取消编组");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Meta+Backspace");
  await expect(logo).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { loadLast } = await import("/src/storage.ts");
        const d = await loadLast();
        return d?.nodes.find((n) => n.name === "白泽 / 品牌标志 / Background")
          ?.fill;
      }),
    )
    .toBe("#000");
  await page.screenshot({
    path: "test-results/ungroup-logo-preserved.png",
    fullPage: true,
  });
  await page.keyboard.press("Meta+z");
  await expect(logo).toBeVisible();
});
