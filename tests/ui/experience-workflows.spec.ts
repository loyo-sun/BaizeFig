import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyDocument, makeNode } from "../../src/core";
import { createComponentInstance } from "../../src/components";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("baizefig.ui.language", "en");
    localStorage.setItem("baizefig.ui.theme", "light");
  });
  await page.goto("/");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
});
async function load(page: Page, doc: ReturnType<typeof emptyDocument>) {
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "workflow.baizefig",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.getByRole("status")).toContainText("Document imported");
}
async function backup(page: Page) {
  const waiting = page.waitForEvent("download");
  await page.keyboard.press("Meta+s");
  return JSON.parse(await readFile((await (await waiting).path())!, "utf8"));
}
async function input(page: Page, label: string, value: string) {
  const field = page.getByRole("spinbutton", { name: label, exact: true });
  await field.fill(value);
  await field.press("Enter");
}
test("nested flex and grid edits preserve geometry, one-step history and native reload", async ({
  page,
}) => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("frame", p, {
      id: "outer",
      name: "Outer",
      x: 80,
      y: 140,
      width: 500,
      height: 400,
    }),
    makeNode("frame", p, {
      id: "inner",
      parentId: "outer",
      name: "Inner",
      x: 20,
      y: 20,
      width: 300,
      height: 180,
    }),
    makeNode("rectangle", p, {
      id: "one",
      parentId: "inner",
      width: 50,
      height: 40,
    }),
    makeNode("rectangle", p, {
      id: "two",
      parentId: "inner",
      x: 80,
      width: 70,
      height: 40,
    }),
  ];
  await load(page, doc);
  await page.getByRole("button", { name: "Toggle Outer", exact: true }).click();
  await page
    .locator(".layer-name")
    .filter({ hasText: /^Inner$/ })
    .click();
  await page.getByRole("button", { name: "→ Horizontal", exact: true }).click();
  await input(page, "Gap", "24");
  let saved = await backup(page);
  const nodes = () => saved.nodes;
  expect(
    nodes().find((n: any) => n.id === "two").x -
      nodes().find((n: any) => n.id === "one").x,
  ).toBe(74);
  await page.getByText("Layout options", { exact: true }).click();
  await input(page, "Padding left", "32");
  saved = await backup(page);
  expect(nodes().find((n: any) => n.id === "one").x).toBe(32);
  await page.keyboard.press("Meta+z");
  saved = await backup(page);
  expect(nodes().find((n: any) => n.id === "one").x).toBe(16);
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  const columns = page.getByRole("textbox", {
    name: "Grid columns",
    exact: true,
  });
  await columns.fill("100 1fr");
  await columns.press("Tab");
  saved = await backup(page);
  expect(
    nodes().find((n: any) => n.id === "inner").importedLayout.grid.columns,
  ).toEqual([
    { kind: "fixed", value: 100 },
    { kind: "fr", value: 1 },
  ]);
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  expect(
    (await backup(page)).nodes.find((n: any) => n.id === "inner").layout,
  ).toBe("grid");
});
test("image fit, crop cancellation and replacement retain layer size and undo", async ({
  page,
}) => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  const png =
    "data:image/png;base64," +
    (
      await readFile("docs/experience/evidence/drawing-test-pattern.png")
    ).toString("base64");
  doc.nodes = [
    makeNode("rectangle", p, {
      id: "photo",
      name: "Photo",
      x: 182,
      y: 280,
      width: 200,
      height: 120,
      image: png,
      fidelity: {
        size: [200, 120],
        image: {
          mode: "fill",
          transform: [1, 0, 0, 1, 0, 0],
          width: 160,
          height: 100,
          scale: 1,
          opacity: 1,
        },
      },
    }),
  ];
  await load(page, doc);
  await page
    .locator(".layer-name")
    .filter({ hasText: /^Photo$/ })
    .click();
  await page
    .getByRole("combobox", { name: "Image mode", exact: true })
    .selectOption("fit");
  expect((await backup(page)).nodes[0].fidelity.image.mode).toBe("fit");
  await page
    .getByRole("combobox", { name: "Image mode", exact: true })
    .selectOption("crop");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await backup(page)).nodes[0].fidelity.image.mode).toBe("fit");
  await page
    .getByRole("combobox", { name: "Image mode", exact: true })
    .selectOption("crop");
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();
  expect((await backup(page)).nodes[0].fidelity.image.mode).toBe("crop");
  await page.keyboard.press("Meta+z");
  expect((await backup(page)).nodes[0].fidelity.image.mode).toBe("fit");
  const replacement = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 12;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 24, 12);
    return c.toDataURL().split(",")[1];
  });
  await page
    .getByLabel("Replacement image file", { exact: true })
    .setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(replacement, "base64"),
    });
  await expect(
    page.getByRole("combobox", { name: "Image mode", exact: true }),
  ).toHaveValue("fill");
  const saved = await backup(page);
  expect(saved.nodes[0]).toMatchObject({
    width: 200,
    height: 120,
    fidelity: { image: { width: 24, height: 12 } },
  });
  await page.keyboard.press("Meta+z");
  expect((await backup(page)).nodes[0].image).toBe(png);
});
test("component child text overrides survive reopen and reset independently", async ({
  page,
}) => {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.nodes = [
    makeNode("component", p, {
      id: "main",
      name: "Card",
      x: 80,
      y: 180,
      width: 220,
      height: 140,
    }),
    makeNode("text", p, {
      id: "label",
      parentId: "main",
      name: "Title",
      text: "Default",
      x: 20,
      y: 20,
      width: 150,
      height: 50,
    }),
  ];
  const instance = createComponentInstance(doc, "main", p, 400, 180);
  await load(page, instance.doc);
  await page
    .locator(`[data-layer-id="${instance.id}"]`)
    .getByRole("button", { name: "Toggle Card", exact: true })
    .click();
  const child = instance.doc.nodes.find(
    (n) => n.componentOwner === instance.id && n.type === "text",
  )!;
  await page.locator(`[data-layer-id="${child.id}"] .layer-name`).click();
  await page.keyboard.press("Enter");
  const editor = page.getByRole("textbox", {
    name: "Edit text on canvas",
    exact: true,
  });
  await editor.fill("Instance title");
  await editor.press("Escape");
  let saved = await backup(page);
  expect(saved.nodes.find((n: any) => n.id === "label").text).toBe("Default");
  expect(
    saved.nodes.find(
      (n: any) => n.componentOwner === instance.id && n.type === "text",
    ).text,
  ).toBe("Instance title");
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Saved locally", { exact: true })).toBeVisible();
  saved = await backup(page);
  expect(
    saved.nodes.find(
      (n: any) => n.componentOwner === instance.id && n.type === "text",
    ).text,
  ).toBe("Instance title");
  await page
    .locator(`[data-layer-id="${instance.id}"]`)
    .getByRole("button", { name: "Toggle Card", exact: true })
    .click();
  await page.locator(`[data-layer-id="${child.id}"] .layer-name`).click();
  await page.getByRole("button", { name: "More actions", exact: true }).click();
  await page.locator(".override-panel > summary").click();
  await page
    .getByRole("button", {
      name: "Reset selected layer overrides",
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  expect(
    (await backup(page)).nodes.find((n: any) => n.id === child.id).text,
  ).toBe("Default");
  await page.keyboard.press("Meta+z");
  expect(
    (await backup(page)).nodes.find((n: any) => n.id === child.id).text,
  ).toBe("Instance title");
});
test("vector editing moves a real point, keeps local undo and survives export", async ({
  page,
}) => {
  const doc = emptyDocument();
  await load(page, doc);
  await page.keyboard.press("Shift+c");
  await page.mouse.click(500, 280);
  await page.mouse.click(650, 280);
  await page.mouse.click(600, 400);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  const first = page.getByLabel("Vector node 1", { exact: true });
  await expect(first).toBeAttached();
  await page.screenshot({path:"docs/experience/evidence/final-vector-editing.png"});
  const b = (await first.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2 + 10, {
    steps: 10,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const saved = await backup(page);
  expect(saved.nodes).toHaveLength(1);
  expect(saved.nodes[0].fidelity.network.vertices.length).toBe(3);
  await page.keyboard.press("Meta+z");
  const undone = await backup(page);
  expect(undone.nodes[0].fidelity.network.vertices).not.toEqual(
    saved.nodes[0].fidelity.network.vertices,
  );
});
