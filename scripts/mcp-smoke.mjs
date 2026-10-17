import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const client = new Client({ name: "baizefig-smoke-test", version: "2.0.0" });
const transport = process.env.BAIZEFIG_MCP_URL
  ? new StreamableHTTPClientTransport(new URL(process.env.BAIZEFIG_MCP_URL), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.BAIZEFIG_ACCESS_TOKEN ?? ""}`,
        },
      },
    })
  : new StdioClientTransport({
      command: process.execPath,
      args: ["bridge/server.mjs"],
      stderr: "pipe",
    });
transport.stderr?.on("data", (data) => process.stdout.write(data));
const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result));
  return result;
}
const text = (result) => JSON.parse(result.content[0].text);
try {
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 8);
  console.log("PASS: initialization and tool discovery");
  await terminal.question(
    "Pair the editor with writes/export DISABLED, then press Enter.\n",
  );
  const doc = text(await call("get_document"));
  const target = doc.nodes.find((n) => !n.locked && n.type === "rectangle");
  assert.ok(target, "Create an unlocked rectangle in the first 100 nodes");
  const destination = { documentId: doc.documentId, editorId: doc.editorId };
  const batch = {
    ...destination,
    expectedRevision: doc.revision,
    idempotencyKey: randomUUID(),
    commands: [
      { type: "update", ids: [target.id], patch: { name: "MCP verified" } },
    ],
  };
  assert.equal(
    (await client.callTool({ name: "apply_commands", arguments: batch }))
      .isError,
    true,
  );
  console.log("PASS: unauthorized writes denied");
  await terminal.question(
    "Enable write and screenshot/export permissions in the editor, then press Enter.\n",
  );
  const applied = text(await call("apply_commands", batch));
  assert.deepEqual(text(await call("apply_commands", batch)), applied);
  const result = text(await call("get_document", { ids: [target.id] }));
  assert.equal(result.nodes[0].name, "MCP verified");
  assert.equal(
    (await call("get_screenshot", destination)).content[0].type,
    "image",
  );
  assert.equal(
    text(
      await call("get_request_status", {
        ...destination,
        idempotencyKey: batch.idempotencyKey,
      }),
    ).status,
    "applied",
  );
  await call("apply_commands", {
    ...destination,
    expectedRevision: result.revision,
    idempotencyKey: randomUUID(),
    commands: [
      { type: "update", ids: [target.id], patch: { name: target.name } },
    ],
  });
  console.log(
    "PASS: live edit, duplicate retry, PNG, receipt lookup and name restoration",
  );
} finally {
  terminal.close();
  await client.close();
}
