import { test, expect } from "@playwright/test";
const base = "https://cloud.loyo.work",
  id = "ad307120-e98e-40c6-8d12-50b717314def";
const session = {
  token: "a".repeat(43),
  expiresAt: Date.now() + 86400000,
  user: { id: "link-test", username: "tester" },
  base,
  mcpUrl: base + "/mcp/baizefig",
};
const target = {
  format: "baizefig",
  version: 1,
  id,
  name: "所选云文件",
  pages: [{ id: "page-1", name: "Selected page" }],
  nodes: [],
  background: "#e8e9ea",
};
async function setup(page: any, signedIn = true) {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Document name", exact: true })
    .waitFor();
  // Seed the genuine last-document path that caused the misleading old canvas.
  await page
    .getByRole("textbox", { name: "Document name", exact: true })
    .fill("乐悦路书");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { loadLast } = await import("/src/storage.ts");
        return (await loadLast())?.name;
      }),
    )
    .toBe("乐悦路书");
  if (signedIn)
    await page.evaluate(
      ({ session }) =>
        localStorage.setItem(
          "baizefig.cloud.session.v1",
          JSON.stringify({ session, autoConnect: true }),
        ),
      { session },
    );
  await page.route(base + "/api/v1/editor/session", (route) =>
    route.fulfill({
      json: {
        user: session.user,
        expires_at: session.expiresAt,
        mcp_url: session.mcpUrl,
      },
    }),
  );
  await page.route(base + "/api/v1/space/files/" + id + "/edit", (route) =>
    route.fulfill({
      json: { lock: { holder: "另一设备", label: "另一设备" } },
    }),
  );
  await page.routeWebSocket(
    "wss://cloud.loyo.work/api/v1/bridge/baizefig",
    (ws) => ws.onMessage(() => ws.send(JSON.stringify({ type: "paired" }))),
  );
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
});

test("a slow cloud link hides the last local document until the selected file arrives", async ({
  page,
}) => {
  await setup(page);
  let finish!: () => void;
  const held = new Promise<void>((r) => (finish = r));
  await page.route(base + "/api/v1/space/files/" + id, async (route) => {
    await held;
    await route.fulfill({
      json: {
        file: { id, head_id: "head", folder_id: null, name: target.name },
        content: target,
      },
    });
  });
  await page.goto("/?cloudFile=" + id);
  await expect(
    page.getByRole("heading", {
      name: "Opening selected cloud file…",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).not.toBeVisible();
  await expect(page.getByText("乐悦路书", { exact: true })).not.toBeVisible();
  await page.screenshot({ path: "test-results/cloud-link-loading.png" });
  finish();
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).toHaveValue(target.name);
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/cloudFile=/);
  await page.screenshot({ path: "test-results/cloud-link-opened.png" });
});

test("failed cloud links stay explicit and can retry without reloading or showing the old canvas", async ({
  page,
}) => {
  await setup(page);
  let attempts = 0;
  await page.route(base + "/api/v1/space/files/" + id, (route) =>
    ++attempts === 1
      ? route.fulfill({
          status: 500,
          json: { error_description: "暂时无法下载" },
        })
      : route.fulfill({
          json: {
            file: { id, head_id: "head", folder_id: null, name: target.name },
            content: target,
          },
        }),
  );
  await page.goto("/?cloudFile=" + id);
  await expect(
    page.getByRole("heading", {
      name: "Unable to open cloud file",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).not.toBeVisible();
  await page.screenshot({ path: "test-results/cloud-link-error.png" });
  await page
    .getByRole("button", { name: "Retry opening file", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).toHaveValue(target.name);
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});

test("a signed-out cloud link asks for sign-in and keeps the requested ID", async ({
  page,
}) => {
  await setup(page, false);
  await page.goto("/?cloudFile=" + id);
  await expect(
    page.getByRole("button", { name: "Sign in to LoyoCloud", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).not.toBeVisible();
  await expect(page).toHaveURL(new RegExp("cloudFile=" + id));
});

test("mismatched file content is rejected instead of binding it to the selected cloud file", async ({
  page,
}) => {
  await setup(page);
  await page.route(base + "/api/v1/space/files/" + id, (route) =>
    route.fulfill({
      json: {
        file: { id, head_id: "head", name: target.name },
        content: { ...target, id: "another-file", name: "错误文档" },
      },
    }),
  );
  await page.goto("/?cloudFile=" + id);
  await expect(page.getByRole("alert")).toHaveText(
    "The returned file does not match the selected file.",
  );
  await expect(
    page.getByRole("textbox", { name: "Document name", exact: true }),
  ).not.toBeVisible();
  await expect(page).toHaveURL(/cloudFile=/);
});
