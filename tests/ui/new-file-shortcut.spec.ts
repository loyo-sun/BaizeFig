import { test, expect } from "@playwright/test";

async function savedFiles(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const { listDocuments } = await import("/src/storage.ts");
    return listDocuments();
  });
}

test("Ctrl+Alt+N overrides the page default from a focused field and saves both files", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  const original = (await savedFiles(page))[0];
  const name = page.getByLabel("文件名称");
  await name.fill("新建前的源文件");
  // Leave the title field focused: the application chord must still take priority.
  const prevented = await name.evaluate(
    (el) =>
      !el.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyN",
          key: "n",
          ctrlKey: true,
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
  );
  expect(prevented).toBe(true);
  await expect(name).toHaveValue("未命名");
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(0);
  const docs = await savedFiles(page);
  expect(docs).toHaveLength(2);
  const source = docs.find((d) => d.id === original.id)!;
  expect(source.name).toBe("新建前的源文件");
  expect(source.nodes).toEqual(original.nodes);
  const next = docs.find((d) => d.id !== original.id)!;
  expect(next.nodes).toEqual([]);
  const last = await page.evaluate(async () => {
    const { loadLast } = await import("/src/storage.ts");
    return (await loadLast())?.id;
  });
  expect(last).toBe(next.id);
  await page.reload();
  await expect(name).toHaveValue("未命名");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await expect(page.locator(".design-canvas [data-node-id]")).toHaveCount(0);
  await page.getByRole("button", { name: "工作区", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("新建前的源文件");
  await expect(page.getByRole("dialog")).toContainText("未命名");
});

test("the shortcut works over the workspace dialog and ignores held-key repeats", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("已保存到本地", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "工作区", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Control+Alt+n");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByLabel("文件名称")).toHaveValue("未命名");
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyN",
        key: "n",
        ctrlKey: true,
        altKey: true,
        repeat: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(await savedFiles(page)).toHaveLength(2);
});
