import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { retiredDesignTokens } from "../fixtures/retiredDesignTokens";
for (const language of ["en", "zh-CN"])
  test(`retired design tokens are absent and old designs remain editable: ${language}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (language) => localStorage.setItem("baizefig.ui.language", language),
      language,
    );
    await page.goto("/");
    await expect(
      page.getByLabel(language === "en" ? "Saved locally" : "已保存到本地", {
        exact: true,
      }),
    ).toBeVisible();
    const doc = retiredDesignTokens();
    await page.locator("input[type=file][multiple]").setInputFiles({
      name: "retired.baizefig",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(doc)),
    });
    await expect(
      page.getByRole("tab", {
        name: language === "en" ? "Tokens" : "令牌",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.locator(".token-workspace,.token-editor")).toHaveCount(0);
    await page.locator('[data-layer-id="text"] .layer-name').click();
    await expect(
      page.getByRole("spinbutton", {
        name: language === "en" ? "Size" : "字号",
        exact: true,
      }),
    ).toHaveValue("28");
    const backup = async () => {
      const waiting = page.waitForEvent("download");
      await page.keyboard.press("Meta+s");
      return JSON.parse(
        await readFile((await (await waiting).path())!, "utf8"),
      );
    };
    await page.screenshot({
      path: `docs/experience/evidence/tokens-removed-${language}.png`,
    });
    const saved = await backup();
    for (const key of [
      "variables",
      "typedVariables",
      "variableCollections",
      "compositeTokens",
      "tokenThemes",
    ])
      expect(saved[key]).toBeUndefined();
    expect(saved.nodes.find((n: any) => n.id === "text")).toMatchObject({
      text: "Preserved text",
      fontSize: 28,
      fill: "#8855cc",
    });
    expect(saved.nodes.find((n: any) => n.id === "hidden").visible).toBe(false);
    expect(
      saved.nodes.find((n: any) => n.id === "rect").fidelity.effects[0].radius,
    ).toBe(8);
    const size = page.getByRole("spinbutton", {
      name: language === "en" ? "Size" : "字号",
      exact: true,
    });
    await size.fill("32");
    await size.press("Enter");
    await page.keyboard.press("Meta+z");
    await expect(size).toHaveValue("28");
    await page.reload();
    await expect(
      page.getByLabel(language === "en" ? "Saved locally" : "已保存到本地", {
        exact: true,
      }),
    ).toBeVisible();
    expect((await backup()).compositeTokens).toBeUndefined();
  });
