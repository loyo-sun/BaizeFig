import { test, expect, type Page } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
// @ts-expect-error server is intentionally plain JavaScript, shared with Node deployment.
import { createBridge } from "../../bridge/server.mjs";
async function openMcp(page: Page) {
  await page.getByRole("button", { name: "Cloud", exact: true }).click();
  await page
    .getByRole("button", { name: "MCP connection", exact: true })
    .click();
}
const token = "integration-access-" + "a".repeat(40);
const pairingToken = "integration-pairing-" + "p".repeat(40);
for (const implementation of ["sdk", "json-rpc"] as const) {
  test(`${implementation}: live paired design, preview, edit, screenshot, retry, undo and revoke`, async ({
    page,
  }) => {
    const bridge = createBridge({
      http: true,
      host: "127.0.0.1",
      port: 0,
      accessToken: token,
      pairingToken,
    });
    const address = await bridge.start();
    const url = `http://127.0.0.1:${address.port}/mcp`;
    let client: Client | undefined;
    let rpcId = 0;
    const rpc = async (method: string, params: unknown) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "MCP-Protocol-Version": "2025-06-18",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
      });
      expect(response.status).toBe(200);
      const value = await response.json();
      if (value.error) throw Error(JSON.stringify(value.error));
      return value.result;
    };
    const call = async (
      name: string,
      args: Record<string, unknown> = {},
    ): Promise<any> =>
      implementation === "sdk"
        ? client!.callTool({ name, arguments: args })
        : rpc("tools/call", { name, arguments: args });
    const text = (r: any) => {
      expect(r.isError).not.toBe(true);
      return JSON.parse(r.content[0].text);
    };
    try {
      await page.addInitScript(() =>
        localStorage.setItem("baizefig.ui.language", "en"),
      );
      await page.goto("/");
      await expect(page.getByText("Saved locally")).toBeVisible();
      await page
        .getByRole("button", { name: "Local files", exact: true })
        .click();
      await page
        .getByRole("button", { name: "New design file", exact: true })
        .click();
      await openMcp(page);
      await page
        .getByText("Manual pairing and advanced settings", { exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "MCP service address", exact: true })
        .fill(url);
      await page
        .getByLabel("Bridge pairing token", { exact: true })
        .fill(pairingToken);
      await page
        .getByRole("button", { name: "Connect bridge", exact: true })
        .click();
      await expect(page.locator(".mcp-wizard .connection-state")).toHaveText("Connected");
      if (implementation === "sdk") {
        client = new Client({
          name: "baizefig-browser-integration",
          version: "1",
        });
        await client.connect(
          new StreamableHTTPClientTransport(new URL(url), {
            requestInit: { headers: { Authorization: `Bearer ${token}` } },
          }),
        );
        expect((await client.listTools()).tools).toHaveLength(8);
      } else {
        const initialized = await rpc("initialize", {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "independent-json-rpc-client", version: "1" },
        });
        expect(initialized.protocolVersion).toBe("2025-06-18");
        expect((await rpc("tools/list", {})).tools).toHaveLength(8);
      }
      const initial = text(await call("get_document"));
      const target = {
        documentId: initial.documentId,
        editorId: initial.editorId,
      };
      const commands = [
        {
          type: "create",
          nodes: [
            {
              id: "mcp-frame",
              pageId: initial.pages[0].id,
              type: "frame",
              name: "MCP Login",
              x: 0,
              y: 0,
              width: 390,
              height: 600,
            },
            {
              id: "mcp-title",
              pageId: initial.pages[0].id,
              parentId: "mcp-frame",
              type: "text",
              text: "Welcome",
              width: 220,
              height: 40,
              x: 24,
              y: 40,
            },
          ],
        },
      ];
      const batch = {
        ...target,
        expectedRevision: initial.revision,
        idempotencyKey: "create-login",
        commands,
      };
      expect((await call("apply_commands", batch)).isError).toBe(true);
      expect((await call("get_screenshot", target)).isError).toBe(true);
      await page
        .getByRole("checkbox", {
          name: "Allow MCP to modify the currently open document",
          exact: true,
        })
        .check();
      await page
        .getByRole("checkbox", {
          name: "Allow MCP screenshots and SVG export",
          exact: true,
        })
        .check();
      expect(text(await call("preview_commands", batch)).created).toHaveLength(
        2,
      );
      expect(text(await call("get_document")).nodes).toHaveLength(0);
      const applied = text(await call("apply_commands", batch));
      expect(text(await call("apply_commands", batch))).toEqual(applied);
      expect(
        text(
          await call("get_request_status", {
            ...target,
            idempotencyKey: batch.idempotencyKey,
          }),
        ).status,
      ).toBe("applied");
      await expect(
        page.locator('.design-canvas [data-node-id="mcp-frame"]'),
      ).toHaveCount(1);
      const read = text(await call("get_document"));
      expect(read.nodes).toHaveLength(2);
      const update = {
        ...target,
        expectedRevision: read.revision,
        idempotencyKey: "update-title",
        commands: [
          {
            type: "update",
            ids: ["mcp-title"],
            patch: { text: "Sign in with BaizeFig", fill: "#2563EB" },
          },
        ],
      };
      text(await call("apply_commands", update));
      await expect(page.locator(".design-canvas")).toContainText(
        "Sign in with BaizeFig",
      );
      expect(
        (await call("apply_commands", { ...batch, idempotencyKey: "stale" }))
          .isError,
      ).toBe(true);
      const png = await call("get_screenshot", target);
      expect(png.content[0].type).toBe("image");
      const pngBytes = Buffer.from(png.content[0].data, "base64");
      expect(pngBytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(pngBytes.readUInt32BE(16)).toBeGreaterThan(0);
      expect(text(await call("export_svg", target))).toContain("<svg");
      const latest = text(await call("get_document"));
      const invalid = {
        ...target,
        expectedRevision: latest.revision,
        idempotencyKey: "rollback",
        commands: [
          {
            type: "update",
            ids: ["mcp-title"],
            patch: { text: "must roll back" },
          },
          { type: "delete", ids: ["missing"] },
        ],
      };
      expect((await call("apply_commands", invalid)).isError).toBe(true);
      expect(text(await call("get_document")).revision).toBe(latest.revision);
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await page
        .locator(".design-canvas")
        .click({ position: { x: 10, y: 10 } });
      await page.keyboard.press("ControlOrMeta+z");
      await expect
        .poll(
          async () =>
            text(await call("get_document")).nodes.find(
              (n: any) => n.id === "mcp-title",
            )?.text,
        )
        .toBe("Welcome");
      await page.keyboard.press("ControlOrMeta+z");
      expect(text(await call("get_document")).nodes).toHaveLength(0);
      // Return to the completed design for the recorded preview.
      await page.keyboard.press("ControlOrMeta+Shift+z");
      await page.keyboard.press("ControlOrMeta+Shift+z");
      await expect(page.getByText("Saved locally")).toBeVisible();
      await page.screenshot({
        path: `test-results/mcp-${implementation}-design.png`,
        fullPage: true,
      });
      await openMcp(page);
      await page
        .getByText("Manual pairing and advanced settings", { exact: true })
        .click();
      await page
        .getByRole("button", { name: "Disconnect", exact: true })
        .click();
      await expect(page.locator(".mcp-wizard .connection-state")).toHaveText(
        "Disconnected",
      );
      await expect(
        page.getByRole("checkbox", {
          name: "Allow MCP to modify the currently open document",
          exact: true,
        }),
      ).not.toBeChecked();
      expect((await call("get_document")).isError).toBe(true);
      // Re-pair: same editor lifetime retains receipt lookup, but no write permission.
      await page
        .getByRole("button", { name: "Connect bridge", exact: true })
        .click();
      await expect(page.locator(".mcp-wizard .connection-state")).toHaveText("Connected");
      expect(
        text(
          await call("get_request_status", {
            ...target,
            idempotencyKey: batch.idempotencyKey,
          }),
        ).status,
      ).toBe("applied");
      expect((await call("apply_commands", batch)).isError).toBe(true);
      // Switching local files revokes the old pairing and write access.
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Local files", exact: true })
        .click();
      await page
        .getByRole("button", { name: "New design file", exact: true })
        .click();
      await expect
        .poll(async () => (await call("get_document")).isError)
        .toBe(true);
    } finally {
      await client?.close();
      await bridge.close();
    }
  });
}

test("left Cloud panel replaces Tools and opens local deployment without an account", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  await expect(
    page.locator(".right-panel").getByRole("button", { name: /MCP/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tools", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cloud", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Cloud services", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in to LoyoCloud", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "LoyoCloud sign-in is not available yet. You can use your own MCP deployment below.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/cloud-panel.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Local deployment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "This computer", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Connect automatically", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mcp-config-preview")).toContainText(
    "BAIZEFIG_AUTO_PAIR",
  );
});

test("unified wizard exports generic guides and keeps deployment secrets private", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  await page.addInitScript(() =>
    localStorage.setItem("baizefig.ui.language", "en"),
  );
  await page.goto("/");
  await openMcp(page);
  await expect(
    page.getByRole("region", {
      name: "Unified remote connection",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".mcp-wizard")).not.toContainText(
    /WorkBuddy|ChatGPT|豆包|Doubao/,
  );
  await expect(
    page.getByRole("button", { name: "Copy MCP address", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "test-results/mcp-unified-remote.png",
    fullPage: true,
  });
  await page.getByText("Local connection (advanced)", { exact: true }).click();
  await page
    .getByRole("button", { name: "This computer", exact: true })
    .click();
  const local = JSON.parse(
    await page.locator(".mcp-config-preview").innerText(),
  );
  expect(local.mcpServers.baizefig.env.BAIZEFIG_ORIGINS).toBe(
    "http://127.0.0.1:4318",
  );
  expect(local.mcpServers.baizefig.env.BAIZEFIG_AUTO_PAIR).toBe("1");
  await page.getByRole("button", { name: "Online MCP", exact: true }).click();
  await page
    .getByRole("textbox", { name: "MCP service address", exact: true })
    .fill("https://mcp.example.com/mcp");
  await page.getByRole("button", { name: "Online MCP", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "MCP service address", exact: true }),
  ).toHaveValue("https://mcp.example.com/mcp");
  await page
    .getByText("Manual pairing and advanced settings", { exact: true })
    .click();
  const envDownload = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Generate service configuration",
      exact: true,
    })
    .click();
  const env = readFileSync((await (await envDownload).path())!, "utf8");
  expect(env).toContain("BAIZEFIG_AUTH_MODE=oauth");
  expect(env).toContain("BAIZEFIG_ORIGINS=http://127.0.0.1:4318");
  const token = env.match(/BAIZEFIG_PAIRING_TOKEN=(.+)/)![1];
  const guideDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download connection guide", exact: true })
    .click();
  const raw = readFileSync((await (await guideDownload).path())!, "utf8");
  const guide = JSON.parse(raw);
  expect(guide.url).toBe("https://mcp.example.com/mcp");
  expect(guide.authentication).toEqual({ type: "OAuth", pkce: "S256" });
  expect(raw).not.toContain(token);
  expect(raw).not.toMatch(/WorkBuddy|ChatGPT|Doubao|豆包/);
});

test("OAuth access is approved in the real canvas and revoked on disconnect", async ({
  page,
}) => {
  const { createHash } = await import("node:crypto");
  const bridge = createBridge({
    http: true,
    authMode: "oauth",
    publicUrl: "https://mcp.example.test",
    port: 0,
    pairingToken,
  });
  const address = await bridge.start(),
    root = `http://127.0.0.1:${address.port}`;
  const post = async (
    path: string,
    value: Record<string, string>,
    json = false,
  ) => {
    const response = await fetch(root + path, {
      method: "POST",
      headers: {
        "Content-Type": json
          ? "application/json"
          : "application/x-www-form-urlencoded",
      },
      body: json ? JSON.stringify(value) : new URLSearchParams(value),
    });
    expect(response.status).toBeLessThan(400);
    return response.json();
  };
  let client: Client | undefined;
  try {
    await page.addInitScript(() =>
      localStorage.setItem("baizefig.ui.language", "en"),
    );
    await page.goto("/");
    await openMcp(page);
    await page
      .getByText("Manual pairing and advanced settings", { exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "MCP service address", exact: true })
      .fill(root + "/mcp");
    await page
      .getByLabel("Bridge pairing token", { exact: true })
      .fill(pairingToken);
    await page
      .getByRole("button", { name: "Connect bridge", exact: true })
      .click();
    await expect(page.locator(".mcp-wizard .connection-state")).toHaveText("Connected");
    const registered = await fetch(root + "/oauth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "Browser OAuth test",
        redirect_uris: ["https://client.example/callback"],
      }),
    }).then((r) => r.json());
    const verifier = "v".repeat(43);
    const params = {
      response_type: "code",
      client_id: registered.client_id,
      redirect_uri: "https://client.example/callback",
      code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      resource: "https://mcp.example.test/mcp",
      state: "browser-test",
    };
    const authorize = await fetch(
      root + "/oauth/authorize?" + new URLSearchParams(params),
    );
    const html = await authorize.text();
    const flowId = html.match(/oauth\/result\?id=([A-Za-z0-9_-]+)/)![1];
    await expect(
      page.getByText("Browser OAuth test", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Allow access", exact: true })
      .click();
    let redirect: string | undefined;
    await expect
      .poll(async () => {
        const status = await fetch(root + "/oauth/result?id=" + flowId).then(
          (r) => r.json(),
        );
        redirect = status.redirect;
        return Boolean(redirect);
      })
      .toBe(true);
    const code = new URL(redirect!).searchParams.get("code")!;
    const grant = await post("/oauth/token", {
      grant_type: "authorization_code",
      client_id: registered.client_id,
      redirect_uri: params.redirect_uri,
      resource: params.resource,
      code_verifier: verifier,
      code,
    });
    client = new Client({ name: "oauth-canvas-test", version: "1" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(root + "/mcp"), {
        requestInit: {
          headers: { Authorization: `Bearer ${grant.access_token}` },
        },
      }),
    );
    const read: any = await client.callTool({
      name: "get_document",
      arguments: {},
    });
    expect(read.isError).not.toBe(true);
    await page.screenshot({
      path: "test-results/mcp-oauth-approved.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await fetch(root + "/mcp", {
              headers: { Authorization: `Bearer ${grant.access_token}` },
            })
          ).status,
      )
      .toBe(401);
  } finally {
    await client?.close();
    await bridge.close();
  }
});

test("local automatic pairing requires no token and edits the real canvas", async ({
  page,
}) => {
  const { StdioClientTransport } =
    await import("@modelcontextprotocol/sdk/client/stdio.js");
  const client = new Client({ name: "automatic-canvas-test", version: "1" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["bridge/server.mjs"],
    env: { ...process.env, BAIZEFIG_PORT: "0", BAIZEFIG_AUTO_PAIR: "1" },
    stderr: "pipe",
  });
  let port: number | undefined;
  transport.stderr!.on("data", (data: Buffer) => {
    const match = data.toString().match(/listening on [^\n]+:(\d+)/);
    if (match) port = Number(match[1]);
  });
  try {
    await client.connect(transport);
    expect(port).toBeTruthy();
    await page.addInitScript(() =>
      localStorage.setItem("baizefig.ui.language", "en"),
    );
    await page.goto("/");
    await openMcp(page);
    await page
      .getByText("Local connection (advanced)", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "This computer", exact: true })
      .click();
    await page
      .getByText("Manual pairing and advanced settings", { exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "MCP service address", exact: true })
      .fill(`http://127.0.0.1:${port}/mcp`);
    await expect(
      page.getByLabel("Bridge pairing token", { exact: true }),
    ).toHaveValue("");
    await page
      .getByRole("button", { name: "Connect automatically", exact: true })
      .click();
    await expect(page.locator(".mcp-wizard .connection-state")).toHaveText("Connected");
    await page
      .getByRole("checkbox", {
        name: "Allow MCP to modify the currently open document",
        exact: true,
      })
      .check();
    const result: any = await client.callTool({
      name: "get_document",
      arguments: {},
    });
    const doc = JSON.parse(result.content[0].text);
    const write: any = await client.callTool({
      name: "apply_commands",
      arguments: {
        documentId: doc.documentId,
        editorId: doc.editorId,
        expectedRevision: doc.revision,
        idempotencyKey: "auto-pair-test",
        commands: [
          {
            type: "create",
            nodes: [
              {
                id: "auto-created",
                type: "text",
                pageId: doc.pages[0].id,
                text: "Automatic pairing works",
              },
            ],
          },
        ],
      },
    });
    expect(write.isError).not.toBe(true);
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await expect(page.locator(".design-canvas")).toContainText(
      "Automatic pairing works",
    );
  } finally {
    await client.close();
  }
});
