import { chromium } from "../node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.addInitScript(() => {
    localStorage.setItem("baizefig.ui.language", "en");
    localStorage.setItem(
      "baizefig.cloud.session.v1",
      JSON.stringify({
        session: {
          base: "https://cloud.loyo.work",
          mcpUrl: "https://cloud.loyo.work/mcp/baizefig",
          token: "test-token-12345678901234567890",
          expiresAt: Date.now() + 3600000,
          user: { id: "demo", username: "demo_user" },
        },
        autoConnect: false,
      }),
    );
  });
  let saves = 0,
    moves = 0,
    deletes = 0,
    stored = null,
    head = null;
  const requests = [];
  await context.route("https://cloud.loyo.work/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = {},
      status = 200;
    if (path.endsWith("/editor/session"))
      data = {
        user: { id: "demo", username: "demo_user" },
        expires_at: Date.now() + 3600000,
        mcp_url: "https://cloud.loyo.work/mcp/baizefig",
      };
    else if (path.endsWith("/space"))
      data = {
        folders: [{ id: "folder1", name: "项目设计", parent_id: null }],
        files: [],
      };
    else if (path.endsWith("/save")) {
      const body = route.request().postDataJSON();
      requests.push(body);
      stored = body.content;
      head = "head" + ++saves;
      data = { headId: head };
    } else if (path.endsWith("/move")) {
      moves++;
      data = { ok: true };
    } else if (path.endsWith("/delete")) {
      deletes++;
      data = { ok: true };
    } else if (stored)
      data = {
        file: { head_id: head, folder_id: "folder1" },
        content: stored,
        versions: [],
      };
    else {
      status = 404;
      data = { error_description: "文件不存在" };
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:4331" },
      body: JSON.stringify(data),
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4331");
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page.getByRole("tab", { name: "Cloud workspace", exact: true }).click();
  await page.getByText("demo_user", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.keyboard.press("ControlOrMeta+s");
  const dialog = page.getByRole("dialog", { name: "保存文件", exact: true });
  await dialog.waitFor();
  await dialog.getByRole("radio", { name: "云端", exact: false }).check();
  await dialog
    .getByRole("button", { name: "📁 项目设计", exact: true })
    .click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(saves, 1);
  assert.equal(requests[0].folderId, "folder1");
  assert.equal(moves, 1);
  await page.keyboard.press("ControlOrMeta+s");
  await page.waitForTimeout(1000);
  assert.equal(saves, 2);
  assert.equal(requests[1].headId, "head1");
  assert.equal(requests[1].overwrite, true);
  assert.equal(deletes, 1);
  assert.equal(await dialog.count(), 0);
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "File", exact: true }).hover();
  await page.getByRole("menuitem", { name: /Save to cloud/ }).waitFor();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+Shift+p");
  await page
    .getByRole("textbox", { name: "Search actions", exact: true })
    .fill("General settings");
  await page
    .getByRole("button", { name: "General settings", exact: true })
    .click();
  await page.getByLabel("默认保存位置", { exact: true }).selectOption("local");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.keyboard.press("ControlOrMeta+s");
  assert.ok((await download).suggestedFilename().endsWith(".baizefig"));
  assert.equal(await dialog.count(), 0);
  assert.deepEqual(errors, []);
  const plain = await browser.newContext({ acceptDownloads: true });
  const local = await plain.newPage();
  await local.goto("http://127.0.0.1:4331");
  await local
    .getByRole("button", { name: /Workspace|工作区/, exact: true })
    .waitFor();
  const localDownload = local.waitForEvent("download");
  await local.keyboard.press("ControlOrMeta+s");
  assert.ok((await localDownload).suggestedFilename().endsWith(".baizefig"));
  assert.equal(
    await local.getByRole("dialog", { name: "保存文件", exact: true }).count(),
    0,
  );
  await plain.close();
  console.log(
    "PASS: Ctrl+S choice, cloud path, default, repeated overwrite on existing API, dynamic menu, settings, local and signed-out download",
  );
} finally {
  await browser.close();
}
