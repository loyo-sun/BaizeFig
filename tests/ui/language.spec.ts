import { test, expect } from "@playwright/test";

test("defaults to Chinese, switches immediately and remembers language without changing the design", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("已保存到本地")).toBeVisible();
  const canvas = page.locator(".design-canvas");
  const content = await canvas.textContent();
  const name = await page
    .getByRole("textbox", { name: "文件名称", exact: true })
    .inputValue();
  await page.getByRole("button", { name: "通用设置", exact: true }).click();
  await expect(page.getByLabel("界面语言", { exact: true })).toHaveValue(
    "zh-CN",
  );
  await page.getByLabel("界面语言", { exact: true }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "General settings", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(canvas).toHaveText(content!);
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).toHaveValue(name);
  await page.reload();
  await page
    .getByRole("button", { name: "General settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Interface language", { exact: true }),
  ).toHaveValue("en");
  await page
    .getByLabel("Interface language", { exact: true })
    .selectOption("zh-CN");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "通用设置", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(canvas).toHaveText(content!);
});
