import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Local files", exact: true }).click();
  await page
    .getByRole("button", { name: "New design file", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
const field = (page: Page, name: string) =>
  page.getByRole("spinbutton", { name, exact: true });
async function draw(page: Page, keys: string[] = [], reverse = false) {
  await page.keyboard.press("r");
  for (const key of keys) await page.keyboard.down(key);
  await page.mouse.move(reverse ? 700 : 500, reverse ? 400 : 280);
  await page.mouse.down();
  await page.mouse.move(reverse ? 500 : 700, reverse ? 280 : 400, {
    steps: 12,
  });
  await page.mouse.up();
  for (const key of keys.reverse()) await page.keyboard.up(key);
}
for (const [name, keys, reverse, width, height, x, y] of [
  ["plain", [], false, "200", "120", "182", "280"],
  ["shift", ["Shift"], false, "200", "200", "182", "280"],
  ["center", ["Alt"], false, "400", "240", "-18", "160"],
  ["reverse", [], true, "200", "120", "182", "280"],
  ["center constrained", ["Alt", "Shift"], false, "400", "400", "-18", "80"],
  ["center reverse", ["Alt"], true, "400", "240", "182", "280"],
] as const)
  test(`reference drawing ${name}`, async ({ page }) => {
    await draw(page, [...keys], reverse);
    for (const [key, value] of [
      ["W", width],
      ["H", height],
      ["X", x],
      ["Y", y],
    ])
      await expect(field(page, key)).toHaveValue(value);
  });
test("mixed geometry, atomic input, undo and redo preserve selection", async ({
  page,
}) => {
  await draw(page);
  await field(page, "W").fill("240");
  await field(page, "W").press("Enter");
  await page.keyboard.press("Meta+z");
  await expect(field(page, "W")).toHaveValue("200");
  await page.keyboard.press("Meta+Shift+z");
  await expect(field(page, "W")).toHaveValue("240");
  await field(page, "W").fill("999");
  await field(page, "W").press("Escape");
  await expect(field(page, "W")).toHaveValue("240");
  await page.keyboard.press("Escape");
  await page.keyboard.press("r");
  await page.mouse.move(760, 450);
  await page.mouse.down();
  await page.mouse.move(880, 520, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.press("Meta+a");
  for (const key of ["W", "H", "X", "Y"])
    await expect(field(page, key)).toHaveValue("");
  await field(page, "W").focus();
  await field(page, "W").press("Tab");
  await expect(field(page, "W")).toHaveValue("");
  await field(page, "W").fill("180");
  await field(page, "W").press("Enter");
  await expect(field(page, "W")).toHaveValue("180");
  await page.keyboard.press("Meta+z");
  await expect(field(page, "W")).toHaveValue("");
});
test("drag Escape commits the last move as one undoable transaction", async ({
  page,
}) => {
  await draw(page);
  await page.mouse.move(600, 340);
  await page.mouse.down();
  await page.mouse.move(650, 380, { steps: 12 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(field(page, "X")).toHaveValue("232");
  await expect(field(page, "Y")).toHaveValue("320");
  await page.keyboard.press("Meta+z");
  await expect(field(page, "X")).toHaveValue("182");
  await expect(field(page, "Y")).toHaveValue("280");
});
test("workspace measurements, extension access, menus and inspect", async ({
  page,
}) => {
  for (const [selector, x, width] of [
    [".left-panel", 0, 318],
    [".right-panel", 1122, 318],
    [".tool-dock", 567.5, 305],
  ] as const) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.x).toBe(x);
    expect(box.width).toBe(width);
  }
  await draw(page);
  const input = (await field(page, "W").boundingBox())!;
  expect(input.height).toBe(32);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.locator(".inspect-panel pre")).toContainText(
    "width: 200px",
  );
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByRole("button", { name: "Extensions", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "MCP connection", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(field(page, "W")).toHaveValue("200");
  await page.keyboard.press("b");
  await expect(
    page.getByRole("button", { name: "Board", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("e");
  await expect(
    page.getByRole("button", { name: "Ellipse", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Shift+c");
  await expect(
    page.getByRole("button", { name: "Curve", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("inspector popover dismissal preserves the editable selection", async ({
  page,
}) => {
  await draw(page);
  const trigger = page.getByRole("button", {
    name: "Geometry options",
    exact: true,
  });
  await trigger.click();
  const popup = page.getByRole("dialog", {
    name: "Geometry options",
    exact: true,
  });
  await expect(popup).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(field(page, "W")).toHaveValue("200");
  await trigger.click();
  await page.mouse.click(950, 750);
  await expect(popup).toBeHidden();
  await expect(field(page, "W")).toHaveValue("200");
});

test("nudge, Alt duplicate and component shortcut keep one-step history", async ({
  page,
}) => {
  await draw(page);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(field(page, "X")).toHaveValue("183");
  await expect(field(page, "Y")).toHaveValue("290");
  await page.keyboard.down("Alt");
  await page.mouse.move(600, 350);
  await page.mouse.down();
  await page.mouse.move(850, 500, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await expect(page.locator(".layer-name")).toHaveCount(2);
  await page.keyboard.press("Meta+z");
  await expect(page.locator(".layer-name")).toHaveCount(1);
  await page.keyboard.press("Meta+Shift+z");
  await expect(page.locator(".layer-name")).toHaveCount(2);
  await page.keyboard.press("Meta+k");
  await expect(
    page.getByLabel("Main component", { exact: true }).first(),
  ).toBeVisible();
  await page.keyboard.press("Meta+z");
  await expect(page.locator(".layer-name")).toHaveCount(2);
});

test("reference keyboard zoom anchors the pointer and reset restores the origin", async ({
  page,
}) => {
  await page.mouse.click(950, 800);
  await page.keyboard.press("Meta+-");
  await expect(
    page.getByRole("button", { name: "Zoom menu", exact: true }),
  ).toHaveText("77%");
  await draw(page, ["Alt"]);
  for (const [key, value] of [
    ["W", "520"],
    ["H", "312"],
    ["X", "-213"],
    ["Y", "-32"],
  ])
    await expect(field(page, key)).toHaveValue(value);
  await page.keyboard.press("Meta+0");
  await expect(
    page.locator("svg.design-canvas > g[transform]").first(),
  ).toHaveAttribute("transform", "translate(0 0) scale(1)");
});

test("workspace remains usable at the two secondary viewports", async ({
  page,
}) => {
  for (const [width, height] of [
    [1100, 800],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    const left = (await page.locator(".left-panel").boundingBox())!;
    const right = (await page.locator(".right-panel").boundingBox())!;
    const toolbar = (await page.locator(".tool-dock").boundingBox())!;
    expect(left.width).toBe(318);
    expect(right.width).toBe(318);
    expect(right.x).toBe(width - 318);
    expect(toolbar.x).toBe(width / 2 - 152.5);
    expect(toolbar.y).toBe(28);
    await page.getByRole("button", { name: "Extensions", exact: true }).click();
    const menu = (await page.getByRole("menu").boundingBox())!;
    expect(menu.x).toBeGreaterThanOrEqual(0);
    expect(menu.x + menu.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: `docs/experience/evidence/workspace-${width}x${height}.png`,
    });
  }
});

test("selected geometry exports actual SVG and PNG without the reference environment", async ({
  page,
}) => {
  await draw(page);
  await page.keyboard.press("Meta+Shift+e");
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Export scope", { exact: true })
    .selectOption("selection");
  await dialog
    .getByLabel("Export background", { exact: true })
    .selectOption("transparent");
  for (const format of ["SVG", "PNG"]) {
    await dialog
      .getByLabel("Export dialog format", { exact: true })
      .selectOption(format);
    const pending = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Download export", exact: true })
      .click();
    const download = await pending;
    const bytes = await readFile((await download.path())!);
    expect(download.suggestedFilename()).toMatch(
      new RegExp("\\." + format.toLowerCase() + "$"),
    );
    if (format === "SVG") {
      const svg = bytes.toString("utf8");
      expect(svg).toContain('width="200"');
      expect(svg).toContain('height="120"');
      expect(svg.toLowerCase()).toContain("#b1b2b5");
    } else {
      expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      expect(bytes.readUInt32BE(16)).toBe(200);
      expect(bytes.readUInt32BE(20)).toBe(120);
    }
    await expect(dialog.getByRole("status")).toHaveText("Export complete");
  }
});
