import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page
    .getByRole("button", { name: "New design file", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
async function rectangle(page: Page) {
  await page.keyboard.press("r");
  await page.mouse.move(500, 280);
  await page.mouse.down();
  await page.mouse.move(700, 400, { steps: 8 });
  await page.mouse.up();
}

test("page titles rename inline with Enter, undo, cancellation and persistence", async ({
  page,
}) => {
  page.on("dialog", () => {
    throw Error("Unexpected browser prompt");
  });
  const row = page.locator(".pages .page").first();
  const original = await row.locator(".page-name").innerText();
  await row.locator(".page-name").dblclick();
  const input = row.getByRole("textbox", { name: "Page name", exact: true });
  await expect(input).toBeFocused();
  await input.fill("  首页设计  ");
  await input.press("Enter");
  await expect(input).toHaveCount(0);
  await expect(row.locator(".page-name")).toHaveText("首页设计");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(row.locator(".page-name")).toHaveText(original);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(row.locator(".page-name")).toHaveText("首页设计");
  await row.locator(".page-name").dblclick();
  await input.fill("不要保存");
  await input.press("Escape");
  await expect(row.locator(".page-name")).toHaveText("首页设计");
  await row.locator(".page-name").dblclick();
  await input.fill("   ");
  await input.press("Enter");
  await expect(row.locator(".page-name")).toHaveText("首页设计");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(row.locator(".page-name")).toHaveText("首页设计");
});

test("layer titles edit in place, preserve geometry and survive reload", async ({
  page,
}) => {
  await rectangle(page);
  const row = page.locator(".layer").first();
  const original = await row.locator(".layer-name").innerText();
  const width = page.getByRole("spinbutton", { name: "W", exact: true });
  const previousWidth = await width.inputValue();
  await row.dblclick();
  const input = row.getByRole("textbox", { name: "Layer name", exact: true });
  await expect(input).toBeFocused();
  await expect(
    page.getByRole("dialog", { name: "Rename layer", exact: true }),
  ).toHaveCount(0);
  await input.fill("导航背景");
  await input.press("Enter");
  await expect(row.locator(".layer-name")).toHaveText("导航背景");
  await expect(width).toHaveValue(previousWidth);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(row.locator(".layer-name")).toHaveText(original);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(row.locator(".layer-name")).toHaveText("导航背景");
  await row.locator(".layer-name").dblclick();
  await input.fill("取消的名称");
  await input.press("Escape");
  await expect(row.locator(".layer-name")).toHaveText("导航背景");
  await row.dblclick();
  await input.fill(" ");
  await input.press("Enter");
  await expect(row.locator(".layer-name")).toHaveText("导航背景");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(row.locator(".layer-name")).toHaveText("导航背景");
});

test("composition Enter does not commit and clicking another page commits once without renaming its layers", async ({
  page,
}) => {
  await rectangle(page);
  const row = page.locator(".layer").first();
  await row.dblclick();
  const input = row.getByRole("textbox", { name: "Layer name", exact: true });
  await input.fill("中文输入");
  await input.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
  });
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await expect(page.locator(".pages .page")).toHaveCount(2);
  await page.locator(".pages .page").first().click();
  await expect(row.locator(".layer-name")).toHaveText("中文输入");
  const pageRow = page.locator(".pages .page").last();
  await pageRow.locator(".page-name").dblclick();
  await expect(
    pageRow.getByRole("textbox", { name: "Page name", exact: true }),
  ).toBeFocused();
});
