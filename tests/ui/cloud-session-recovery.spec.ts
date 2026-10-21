import { test, expect } from "@playwright/test";
const base = "https://cloud.loyo.work";
test("missing recovery endpoint stops the spinner, preserves sign-in and allows retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("baizefig.ui.language", "en");
    if (!localStorage.getItem("baizefig.cloud.session.v1"))
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
  });
  let available = false;
  await page.route(base + "/api/v1/editor/session", (route) =>
    route.fulfill({
      status: available ? 200 : 404,
      contentType: "application/json",
      body: JSON.stringify(
        available
          ? {
              user: { id: "test-user", username: "tester" },
              expires_at: Date.now() + 86400000,
              mcp_url: base + "/mcp/baizefig",
            }
          : { error: "not_found" },
      ),
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Smart", exact: true }).click();
  await expect(
    page.getByText(
      "Cloud service needs an update before sign-in can be restored. Your saved sign-in is kept.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in to LoyoCloud", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("baizefig.cloud.session.v1"),
    ),
  ).not.toBeNull();
  available = true;
  await page
    .getByRole("button", { name: "Retry restoring sign-in", exact: true })
    .click();
  await expect(page.getByText("tester", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect this canvas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restoring sign-in…", exact: true }),
  ).toHaveCount(0);
});
