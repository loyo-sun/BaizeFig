import { chromium } from "../node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const language of ["en", "zh-CN"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.addInitScript(
      (value) => localStorage.setItem("baizefig.ui.language", value),
      language,
    );
    await page.goto("http://127.0.0.1:4331");
    await page
      .getByRole("button", {
        name: language === "en" ? "Workspace" : "工作区",
        exact: true,
      })
      .waitFor();
    await page.keyboard.press("ControlOrMeta+Shift+p");
    const input = page.getByRole("textbox", {
      name: language === "en" ? "Search actions" : "搜索操作",
      exact: true,
    });
    await input.waitFor();
    for (const query of [
      "pianhaoshezhi",
      "phsz",
      "PIAN HAO SHE ZHI",
      "偏好设置",
      "preferences",
    ]) {
      await input.fill(query);
      await page
        .locator(".action-list")
        .getByRole("button", {
          name: language === "en" ? "Preferences" : "偏好设置",
          exact: true,
        })
        .waitFor();
    }
    for (const query of ["baocun", "bc", "bǎocún", "保存", "SAVE"]) {
      await input.fill(query);
      await page
        .locator(".action-list")
        .getByRole("button", {
          name: language === "en" ? "Save" : "保存",
          exact: false,
        })
        .first()
        .waitFor();
    }
    await input.fill("chongzuo");
    await page
      .locator(".action-list")
      .getByRole("button", {
        name: language === "en" ? "Redo" : "重做",
        exact: false,
      })
      .waitFor();
    await input.fill("unmatched-command-zzzz");
    assert.equal(await page.locator(".action-list button").count(), 0);
    await input.fill("phsz");
    await page
      .locator(".action-list")
      .getByRole("button", {
        name: language === "en" ? "Preferences" : "偏好设置",
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog", {
        name: language === "en" ? "Preferences" : "偏好设置",
        exact: true,
      })
      .waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    "PASS: Chinese, English, full pinyin, initials, tones, spaces and command execution in both interface languages",
  );
} finally {
  await browser.close();
}
