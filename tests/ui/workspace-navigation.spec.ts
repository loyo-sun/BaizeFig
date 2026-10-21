import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
});
test("toolbar has one style button without a divider and logo opens the main menu", async ({
  page,
}) => {
  const toolbar = page.getByRole("toolbar", {
    name: "Drawing tools",
    exact: true,
  });
  const styles = toolbar.getByRole("button", { name: "Styles", exact: true });
  await expect(styles).toHaveCount(1);
  await expect(toolbar.locator(".dock-palette")).toHaveCSS(
    "border-left-width",
    "0px",
  );
  await styles.click();
  const popup = page.getByRole("dialog", { name: "Styles", exact: true });
  await expect(popup).toBeVisible();
  await popup.getByRole("tab", { name: "Typography", exact: true }).click();
  await expect(
    popup.getByRole("tab", { name: "Typography", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await popup.getByRole("tab", { name: "Colors", exact: true }).click();
  const bounds = (await popup.boundingBox())!;
  expect(bounds.y).toBeGreaterThan(70);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1440);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Extensions", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".sidebar-collapse,.sidebar-expand,.palette-grip"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "File", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "test-results/workspace-navigation.png",
    animations: "disabled",
  });
});
test("collapse toggles both sidebars and each edge reveals an overlay without resizing the canvas", async ({
  page,
}) => {
  const shape = page.locator("svg.design-canvas [data-node-id]").first();
  const shapeX = (await shape.boundingBox())!.x;
  await page
    .getByRole("button", { name: "Collapse sidebars", exact: true })
    .click();
  const left = page.locator(".left-panel"),
    right = page.locator(".right-panel"),
    canvas = page.locator("svg.design-canvas");
  await expect(left).toBeHidden();
  await expect(right).toBeHidden();
  await expect
    .poll(async () => Math.round((await shape.boundingBox())!.x))
    .toBe(Math.round(shapeX));
  await expect
    .poll(async () => Math.round((await canvas.boundingBox())!.width))
    .toBe(1440);
  await page.mouse.move(1, 240);
  await expect(left).toBeVisible();
  await expect(right).toBeHidden();
  expect(Math.round((await canvas.boundingBox())!.width)).toBe(1440);
  await page.mouse.move(200, 240);
  await expect(left).toBeVisible();
  await page.mouse.move(700, 600);
  await expect(left).toBeHidden();
  await page.mouse.move(1439, 240);
  await expect(right).toBeVisible();
  await expect(left).toBeHidden();
  expect(Math.round((await canvas.boundingBox())!.width)).toBe(1440);
  await page.mouse.move(700, 600);
  await expect(right).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(left).toBeVisible();
  await expect(right).toBeVisible();
  const name = page.getByRole("textbox", {
    name: "Document name",
    exact: true,
  });
  await name.focus();
  await name.press("Tab");
  await expect(left).toBeVisible();
  await expect(right).toBeVisible();
});
test("main menu remains usable from a hovered sidebar", async ({ page }) => {
  await page.keyboard.press("Tab");
  await page.mouse.move(1, 200);
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Preferences", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "General settings", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "General settings", exact: true }),
  ).toBeVisible();
});
test("avatar opens local and cloud workspaces; cloud shows development and uses the existing sign-in", async ({
  page,
  context,
}) => {
  await context.route("https://cloud.loyo.work/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Test sign-in window</h1>",
    }),
  );
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Workspace", exact: true });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("tab", { name: "Local workspace", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await dialog
    .getByRole("tab", { name: "Cloud workspace", exact: true })
    .click();
  await expect(
    dialog.getByText("In development", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-cloud.png",
    animations: "disabled",
  });
  await expect(
    dialog.getByRole("button", { name: "New design file", exact: true }),
  ).toHaveCount(0);
  const popupEvent = page.waitForEvent("popup");
  await dialog
    .getByRole("button", { name: "Sign in to LoyoCloud", exact: true })
    .click();
  const popup = await popupEvent;
  await popup.waitForURL("https://cloud.loyo.work/connect/baizefig?**");
  await popup.close();
  await dialog
    .getByRole("tab", { name: "Local workspace", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "New design file", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/workspace-local.png",
    animations: "disabled",
  });
});

for (const method of ["keyboard", "mouse"] as const) {
  for (const side of ["left", "right"] as const) {
    test(`${method} collapse can be restored by clicking the ${side} edge`, async ({
      page,
    }) => {
      if (method === "keyboard") await page.keyboard.press("Tab");
      else
        await page
          .getByRole("button", { name: "Collapse sidebars", exact: true })
          .click();
      const left = page.locator(".left-panel");
      const right = page.locator(".right-panel");
      await page.mouse.move(700, 600);
      await expect(left).toBeHidden();
      await expect(right).toBeHidden();
      await expect(left).toHaveCSS("transition-duration", "0.5s, 0s");
      await page.locator(`.sidebar-edge-${side}`).click();
      await page.mouse.move(700, 600);
      await expect(left).toBeVisible();
      await expect(right).toBeVisible();
      await expect(page.locator(".app")).not.toHaveClass(/ui-hidden/);
      await expect
        .poll(() => left.evaluate((el) => getComputedStyle(el).transform))
        .toBe("matrix(1, 0, 0, 1, 0, 0)");
      await expect
        .poll(() => right.evaluate((el) => getComputedStyle(el).transform))
        .toBe("matrix(1, 0, 0, 1, 0, 0)");
    });
  }
}
