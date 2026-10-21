import { test, expect } from "@playwright/test";

test("help center opens from the version label and simplified main menu", async ({
  page,
}) => {
  await page.goto("/");
  const release = page.locator(".release-version");
  await expect(release.locator("span")).toHaveText("bate v0.01");
  const link = release.getByRole("link", { name: "帮助中心", exact: true });
  const stylesMatch = await release.evaluate((el) => {
    const version = getComputedStyle(el.querySelector("span")!);
    const help = getComputedStyle(el.querySelector("a")!);
    return ["fontSize", "fontFamily", "fontWeight", "color"].every(
      (key) =>
        version[key as keyof CSSStyleDeclaration] ===
        help[key as keyof CSSStyleDeclaration],
    );
  });
  expect(stylesMatch).toBe(true);
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "帮助中心", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "主菜单", exact: true }).click();
  for (const name of [
    "组件库",
    "在桌面应用中打开",
    "AI 额度",
    "MCP 连接",
    "帮助与账户",
  ])
    await expect(page.getByRole("menuitem", { name, exact: true })).toHaveCount(
      0,
    );
  await page.getByRole("menuitem", { name: "帮助与设置", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "帮助文档", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "MCP 连接", exact: true }),
  ).toHaveCount(0);
});

test("all help chapters contain content and MCP instructions are deep-linkable and searchable", async ({
  page,
}) => {
  await page.goto("/help/index.html#mcp");
  await expect(
    page.getByRole("heading", { name: "MCP 配置", exact: true }),
  ).toBeVisible();
  await expect(page.locator("article")).toContainText("BAIZEFIG_AUTO_PAIR");
  await expect(page.locator("article")).toContainText(
    "https://cloud.loyo.work/mcp/baizefig",
  );
  await expect(page.locator("article")).toContainText("REVISION_CONFLICT");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "MCP 配置", exact: true }),
  ).toBeVisible();
  const search = page.getByRole("searchbox");
  await search.fill("SOME_NONEXISTENT_HELP_KEYWORD");
  await expect(page.getByText("未找到相关章节", { exact: true })).toBeVisible();
  await search.fill("BAIZEFIG_AUTO_PAIR");
  const navigation = page.getByRole("navigation", { name: "文档章节" });
  await expect(navigation.locator("a:visible")).toHaveCount(1);
  await expect(navigation.locator("a:visible")).toHaveText("MCP 配置");
  await search.fill("");
  const ids = await navigation
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  expect(ids).toHaveLength(11);
  for (const hash of ids) {
    await navigation.locator(`a[href="${hash}"]`).click();
    await expect(navigation.locator(`a[href="${hash}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator("article h2").first()).toBeVisible();
    expect((await page.locator("article").innerText()).length).toBeGreaterThan(
      100,
    );
    await expect(page.locator("main")).not.toContainText("待编写");
  }
});

test("MCP instructions fit mobile and table of contents navigates within the chapter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/help/index.html#mcp");
  await page
    .getByRole("navigation", { name: "本章目录" })
    .getByRole("link", { name: "本机 stdio：自动连接画布", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "本机 stdio：自动连接画布",
      exact: true,
    }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "返回 BaizeFig ↗", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "主菜单", exact: true }),
  ).toBeVisible();
});
