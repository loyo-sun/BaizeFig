import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
for (const key of ["Delete", "Backspace"])
  test(`Control+${key} ungroups in Chrome and preserves children`, async ({
    page,
  }) => {
    const source = JSON.parse(
      await readFile("design/BaizeFig-欢迎页.baizefig", "utf8"),
    );
    const base = source.nodes.find((n) => n.type === "rectangle");
    const pageId = source.pages[0].id;
    const doc = {
      ...source,
      id: "ungroup-test",
      pages: [source.pages[0]],
      nodes: [
        {
          ...base,
          id: "group-test",
          pageId,
          type: "group",
          name: "测试分组",
          parentId: null,
          x: 100,
          y: 100,
          width: 200,
          height: 100,
          fill: "none",
        },
        {
          ...base,
          id: "child-a",
          pageId,
          type: "rectangle",
          name: "子图层 A",
          parentId: "group-test",
          x: 10,
          y: 20,
          width: 60,
          height: 40,
        },
        {
          ...base,
          id: "child-b",
          pageId,
          type: "rectangle",
          name: "子图层 B",
          parentId: "group-test",
          x: 100,
          y: 20,
          width: 60,
          height: 40,
        },
      ],
    };
    await page.goto("/");
    await expect(
      page.getByLabel("已保存到本地", { exact: true }),
    ).toBeVisible();
    await page
      .locator("input[type=file][multiple]")
      .setInputFiles({
        name: "ungroup.baizefig",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(doc)),
      });
    await page
      .locator(".layer-name")
      .filter({ hasText: /^测试分组$/ })
      .click();
    await page.keyboard.press("Control+" + key);
    await expect(
      page.locator(".layer-name").filter({ hasText: /^测试分组$/ }),
    ).toHaveCount(0);
    await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(2);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { loadLast } = await import("/src/storage.ts");
          return (await loadLast())?.nodes.map((n) => ({
            id: n.id,
            parentId: n.parentId,
            x: n.x,
            y: n.y,
          }));
        }),
      )
      .toEqual([
        { id: "child-a", parentId: null, x: 110, y: 120 },
        { id: "child-b", parentId: null, x: 200, y: 120 },
      ]);
    await page.keyboard.press("Meta+z");
    await expect(
      page.locator(".layer-name").filter({ hasText: /^测试分组$/ }),
    ).toBeVisible();
  });
