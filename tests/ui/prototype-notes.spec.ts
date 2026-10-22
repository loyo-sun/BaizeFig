import { test, expect } from "@playwright/test";

test("prototype description formats Markdown while typing and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "原型", exact: true }).click();
  const notes = page.getByRole("textbox", { name: "说明", exact: true });
  await notes.click();
  await page.keyboard.type("## Heading");
  await expect(notes.locator("h2")).toHaveText("Heading");
  await page.keyboard.press("Enter");
  await page.keyboard.type("**Bold**");
  await expect(notes.locator("strong,b")).toHaveText("Bold");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "原型", exact: true }).click();
  await expect(notes.locator("h2")).toContainText("Heading");
});

test("prototype notes support typed ordered and unordered lists", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "原型", exact: true }).click();
  const notes = page.getByRole("textbox", { name: "说明", exact: true });
  await notes.click();
  await page.keyboard.type("- First");
  await expect(notes.locator("ul li")).toHaveText("First");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("1. Next");
  await expect(notes.locator("ol li")).toHaveText("Next");
});
