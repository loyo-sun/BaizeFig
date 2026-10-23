import { chromium } from "../node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const sample of [
    { locale: "zh-CN", platform: "MacIntel", language: "zh-CN", modifier: "⌘" },
    { locale: "zh-TW", platform: "Win32", language: "zh-CN", modifier: "Ctrl" },
    { locale: "en-US", platform: "Win32", language: "en", modifier: "Ctrl" },
    { locale: "fr-FR", platform: "unknown", language: "en", modifier: "Ctrl" },
    { locale: "en-US", platform: "MacIntel", language: "en", modifier: "⌘" },
    {
      locale: "en-US",
      platform: "Win32",
      saved: "zh-CN",
      language: "zh-CN",
      modifier: "Ctrl",
    },
    {
      locale: "zh-CN",
      platform: "MacIntel",
      saved: "en",
      language: "en",
      modifier: "⌘",
    },
  ]) {
    const context = await browser.newContext({ locale: sample.locale });
    await context.addInitScript((s) => {
      Object.defineProperty(navigator, "platform", { get: () => s.platform });
      Object.defineProperty(navigator, "userAgentData", {
        get: () => undefined,
      });
      Object.defineProperty(navigator, "maxTouchPoints", { get: () => 0 });
      Object.defineProperty(navigator, "userAgent", {
        get: () =>
          s.platform === "MacIntel"
            ? "Mozilla Macintosh Mac OS X"
            : "Mozilla Windows",
      });
      if (s.saved) localStorage.setItem("baizefig.ui.language", s.saved);
    }, sample);
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4331");
    const english = sample.language === "en";
    await page
      .getByRole("button", {
        name: english ? "Workspace" : "工作区",
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.locator("html").getAttribute("lang"),
      sample.language,
    );
    await page
      .getByRole("button", {
        name: english ? "Main menu" : "主菜单",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: english ? "File" : "文件", exact: true })
      .hover();
    const item = page.getByRole("menuitem", {
      name: english ? "Save" : "保存",
      exact: true,
    });
    await item.waitFor();
    assert.equal(
      await item.locator("kbd").textContent(),
      sample.modifier + " + S",
    );
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    const download = page.waitForEvent("download");
    await page.keyboard.press(
      (sample.modifier === "⌘" ? "Meta" : "Control") + "+s",
    );
    assert.ok((await download).suggestedFilename().endsWith(".baizefig"));
    await context.close();
  }
  console.log(
    "PASS: fresh-device language defaults, saved language override, Mac/Windows/unknown shortcut hints and matching save keys",
  );
} finally {
  await browser.close();
}
