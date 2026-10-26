import { test, expect } from "@playwright/test";

const base = "https://cloud.loyo.work";
const bridge = "wss://cloud.loyo.work/api/v1/bridge/baizefig";
const sessionKey = "baizefig.cloud.session.v1";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("baizefig.ui.language", "en");
    if (!localStorage.getItem("baizefig.cloud.session.v1")) {
      localStorage.setItem(
        "baizefig.cloud.session.v1",
        JSON.stringify({
          session: {
            token: "a".repeat(43),
            expiresAt: Date.now() + 86400000,
            user: { id: "test-user", username: "tester" },
            base: "https://cloud.loyo.work",
            mcpUrl: "https://cloud.loyo.work/mcp/baizefig",
          },
          autoConnect: false,
        }),
      );
    }
  });
  await page.route(base + "/api/v1/editor/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "test-user", username: "tester" },
        expires_at: Date.now() + 86400000,
        mcp_url: base + "/mcp/baizefig",
      }),
    }),
  );
});

test("restoring a legacy sign-in connects the current canvas without a click", async ({
  page,
}) => {
  const pairs: any[] = [];
  await page.routeWebSocket(bridge, (ws) =>
    ws.onMessage((raw) => {
      pairs.push(JSON.parse(String(raw)));
      ws.send(JSON.stringify({ type: "paired" }));
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Smart", exact: true }).click();
  await expect(
    page.locator(".cloud-status").filter({ hasText: /^Connected$/ }),
  ).toBeVisible();
  expect(pairs).toHaveLength(1);
  expect(pairs[0]).toMatchObject({ type: "pair", token: "a".repeat(43) });
  expect(pairs[0].documentId).toBeTruthy();
  expect(pairs[0].editorId).toBeTruthy();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).autoConnect,
      sessionKey,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Connect this canvas", exact: true }),
  ).toHaveCount(0);
  // The restored connection continues to follow the current document.
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page
    .getByRole("button", { name: "New design file", exact: true })
    .click();
  await expect.poll(() => pairs.length).toBe(2);
  expect(pairs[1].documentId).not.toBe(pairs[0].documentId);
  await page.screenshot({ path: "test-results/cloud-auto-connected.png" });
});

test("manual disconnect pauses retries on this page, but refresh reconnects", async ({
  page,
}) => {
  let connections = 0;
  await page.routeWebSocket(bridge, (ws) => {
    connections++;
    ws.onMessage(() => ws.send(JSON.stringify({ type: "paired" })));
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Smart", exact: true }).click();
  const status = page.locator(".cloud-mcp-card .cloud-status");
  await expect(status).toHaveText("Connected");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(status).toHaveText("Disconnected");
  // A network-recovery event must not override an explicit pause.
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText("tester", { exact: true })).toBeVisible();
  await expect(status).toHaveText("Disconnected");
  expect(connections).toBe(1);
  await page.reload();
  await page.getByRole("tab", { name: "Smart", exact: true }).click();
  await expect(status).toHaveText("Connected");
  expect(connections).toBe(2);
});

test("a rejected pairing does not permanently disable future automatic connections", async ({
  page,
}) => {
  let reject = true;
  await page.routeWebSocket(bridge, (ws) =>
    ws.onMessage(() => {
      if (reject)
        ws.close({ code: 1008, reason: "Invalid message or credentials" });
      else ws.send(JSON.stringify({ type: "paired" }));
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Smart", exact: true }).click();
  await expect(
    page.getByText(
      "Pairing rejected. Check the token and disconnect any other paired editor.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".cloud-mcp-card .cloud-status")).toHaveText(
    "Disconnected",
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).autoConnect,
      sessionKey,
    ),
  ).toBe(true);
  reject = false;
  await page.reload();
  await page.getByRole("tab", { name: "Smart", exact: true }).click();
  await expect(page.locator(".cloud-mcp-card .cloud-status")).toHaveText(
    "Connected",
  );
});
