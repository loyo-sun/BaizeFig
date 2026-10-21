import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyDocument, makeNode } from "../../src/core";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("baizefig.ui.language", "en");
    localStorage.setItem("baizefig.ui.theme", "light");
  });
  await page.goto("/");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Local files", exact: true }).click();
  await page
    .getByRole("button", { name: "New design file", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
async function draw(page: Page) {
  await page.keyboard.press("r");
  await page.mouse.move(500, 280);
  await page.mouse.down();
  await page.mouse.move(700, 400, { steps: 8 });
  await page.mouse.up();
}
async function backup(page: Page) {
  const waiting = page.waitForEvent("download");
  await page.keyboard.press("Meta+s");
  const file = await waiting;
  return JSON.parse(await readFile((await file.path())!, "utf8"));
}
test("color controls remain open across paint changes and a drag is one undo step", async ({
  page,
}) => {
  await draw(page);
  await page.getByRole("button", { name: "Fill color", exact: true }).click();
  const picker = page.getByRole("dialog", {
    name: "Color picker",
    exact: true,
  });
  await expect(picker).toBeVisible();
  await page.screenshot({
    path: "docs/experience/evidence/final-color-picker.png",
  });
  const hex = picker.getByRole("textbox", { name: "Color HEX", exact: true });
  await hex.fill("#FF0000");
  await hex.press("Enter");
  await expect(hex).toHaveValue("#FF0000");
  const plane = picker.getByLabel("Saturation and brightness", { exact: true }),
    b = (await plane.boundingBox())!;
  await page.mouse.move(b.x + 50, b.y + 40);
  await page.mouse.down();
  await page.mouse.move(b.x + 180, b.y + 90, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await page.keyboard.press("Meta+z");
  expect((await backup(page)).nodes[0].fill.toLowerCase()).toBe("#ff0000");
  await page.getByRole("button", { name: "Fill color", exact: true }).click();
  await picker
    .getByRole("combobox", { name: "Fill type", exact: true })
    .selectOption("linear");
  await expect(picker).toBeVisible();
  expect((await backupAfterClose(page)).nodes[0].fidelity.paints[0].type).toBe(
    "linear",
  );
});
async function backupAfterClose(page: Page) {
  await page.keyboard.press("Escape");
  return backup(page);
}
test("sidebar collapse and live window resize keep rulers fitted to the canvas", async ({
  page,
}) => {
  await draw(page);
  const frame = page.locator(".canvas-frame > rect");
  await page
    .getByRole("button", { name: "Collapse left sidebar", exact: true })
    .click();
  await expect(page.locator(".left-panel")).toBeHidden();
  await expect(frame).toHaveAttribute("width", "1098");
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(frame).toHaveAttribute("width", "758");
  await page
    .getByRole("button", { name: "Expand left sidebar", exact: true })
    .click();
  await expect(page.locator(".left-panel")).toBeVisible();
  await expect(frame).toHaveAttribute("width", "440");
});
test("corner resize and exterior rotation have separate measured hit regions", async ({
  page,
}) => {
  await draw(page);
  await page.mouse.move(707, 407);
  await page.mouse.down();
  await page.mouse.move(717, 417, { steps: 8 });
  await page.mouse.up();
  await expect(
    page.getByRole("spinbutton", { name: "W", exact: true }),
  ).toHaveValue("210");
  await page.keyboard.press("Meta+z");
  await page.mouse.move(714, 414);
  await page.mouse.down();
  await page.mouse.move(700, 430, { steps: 8 });
  await page.mouse.up();
  expect(
    Number(
      await page
        .getByRole("spinbutton", { name: "Rotation", exact: true })
        .inputValue(),
    ),
  ).toBeGreaterThan(1);
  await expect(
    page.getByRole("spinbutton", { name: "W", exact: true }),
  ).toHaveValue("200");
  await page.keyboard.press("Meta+z");
  await expect(
    page.getByRole("spinbutton", { name: "Rotation", exact: true }),
  ).toHaveValue("0");
});
test("paint opacity and shadow parameters commit a single undoable edit", async ({
  page,
}) => {
  await draw(page);
  const opacity = page.getByRole("spinbutton", {
    name: "Fill opacity 1",
    exact: true,
  });
  await opacity.fill("45");
  await opacity.press("Enter");
  expect((await backup(page)).nodes[0].fidelity.paints[0].opacity).toBe(0.45);
  await page.keyboard.press("Meta+z");
  await expect(opacity).toHaveValue("100");
  await page.getByRole("button", { name: "Add shadow", exact: true }).click();
  await page
    .locator(".effects-properties")
    .filter({
      has: page.getByRole("button", { name: "Add shadow", exact: true }),
    })
    .getByRole("button", { name: "Drop shadow", exact: true })
    .click();
  const blur = page.getByRole("spinbutton", {
    name: "Blur radius",
    exact: true,
  });
  await blur.fill("12");
  await blur.press("Enter");
  await page.keyboard.press("Escape");
  expect((await backup(page)).nodes[0].fidelity.effects[0].radius).toBe(12);
  await page.keyboard.press("Meta+z");
  expect((await backup(page)).nodes[0].fidelity.effects[0].radius).toBe(4);
});
test("prototype port creates a persisted navigation and preview follows it", async ({
  page,
}) => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("frame", p, {
      id: "a",
      name: "Start",
      x: 70,
      y: 150,
      width: 220,
      height: 350,
    }),
    makeNode("frame", p, {
      id: "b",
      name: "Destination",
      x: 500,
      y: 180,
      width: 230,
      height: 340,
    }),
    makeNode("rectangle", p, {
      id: "button",
      parentId: "a",
      name: "Next",
      x: 30,
      y: 90,
      width: 120,
      height: 50,
      fill: "#cc2200",
    }),
  ];
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "prototype.baizefig",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.getByRole("status")).toContainText("Document imported");
  await page.getByRole("button", { name: "Toggle Start", exact: true }).click();
  await page
    .locator(".layer-name")
    .filter({ hasText: /^Next$/ })
    .click();
  await page.getByRole("button", { name: "Prototype", exact: true }).click();
  const port = page.getByLabel("Connect prototype", { exact: true }),
    box = (await port.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(900, 350, { steps: 16 });
  await page.mouse.up();
  const saved = await backup(page),
    source = saved.nodes.find((n: any) => n.id === "button");
  expect(source.interactions[0].actions[0]).toMatchObject({
    type: "navigate",
    targetId: "b",
  });
  await page.screenshot({
    path: "docs/experience/evidence/final-prototype-wires.png",
  });
  await page.getByRole("button", { name: "Present", exact: true }).click();
  const preview = page.getByLabel("Prototype preview", { exact: true });
  await expect(preview).toHaveAttribute("data-prototype-root", "a");
  await preview.locator('[data-node-id="button"]').first().click();
  await expect(preview).toHaveAttribute("data-prototype-root", "b");
});
test("inspect displays actual CSS and SVG, fonts support search and keyboard selection", async ({
  page,
}) => {
  await draw(page);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  const code = page.getByLabel("Layer code", { exact: true });
  await expect(code).toContainText("200px");
  await page
    .getByRole("combobox", { name: "Inspect code format", exact: true })
    .selectOption("SVG");
  await expect(code).toContainText("<svg");
  await expect(code).toContainText(/#b1b2b5/i);
  await page.screenshot({ path: "docs/experience/evidence/final-inspect.png" });
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("t");
  await page.mouse.click(550, 480);
  const editor = page.getByRole("textbox", {
    name: "Edit text on canvas",
    exact: true,
  });
  await editor.fill("中文 Typography");
  await editor.press("Meta+Enter");
  await page.getByRole("button", { name: "Font family", exact: true }).click();
  const search = page.getByRole("textbox", {
    name: "Search fonts",
    exact: true,
  });
  await search.fill("Inter");
  await page.screenshot({
    path: "docs/experience/evidence/final-font-picker.png",
  });
  await search.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Font family", exact: true }),
  ).toBeHidden();
  expect(
    (await backup(page)).nodes.find((n: any) => n.type === "text").text,
  ).toBe("中文 Typography");
});
test("rotated selection keeps local dimensions and Alt resize keeps the center", async ({
  page,
}) => {
  await draw(page);
  await page.keyboard.down("Alt");
  await page.mouse.move(700, 400);
  await page.mouse.down();
  await page.mouse.move(720, 410, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  for (const [name, value] of [
    ["W", "220"],
    ["H", "130"],
    ["X", "172"],
    ["Y", "275"],
  ])
    await expect(
      page.getByRole("spinbutton", { name, exact: true }),
    ).toHaveValue(value);
  await page.keyboard.press("Meta+z");
  const rotation = page.getByRole("spinbutton", {
    name: "Rotation",
    exact: true,
  });
  await rotation.fill("30");
  await rotation.press("Enter");
  await expect(
    page.getByRole("spinbutton", { name: "X", exact: true }),
  ).toHaveValue("165.4");
  await expect(
    page.getByRole("spinbutton", { name: "W", exact: true }),
  ).toHaveValue("200");
  await expect(
    page.getByLabel("Rotate selection se", { exact: true }),
  ).toBeAttached();
});
test("theme follows the operating system without changing document paints", async ({
  page,
}) => {
  await draw(page);
  const initial = (await backup(page)).nodes[0].fill;
  await page.getByRole("button", { name: "Extensions", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "General settings", exact: true })
    .click();
  const theme = page.getByRole("combobox", { name: "Theme", exact: true });
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "dark");
  await theme.selectOption("system");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "light");
  await page.keyboard.press("Escape");
  expect((await backup(page)).nodes[0].fill).toBe(initial);
});
test("aspect ratio is persisted, numeric resize is atomic and fill collapse is reversible", async ({
  page,
}) => {
  await draw(page);
  await page
    .getByRole("button", { name: "Lock aspect ratio", exact: true })
    .click();
  await page.getByRole("spinbutton", { name: "W", exact: true }).fill("240");
  await page.getByRole("spinbutton", { name: "W", exact: true }).press("Enter");
  await expect(
    page.getByRole("spinbutton", { name: "H", exact: true }),
  ).toHaveValue("144");
  await page.keyboard.press("Meta+z");
  await expect(
    page.getByRole("spinbutton", { name: "W", exact: true }),
  ).toHaveValue("200");
  expect((await backup(page)).nodes[0].constrainProportions).toBe(true);
  await page.getByRole("button", { name: "Fill", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fill color", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Fill", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fill color", exact: true }),
  ).toBeVisible();
});
