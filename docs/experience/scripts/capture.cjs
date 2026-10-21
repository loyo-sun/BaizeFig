const path = require("node:path");
const { chromium } = require(
  path.resolve(__dirname, "../../../node_modules/playwright"),
);
const fs = require("node:fs");
const out = path.resolve(__dirname, "..");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      locale: "en-US",
    });
    await page.addInitScript(() =>
      localStorage.setItem("baizefig.ui.language", "en"),
    );
    await page.goto("http://127.0.0.1:4318");
    await page.getByLabel("Saved locally", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Workspace", exact: true })
      .click();
    await page
      .getByRole("button", { name: "New design file", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("textbox", { name: "Document name", exact: true })
      .fill("New File 7");
    await page
      .getByRole("textbox", { name: "Document name", exact: true })
      .press("Tab");
    await page.mouse.move(950, 750);
    await page.waitForTimeout(1400);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out + "/evidence/empty.png" });
    await page.keyboard.press("r");
    await page.mouse.move(500, 280);
    await page.mouse.down();
    await page.mouse.move(700, 400, { steps: 12 });
    await page.mouse.up();
    await page.mouse.move(950, 750);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: out + "/evidence/rectangle.png" });
    await page.screenshot({ path: out + "/evidence/rectangle-repeat.png" });
    const geometry = await page
      .locator(
        ".left-panel,.right-panel,.tool-dock,.geometry-section .number-field,.right-tabs,.workspace-tabs",
      )
      .evaluateAll((es) =>
        es.map((e) => {
          const r = e.getBoundingClientRect(),
            s = getComputedStyle(e);
          return {
            selector: e.className,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            font: s.fontFamily,
            fontSize: s.fontSize,
          };
        }),
      );
    fs.writeFileSync(
      out + "/measurements.json",
      JSON.stringify(geometry, null, 2),
    );
    console.log("Captured stable matched sample");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
