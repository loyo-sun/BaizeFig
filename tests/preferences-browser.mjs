import { fileURLToPath } from "node:url";
import { chromium } from "../node_modules/playwright-core/index.mjs";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("http://127.0.0.1:4331");
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  assert.equal(
    await page.locator('[data-menu-level="0"] > button').count(),
    10,
  );
  const paths = [];
  async function walk(level, path = []) {
    const panel = page.locator('[data-menu-level="' + level + '"]');
    const count = await panel.locator(":scope > button").count();
    for (let i = 0; i < count; i++) {
      const item = panel.locator(":scope > button").nth(i);
      const name = await item.getAttribute("aria-label");
      assert.notEqual(
        await item.getAttribute("title"),
        "Research in progress",
        path.concat(name).join(" / "),
      );
      if ((await item.getAttribute("aria-haspopup")) === "menu") {
        await item.hover();
        await page.locator('[data-menu-level="' + (level + 1) + '"]').waitFor();
        await walk(level + 1, path.concat(name));
      } else paths.push(path.concat(name).join(" / "));
    }
  }
  await walk(0);
  assert.ok(
    !paths.some(
      (p) =>
        p.startsWith("Plugins") ||
        p.startsWith("Widgets") ||
        p.includes("Save to version history"),
    ),
  );
  await page
    .getByRole("menuitem", { name: "Preferences", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Preferences", exact: true });
  await dialog.waitFor();
  const tab = (name) => dialog.getByRole("tab", { name, exact: true });
  assert.equal(await dialog.getByRole("tab").count(), 6);
  await dialog
    .getByLabel("Default save location", { exact: true })
    .selectOption("local");
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("baizefig.save.destination"),
    ),
    "local",
  );
  await tab("Appearance").click();
  await dialog.getByLabel("Theme", { exact: true }).selectOption("dark");
  assert.equal(
    await page.locator("html").getAttribute("data-ui-theme"),
    "dark",
  );
  await page.waitForTimeout(350);
  const output = new URL("../test-results/preferences/", import.meta.url);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL("dark.png", output)) });
  await dialog.getByLabel("Theme", { exact: true }).selectOption("light");
  await tab("Canvas aids").click();
  await dialog
    .getByRole("checkbox", { name: "Rulers and guides", exact: true })
    .check();
  await tab("Snapping").click();
  const snap = dialog.getByRole("checkbox", {
    name: "Snap to objects",
    exact: true,
  });
  const before = await snap.isChecked();
  await snap.click();
  assert.equal(await snap.isChecked(), !before);
  await tab("Keyboard shortcuts").click();
  await dialog
    .getByLabel("Keyboard layout", { exact: true })
    .selectOption("character");
  assert.ok((await dialog.locator(".shortcut-list kbd").count()) > 20);
  await tab("Fonts").click();
  await dialog.locator(".font-manager").waitFor();
  const search = dialog.getByRole("searchbox", {
    name: "Search settings",
    exact: true,
  });
  await search.fill("云端");
  assert.equal(await dialog.getByRole("tab").count(), 1);
  await dialog.getByLabel("Default save location", { exact: true }).waitFor();
  await search.fill("nothing-matches");
  await dialog.getByText("No matching settings", { exact: true }).waitFor();
  await search.fill("");
  await tab("General").click();
  await tab("General").press("ArrowDown");
  assert.equal(await tab("Appearance").getAttribute("aria-selected"), "true");
  await page.screenshot({
    path: fileURLToPath(new URL("desktop.png", output)),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth));
  await page.screenshot({ path: fileURLToPath(new URL("mobile.png", output)) });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Help", exact: true }).hover();
  await page
    .getByRole("menuitem", { name: "Keyboard shortcuts", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Preferences", exact: true })
    .getByLabel("Keyboard layout", { exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: " +
      paths.length +
      " menu actions, no placeholders, settings search, defaults, themes, canvas, snapping, keyboard, fonts and mobile",
  );
} finally {
  await browser.close();
}
