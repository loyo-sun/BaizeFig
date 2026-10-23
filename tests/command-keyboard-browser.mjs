import { chromium } from "../node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4331");
  await page.getByRole("button", { name: "Workspace", exact: true }).waitFor();
  await page.keyboard.press("ControlOrMeta+Shift+p");
  const input = page.getByRole("combobox", {
    name: "Search actions",
    exact: true,
  });
  await input.waitFor();
  const list = page.getByRole("listbox", {
    name: "Suggested commands",
    exact: true,
  });
  const options = list.getByRole("option");
  const enabled = await options.evaluateAll((items) =>
    items
      .filter((item) => !item.disabled)
      .map((item) => item.getAttribute("aria-label")),
  );
  const active = () =>
    list.locator('[aria-selected="true"]').getAttribute("aria-label");
  assert.equal(await active(), enabled[0]);
  await input.press("ArrowUp");
  assert.equal(await active(), enabled.at(-1));
  assert.ok(
    await list.evaluate((el) => {
      const selected = el.querySelector('[aria-selected="true"]');
      const a = selected.getBoundingClientRect(),
        b = el.getBoundingClientRect();
      return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
    }),
  );
  await input.press("ArrowDown");
  assert.equal(await active(), enabled[0]);
  for (let i = 1; i < Math.min(20, enabled.length); i++) {
    await input.press("ArrowDown");
    assert.equal(await active(), enabled[i]);
  }
  const beforeHome = await active();
  await input.press("Home");
  assert.equal(await active(), beforeHome);
  await input.fill("Redo");
  assert.equal(await list.locator('[aria-selected="true"]').count(), 0);
  await input.press("Enter");
  await input.waitFor();
  await input.fill("no-match-zzzzz");
  await input.press("ArrowDown");
  await input.press("Enter");
  assert.equal(await options.count(), 0);
  await page.getByText("No matching commands", { exact: true }).waitFor();
  await input.fill("phsz");
  assert.equal(await active(), "Preferences");
  assert.equal(
    await input.getAttribute("aria-activedescendant"),
    await list.locator('[aria-selected="true"]').getAttribute("id"),
  );
  await input.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
  });
  await input.waitFor();
  await input.press("Enter");
  await page
    .getByRole("dialog", { name: "Preferences", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.keyboard.press("ControlOrMeta+Shift+p");
  await input.waitFor();
  await input.press("Escape");
  await input.waitFor({ state: "detached" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: arrow selection, wrapping, disabled skipping, automatic scrolling, filtered reset, empty results, IME safety, Enter execution and Escape",
  );
} finally {
  await browser.close();
}
