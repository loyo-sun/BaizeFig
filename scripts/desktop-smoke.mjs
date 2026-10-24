import { _electron as electron, expect } from "@playwright/test";
import electronPath from "electron";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const profile = await mkdtemp(join(tmpdir(), "baizefig-desktop-ui-"));
const root = resolve(".");
let app, client;
const launch = async () => {
  app = await electron.launch({
    executablePath: process.env.BAIZEFIG_DESKTOP_EXECUTABLE || electronPath,
    args: process.env.BAIZEFIG_DESKTOP_EXECUTABLE ? [] : [root],
    env: { ...process.env, BAIZEFIG_DESKTOP_TEST_DATA: profile },
    timeout: 30000,
  });
  const page = await app.firstWindow();
  page.on("pageerror", (e) => console.error("Renderer:", e.message));
  await page.waitForLoadState("domcontentloaded");
  return page;
};
const close = async () => {
  if (!app) return;
  // Quit via app lifecycle, avoiding the interactive user close confirmation.
  await app.evaluate(({ app: nativeApp }) => nativeApp.quit());
  await app.close();
  app = undefined;
};
const text = (result) => {
  assertResult(result);
  return JSON.parse(result.content[0].text);
};
function assertResult(result) {
  if (result.isError) throw Error(JSON.stringify(result));
}
try {
  let page = await launch();
  await page.evaluate(() => localStorage.setItem("baizefig.ui.language", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Saved locally")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      get: () => false,
      configurable: true,
    });
    window.dispatchEvent(new Event("offline"));
  });
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page
    .getByRole("button", { name: "New design file", exact: true })
    .click();
  await page.evaluate(() => window.baizefigDesktop.mcp("install"));
  const status = await page.evaluate(() => window.baizefigDesktop.status());
  expect(status.running).toBe(true);
  expect(status.version).toBe(
    JSON.parse(await readFile(join(root, "package.json"), "utf8"))
      .displayVersion,
  );
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Search commands", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Search actions", exact: true })
    .fill("MCP connection");
  await page
    .getByRole("option", { name: "MCP connection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "连接桌面本机 MCP", exact: true })
    .click();
  await expect(page.locator(".mcp-wizard .connection-state")).toHaveText(
    "Connected",
  );
  const entry = JSON.parse(status.config).mcpServers.baizefig;
  client = new Client({ name: "desktop-ui-test", version: "1" });
  await client.connect(new StdioClientTransport({ ...entry, stderr: "pipe" }));
  expect((await client.listTools()).tools).toHaveLength(8);
  const doc = text(
    await client.callTool({ name: "get_document", arguments: {} }),
  );
  const args = {
    documentId: doc.documentId,
    editorId: doc.editorId,
    expectedRevision: doc.revision,
    idempotencyKey: crypto.randomUUID(),
    commands: [
      {
        type: "create",
        nodes: [
          {
            id: "desktop-offline-shape",
            pageId: doc.pages[0].id,
            type: "rectangle",
            name: "Desktop offline persistence",
            x: 80,
            y: 80,
            width: 120,
            height: 80,
            fill: "#6574cd",
          },
        ],
      },
    ],
  };
  const denied = await client.callTool({
    name: "apply_commands",
    arguments: args,
  });
  expect(denied.isError).toBe(true);
  await page
    .getByRole("checkbox", {
      name: "Allow MCP to modify the currently open document",
      exact: true,
    })
    .check();
  assertResult(
    await client.callTool({ name: "apply_commands", arguments: args }),
  );
  const updated = text(
    await client.callTool({ name: "get_document", arguments: {} }),
  );
  expect(updated.nodes.some((n) => n.id === "desktop-offline-shape")).toBe(
    true,
  );
  // An OS offline event must not tear down a loopback connection.
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.locator(".mcp-wizard .connection-state")).toHaveText(
    "Connected",
  );
  assertResult(await client.callTool({ name: "get_document", arguments: {} }));
  await client.close();
  client = undefined;
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Saved locally")).toBeVisible();
  await mkdir(join(root, "test-results"), { recursive: true });
  await page.screenshot({
    path: join(root, "test-results/desktop-editor.png"),
  });
  await close();
  page = await launch();
  await expect(page.getByLabel("Saved locally")).toBeVisible();
  await expect(
    page.getByText("Desktop offline persistence", { exact: true }).first(),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        async () => (await window.baizefigDesktop.status()).running,
      ),
    )
    .toBe(true);
  const settingsPromise = app.waitForEvent("window");
  await page.evaluate(() => window.baizefigDesktop.manage());
  const settings = await settingsPromise;
  await settings.waitForLoadState("domcontentloaded");
  await expect(
    settings.getByRole("heading", { name: "桌面设置" }),
  ).toBeVisible();
  await settings.screenshot({
    path: join(root, "test-results/desktop-settings.png"),
  });
  await page.evaluate(() => window.baizefigDesktop.mcp("stop"));
  expect(
    (await page.evaluate(() => window.baizefigDesktop.status())).running,
  ).toBe(false);
  await page.evaluate(() => window.baizefigDesktop.mcp("start"));
  expect(
    (await page.evaluate(() => window.baizefigDesktop.status())).running,
  ).toBe(true);
  await page.evaluate(() => window.baizefigDesktop.mcp("uninstall"));
  const removed = await page.evaluate(() => window.baizefigDesktop.status());
  expect(removed.installed).toBe(false);
  expect(removed.running).toBe(false);
  expect(removed.pairingToken).toBe("");
  await close();
  console.log(
    "PASS: offline editor persistence, bundled runtime stdio MCP, pairing, write permission, restart, management UI, stop/start/uninstall.",
  );
} finally {
  await client?.close().catch(() => {});
  await close().catch(() => {});
  await rm(profile, { recursive: true, force: true });
}
