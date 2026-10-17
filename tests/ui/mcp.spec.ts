import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
// @ts-expect-error server is intentionally plain JavaScript, shared with Node deployment.
import { createBridge } from "../../bridge/server.mjs";
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
      await page.locator(".mcp-inspector-row button").click();
      await page
        .getByRole("textbox", { name: "MCP service address", exact: true })
        .fill(url);
      await page
        .getByLabel("Bridge pairing token", { exact: true })
        .fill(pairingToken);
      await page
        .getByRole("button", { name: "Connect bridge", exact: true })
        .click();
      await expect(page.locator(".connection-state")).toHaveText("Connected");
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
      await page.locator(".mcp-inspector-row button").click();
      await page
        .getByRole("button", { name: "Disconnect", exact: true })
        .click();
      await expect(page.locator(".connection-state")).toHaveText(
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
      await expect(page.locator(".connection-state")).toHaveText("Connected");
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
