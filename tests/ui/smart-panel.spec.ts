import { test, expect } from "@playwright/test";
for (const { language, theme, width } of [
  { language: "zh-CN", theme: "light", width: 1440 },
  { language: "zh-CN", theme: "dark", width: 1100 },
  { language: "en", theme: "light", width: 1100 },
  { language: "en", theme: "dark", width: 1440 },
])
  test(`Smart tab integrates cloud services: ${language} ${theme} ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(
      ({ language, theme }) => {
        localStorage.setItem("baizefig.ui.language", language);
        localStorage.setItem("baizefig.ui.theme", theme);
      },
      { language, theme },
    );
    await page.goto("/");
    await expect(
      page.getByLabel(language === "en" ? "Saved locally" : "已保存到本地", {
        exact: true,
      }),
    ).toBeVisible();
    const smart = page.getByRole("tab", {
      name: language === "en" ? "Smart" : "智能",
      exact: true,
    });
    await smart.click();
    await expect(smart).toHaveAttribute("aria-selected", "true");
    await expect(smart).toHaveCSS("background-color", theme === "dark" ? "rgb(46, 52, 52)" : "rgb(238, 240, 242)");
    const panel = page.getByRole("region", {
      name: language === "en" ? "Cloud services" : "云服务",
      exact: true,
    });
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("button", {
        name: language === "en" ? "Sign in to LoyoCloud" : "登录 LoyoCloud",
        exact: true,
      }),
    ).toBeEnabled();
    await page.screenshot({
      animations: "disabled",
      path: `test-results/smart-${language}-${theme}-${width}.png`,
    });
    const cloud = panel.getByRole("radio", { name: "LoyoCloud", exact: true });
    await cloud.focus();
    await page.keyboard.press("ArrowRight");
    const self = panel.getByRole("radio", {
      name: language === "en" ? "Your own deployment" : "自主部署",
      exact: true,
    });
    await expect(self).toBeFocused();
    await expect(self).toHaveAttribute("aria-checked", "true");
    await page
      .getByRole("tab", {
        name: language === "en" ? "Assets" : "资源",
        exact: true,
      })
      .click();
    await smart.click();
    await expect(self).toHaveAttribute("aria-checked", "true");
    const bounds = await panel.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(318);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const surfaces = await panel.evaluate((el) => ({
      panel: getComputedStyle(el).backgroundColor,
      root: getComputedStyle(document.documentElement)
        .getPropertyValue("--ui-surface")
        .trim(),
    }));
    expect(surfaces.panel).toBe(
      theme === "dark" ? "rgb(24, 24, 26)" : "rgb(255, 255, 255)",
    );
    await panel
      .getByRole("button", {
        name: language === "en" ? "Configure deployment" : "配置自主部署",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
