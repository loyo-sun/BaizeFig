import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createInterface } from "node:readline/promises";
import assert from "node:assert/strict";
const client = new Client({ name: "baizefig-smoke-test", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["bridge/server.mjs"],
  stderr: "pipe",
});
transport.stderr?.on("data", (data) => process.stdout.write(data));
const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
try {
  await client.connect(transport);
  const list = await client.listTools();
  assert.equal(list.tools.length, 5);
  console.log("PASS: MCP initialization and tool discovery");
  await terminal.question(
    "Pair browser with writes DISABLED, then press Enter.\n",
  );
  const read = await client.callTool({ name: "get_document", arguments: {} });
  assert.ok(!read.isError);
  const doc = JSON.parse(read.content[0].text);
  const target = doc.nodes.find((n) => !n.locked && n.type === "rectangle");
  assert.ok(target, "Create an unlocked rectangle in the test design");
  const original = target.name;
  const cmd = [
    { type: "update", ids: [target.id], patch: { name: "MCP verified" } },
  ];
  const denied = await client.callTool({
    name: "apply_commands",
    arguments: { commands: cmd },
  });
  assert.equal(denied.isError, true);
  console.log("PASS: paired read and write permission denied");
  await terminal.question("Enable writes in the editor, then press Enter.\n");
  const updated = await client.callTool({
    name: "apply_commands",
    arguments: { commands: cmd },
  });
  assert.ok(!updated.isError);
  const result = await client.callTool({ name: "get_document", arguments: {} });
  assert.equal(
    JSON.parse(result.content[0].text).nodes.find((n) => n.id === target.id)
      .name,
    "MCP verified",
  );
  console.log("PASS: MCP command applied to the live document");
  const image = await client.callTool({
    name: "get_screenshot",
    arguments: {},
  });
  assert.equal(image.content[0].type, "image");
  assert.ok(image.content[0].data.length > 100);
  console.log("PASS: screenshot tool returned PNG");
  await client.callTool({
    name: "apply_commands",
    arguments: {
      commands: [
        { type: "update", ids: [target.id], patch: { name: original } },
      ],
    },
  });
  console.log("PASS: test change restored");
} finally {
  terminal.close();
  await client.close();
}
