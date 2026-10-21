import { test, expect } from "@playwright/test";

test("welcome introduces the editor and starts a clean persistent canvas", async ({
  page,
}) => {
  await page.goto("/");
  const welcome = page.getByRole("region", { name: "欢迎使用 BaizeFig" });
  await expect(welcome).toBeVisible();
  await expect(welcome.locator(".welcome-guide")).toHaveCount(5);
  await expect(
    welcome.getByRole("heading", { name: "同万物，识万象" }),
  ).toBeVisible();
  await expect(page.locator(".profile-avatar")).toHaveAttribute(
    "src",
    "/baize.svg",
  );
  await page.screenshot({
    path: "test-results/welcome-desktop.png",
    fullPage: true,
  });
  const help = welcome.getByRole("link", { name: /帮助中心/ });
  await expect(help).toHaveAttribute("href", "/help/index.html");
  await welcome.getByRole("button", { name: "开始创作" }).click();
  await expect(welcome).toBeHidden();
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(0);
  await page.keyboard.press("r");
  const canvas = await page.locator(".design-canvas").boundingBox();
  await page.mouse.move(canvas!.x + 130, canvas!.y + 180);
  await page.mouse.down();
  await page.mouse.move(canvas!.x + 290, canvas!.y + 300);
  await page.mouse.up();
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(1);
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { loadLast } = await import(/* @vite-ignore */ "/src/storage.ts");
        return (await loadLast())?.nodes.length;
      }),
    )
    .toBe(1);
  await page.reload();
  await expect(welcome).toBeHidden();
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(1);
});

test("welcome can be dismissed and reopened from the main menu in English", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  const welcome = page.getByRole("region", { name: "Welcome to BaizeFig" });
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: "Close welcome" }).click();
  await expect(welcome).toBeHidden();
  const count = await page.locator(".design-canvas [data-node-id]").count();
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Welcome guide", exact: true })
    .click();
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: "Close welcome" }).click();
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(
    count,
  );
});
