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
  await expect(page.getByText("Saved locally")).toBeVisible();
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
  await expect(page.locator("[data-node-id]")).toHaveCount(1);
  await expect(
    page.getByRole("textbox", { name: "Layer name", exact: true }),
  ).toHaveValue("Rectangle");
  await page.getByRole("spinbutton", { name: "W", exact: true }).fill("320");
  await page.getByRole("spinbutton", { name: "W", exact: true }).press("Tab");
  await expect(
    page.getByRole("spinbutton", { name: "W", exact: true }),
  ).toHaveValue("320");
  await page.locator("svg.design-canvas").click({ position: { x: 20, y: 20 } });
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+d");
  await expect(page.locator("[data-node-id]")).toHaveCount(2);
  await page.keyboard.press("Control+z");
  await expect(page.locator("[data-node-id]")).toHaveCount(1);
  await page.keyboard.press("Control+Shift+z");
  await expect(page.locator("[data-node-id]")).toHaveCount(2);
  await expect(page.getByText("Saved locally")).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-node-id]")).toHaveCount(2);
  const dlPromise = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toMatch(/\.baizefig$/);
  const path = await dl.path();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByRole("status")).toContainText("Document imported");
  await expect(page.locator("[data-node-id]")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/editor-verified.png",
    fullPage: true,
  });
});
test("text editing ignores drawing shortcuts and rejects unsupported Figma imports honestly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally")).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const box = (await page.locator(".design-canvas").boundingBox())!;
  await page.mouse.click(box.x + 200, box.y + 200);
  const field = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await field.fill("River");
  await field.press("Tab");
  await expect(
    page.getByRole("button", { name: "Move", exact: true }),
  ).toHaveClass("active");
  await page.locator("input[type=file]").setInputFiles({
    name: "example.fig",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("fig-file"),
  });
  await expect(page.getByRole("status")).toContainText("not implemented");
});
