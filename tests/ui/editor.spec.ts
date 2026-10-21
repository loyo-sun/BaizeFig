import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
});
test("draw, edit, duplicate, undo, persist, export and recover a design", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Saved locally")).toBeVisible();
  await page.getByRole("button", { name: "Local files", exact: true }).click();
  await page
    .getByRole("button", { name: "New design file", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const svg = page.locator("svg.design-canvas");
  const box = (await svg.boundingBox())!;
  await page.keyboard.press("r");
  await page.mouse.move(box.x + 180, box.y + 170);
  await page.mouse.down();
  await page.mouse.move(box.x + 400, box.y + 310, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator("svg.design-canvas [data-node-id]")).toHaveCount(1);
  await expect(
    page.locator(".layer-name").filter({ hasText: /^Rectangle$/ }),
  ).toHaveCount(1);
  await page.getByRole("spinbutton", { name: "W", exact: true }).fill("320");
  await page.getByRole("spinbutton", { name: "W", exact: true }).press("Tab");
  await expect(
    page.getByRole("spinbutton", { name: "W", exact: true }),
  ).toHaveValue("320");
  await page
    .locator("svg.design-canvas")
    .click({ position: { x: 40, y: 600 } });
  await page.keyboard.press("Meta+a");
  await page.keyboard.press("Meta+d");
  await expect(page.locator("svg.design-canvas [data-node-id]")).toHaveCount(2);
  await page.keyboard.press("Meta+z");
  await expect(page.locator("svg.design-canvas [data-node-id]")).toHaveCount(1);
  await page.keyboard.press("Meta+Shift+z");
  await expect(page.locator("svg.design-canvas [data-node-id]")).toHaveCount(2);
  await expect(page.getByLabel("Saved locally")).toBeVisible();
  await page.reload();
  await expect(page.locator("svg.design-canvas [data-node-id]")).toHaveCount(2);
  const dlPromise = page.waitForEvent("download");
  await page.keyboard.press("Meta+s");
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toMatch(/\.baizefig$/);
  const path = await dl.path();
  await page
    .locator("input[type=file][multiple]")
    .setInputFiles({
      name: dl.suggestedFilename(),
      mimeType: "application/json",
      buffer: await readFile(path!),
    });
  await expect(page.getByRole("status")).toContainText("Document imported");
  await expect(page.locator("svg.design-canvas [data-node-id]")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/editor-verified.png",
    fullPage: true,
  });
});
test("text editing ignores drawing shortcuts and rejects unsupported Sketch imports honestly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Saved locally")).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const box = (await page.locator(".design-canvas").boundingBox())!;
  await page.mouse.click(box.x + 200, box.y + 200);
  const field = page.getByRole("textbox", {
    name: "Edit text on canvas",
    exact: true,
  });
  await field.fill("River");
  await field.press("Escape");
  await expect(
    page.getByRole("button", { name: "Move", exact: true }),
  ).toHaveClass("active");
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "example.sketch",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("sketch-file"),
  });
  await expect(page.getByRole("status")).toContainText("not implemented");
});
