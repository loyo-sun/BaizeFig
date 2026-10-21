import { test, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { emptyDocument, makeNode } from "../../src/core";
const evidence = "docs/experience/evidence/matrix";
for (const [width, height] of [
  [1100, 800],
  [1440, 1000],
  [1920, 1080],
])
  for (const language of ["en", "zh-CN"])
    for (const theme of ["light", "dark"]) {
      test(`${width} ${language} ${theme} property and popup bounds`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await page.addInitScript(
          ({ language, theme }) => {
            localStorage.setItem("baizefig.ui.language", language);
            localStorage.setItem("baizefig.ui.theme", theme);
          },
          { language, theme },
        );
        await page.goto("/");
        await expect(
          page.getByLabel(
            language === "en" ? "Saved locally" : "已保存到本地",
            {
              exact: true,
            },
          ),
        ).toBeAttached();
        const doc = emptyDocument();
        doc.nodes = [
          makeNode("rectangle", doc.pages[0].id, {
            id: "sample",
            name: "Rectangle",
            x: 182,
            y: 280,
            width: 200,
            height: 120,
            fill: "#b1b2b5",
          }),
        ];
        await page.locator("input[type=file][multiple]").setInputFiles({
          name: "matrix.baizefig",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(doc)),
        });
        await page.locator('[data-layer-id="sample"] .layer-name').click();
        await expect(page.locator("html")).toHaveAttribute(
          "data-ui-theme",
          theme,
        );
        for (const side of [".left-panel", ".right-panel"])
          expect((await page.locator(side).boundingBox())!.width).toBe(318);
        const color = page.getByRole("button", {
          name: language === "en" ? "Fill color" : "填充颜色",
          exact: true,
        });
        await color.click();
        const picker = page.getByRole("dialog", {
          name: language === "en" ? "Color picker" : "颜色选择器",
          exact: true,
        });
        await expect(picker).toBeVisible();
        const b = (await picker.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(width);
        expect(b.y + b.height).toBeLessThanOrEqual(height);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await mkdir(evidence, { recursive: true });
        await page.mouse.move(950, 750);
        await page.screenshot({
          path: `${evidence}/${width}-${language}-${theme}-color.png`,
        });
        await page.keyboard.press("Escape");
        await expect(picker).toBeHidden();
        await expect(page.locator('[data-layer-id="sample"]')).toHaveAttribute(
          "aria-selected",
          "true",
        );
      });
    }
test("native Chinese IME composition commits once and survives undo and redo", async ({
  page,
  context,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  const doc = emptyDocument();
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "ime.baizefig",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.mouse.click(500, 280);
  const editor = page.getByRole("textbox", {
    name: "Edit text on canvas",
    exact: true,
  });
  await editor.fill("");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.imeSetComposition", {
    text: "中",
    selectionStart: 1,
    selectionEnd: 1,
  });
  await expect(editor).toContainText("中");
  await cdp.send("Input.insertText", { text: "中文" });
  await page.keyboard.press("Enter");
  await cdp.send("Input.insertText", { text: "排版" });
  await editor.press("Escape");
  const backup = async () => {
    const pending = page.waitForEvent("download");
    await page.keyboard.press("Meta+s");
    return JSON.parse(await readFile((await (await pending).path())!, "utf8"));
  };
  expect((await backup()).nodes[0].text).toBe("中文\n排版");
  await page.keyboard.press("Meta+z");
  await page.keyboard.press("Meta+Shift+z");
  expect((await backup()).nodes[0].text).toBe("中文\n排版");
  await cdp.detach();
});
test("ordinary color and typography palettes apply values without token bindings", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("text", p, {
      id: "target",
      name: "Target",
      text: "Target",
      x: 182,
      y: 280,
    }),
    makeNode("text", p, {
      id: "style",
      name: "Style",
      text: "Style",
      x: 482,
      y: 480,
      fontSize: 28,
      fontWeight: 600,
      fill: "#dd4400",
    }),
  ];
  await page
    .locator("input[type=file][multiple]")
    .setInputFiles({
      name: "styles.baizefig",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(doc)),
    });
  await page.locator('[data-layer-id="target"] .layer-name').click();
  await page
    .getByRole("button", { name: "Color palette", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply color #DD4400", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Typography palette", exact: true })
    .click();
  await page
    .locator(".palette-typography button")
    .filter({ hasText: "28 / 600" })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("spinbutton", { name: "Size", exact: true }),
  ).toHaveValue("28");
  await page.keyboard.press("Meta+z");
  await expect(
    page.getByRole("spinbutton", { name: "Size", exact: true }),
  ).toHaveValue("24");
});
