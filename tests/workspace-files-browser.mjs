import { chromium } from "../node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4331");
  const thumbnail = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 360;
    const x = c.getContext("2d");
    x.fillStyle = "#f0eaff";
    x.fillRect(0, 0, 600, 360);
    x.fillStyle = "#fff";
    x.fillRect(30, 25, 540, 310);
    x.fillStyle = "#713ae8";
    x.fillRect(55, 55, 120, 22);
    x.fillStyle = "#172635";
    x.font = "bold 32px sans-serif";
    x.fillText("Create something great.", 55, 140);
    x.fillStyle = "#e5ddfc";
    x.fillRect(55, 170, 290, 12);
    x.fillRect(55, 195, 250, 12);
    x.fillStyle = "#713ae8";
    x.fillRect(55, 250, 120, 40);
    x.fillStyle = "#bca4f1";
    x.beginPath();
    x.arc(460, 200, 65, 0, Math.PI * 2);
    x.fill();
    return c.toDataURL();
  });
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
  await context.route("https://cloud.loyo.work/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/v1/space"))
      assert.equal(
        route.request().headers()["authorization"],
        "Bearer test-token-12345678901234567890",
      );
    const data = path.endsWith("/editor/session")
      ? {
          user: { id: "demo", username: "demo_user" },
          expires_at: Date.now() + 3600000,
          mcp_url: "https://cloud.loyo.work/mcp/baizefig",
        }
      : path.endsWith("/thumbnail")
        ? { thumbnail, headId: "v1" }
        : {
            folders: [{ id: "folder1", name: "品牌设计", parent_id: null }],
            files: ["官网首页", "产品介绍", "移动端设计"].map((name, i) => ({
              id: "file" + i,
              name,
              folder_id: null,
              head_id: "v1",
              updated_at: "2026-10-23T06:00:00Z",
            })),
          };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:4331" },
      body: JSON.stringify(data),
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page.getByRole("tab", { name: "Cloud workspace", exact: true }).click();
  await page.getByAltText("官网首页 thumbnail", { exact: true }).waitFor();
  await page.waitForTimeout(300);
  const box = await page.locator(".modal-files").boundingBox();
  assert.equal(box.x, 0);
  assert.equal(box.y, 0);
  assert.equal(box.width, 1440);
  assert.equal(box.height, 1000);
  await mkdir(new URL("../test-results/workspace-redesign", import.meta.url), {
    recursive: true,
  });
  const output = new URL("../test-results/workspace-redesign/", import.meta.url)
    .pathname;
  await page.screenshot({ path: output + "cloud-grid.png" });
  await page.getByRole("button", { name: "List view", exact: true }).click();
  assert.equal(await page.locator(".cloud-file-list").count(), 1);
  assert.equal(await page.locator(".cloud-thumbnail").count(), 0);
  await page.screenshot({ path: output + "cloud-list.png" });
  await page.getByRole("button", { name: "Icon view", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page
      .locator(".modal-files")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  );
  await page.screenshot({ path: output + "cloud-mobile.png" });
  await page.getByRole("tab", { name: "Local workspace", exact: true }).click();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  assert.equal(await page.locator(".local-file-list").count(), 1);
  assert.ok(
    await page
      .locator(".modal-files")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: fullscreen bounds, authenticated thumbnail grid, view switching, local list and mobile overflow",
  );
} finally {
  await browser.close();
}
