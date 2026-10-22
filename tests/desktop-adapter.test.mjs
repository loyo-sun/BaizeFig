import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createBridge } from "../bridge/server.mjs";

test("bundled stdio adapter forwards tool discovery and calls to authenticated local MCP", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "baizefig-adapter-"));
  const accessToken = "a".repeat(64);
  const bridge = createBridge({ http: true, port: 0, accessToken });
  const address = await bridge.start();
  const state = join(dir, "state.json");
  await writeFile(
    state,
    JSON.stringify({
      installed: true,
      enabled: true,
      endpoint: `http://127.0.0.1:${address.port}/mcp`,
      accessToken,
    }),
  );
  const client = new Client({ name: "desktop-test", version: "1" });
  t.after(async () => {
    await client.close();
    await bridge.close();
    await rm(dir, { recursive: true, force: true });
  });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [
        fileURLToPath(new URL("../desktop/stdio.mjs", import.meta.url)),
        state,
      ],
      stderr: "pipe",
    }),
  );
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 8);
  const result = await client.callTool({ name: "get_document", arguments: {} });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /NOT_PAIRED/);
});
