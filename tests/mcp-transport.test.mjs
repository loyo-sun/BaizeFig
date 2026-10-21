import { request as httpRequest } from "node:http";
import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createBridge } from "../bridge/server.mjs";
const accessToken = "a".repeat(48),
  pairingToken = "p".repeat(48);
const origin = "http://127.0.0.1:4318";
async function fixture(options = {}) {
  const bridge = createBridge({
    http: true,
    port: 0,
    accessToken,
    pairingToken,
    ...options,
  });
  const address = await bridge.start();
  return {
    bridge,
    url: `http://127.0.0.1:${address.port}/mcp`,
    ws: `ws://127.0.0.1:${address.port}/bridge`,
  };
}
async function pair(url, token = pairingToken) {
  const ws = new WebSocket(url, { origin });
  await once(ws, "open");
  ws.send(
    JSON.stringify({
      type: "pair",
      token,
      documentId: "doc",
      editorId: "editor",
    }),
  );
  return ws;
}
async function connect(url) {
  const client = new Client({ name: "baizefig-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
    }),
  );
  return client;
}
test("HTTP auth, origin, host, discovery, explicit routing, schema and disconnect errors", async (t) => {
  const f = await fixture();
  t.after(() => f.bridge.close());
  assert.equal((await fetch(f.url)).status, 401);
  assert.equal(
    (
      await fetch(f.url, {
        headers: { Authorization: `Bearer ${pairingToken}` },
      })
    ).status,
    401,
  );
  assert.equal(
    (await fetch(f.url, { headers: { Origin: "https://evil.example" } }))
      .status,
    403,
  );
  const deniedHost = await new Promise((resolve) => {
    const req = httpRequest(
      f.url,
      { headers: { Host: "evil.example" } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.end();
  });
  assert.equal(deniedHost, 403);
  const client = await connect(f.url);
  t.after(() => client.close());
  const listed = (await client.listTools()).tools;
  assert.equal(listed.length, 8);
  const batch = listed.find((t) => t.name === "apply_commands");
  assert.equal(batch.inputSchema.properties.commands.type, "array");
  assert.equal(
    batch.inputSchema.properties.commands.items.anyOf[0].properties.nodes.type,
    "array",
  );
  assert.match(batch.description, /Minimal request:/);
  const unavailable = await client.callTool({
    name: "get_document",
    arguments: {},
  });
  assert.match(unavailable.content[0].text, /NOT_PAIRED/);
  const ws = await pair(f.ws);
  t.after(() => ws.terminate());
  await once(ws, "message");
  ws.on("message", (data) => {
    const m = JSON.parse(data);
    if (m.id)
      ws.send(
        JSON.stringify({
          id: m.id,
          result: {
            documentId: m.params.documentId,
            editorId: m.params.editorId,
            nodes: [],
          },
        }),
      );
  });
  const read = await client.callTool({ name: "get_document", arguments: {} });
  assert.equal(JSON.parse(read.content[0].text).documentId, "doc");
  const wrong = await client.callTool({
    name: "get_selection",
    arguments: { documentId: "wrong", editorId: "editor" },
  });
  assert.match(wrong.content[0].text, /TARGET_CHANGED/);
  const invalid = await client.callTool({
    name: "apply_commands",
    arguments: { commands: [{ type: "eval", code: "bad" }] },
  });
  assert.equal(invalid.isError, true);
  ws.close();
  await once(ws, "close");
  assert.equal(
    (await client.callTool({ name: "get_document", arguments: {} })).isError,
    true,
  );
});
test("bad browser token rejected; second browser cannot replace a paired editor", async (t) => {
  const f = await fixture();
  t.after(() => f.bridge.close());
  const bad = await pair(f.ws, "bad");
  const [code] = await once(bad, "close");
  assert.equal(code, 1008);
  const ws = await pair(f.ws);
  t.after(() => ws.terminate());
  await once(ws, "message");
  const second = await pair(f.ws);
  const [busy] = await once(second, "close");
  assert.equal(busy, 1008);
});
test("timeout is explicit and invalid responses cannot cross browser connections", async (t) => {
  const f = await fixture({ timeout: 30 });
  t.after(() => f.bridge.close());
  const ws = await pair(f.ws);
  t.after(() => ws.terminate());
  await once(ws, "message");
  const client = await connect(f.url);
  t.after(() => client.close());
  const result = await client.callTool({ name: "get_document", arguments: {} });
  assert.match(result.content[0].text, /TIMEOUT/);
});
test("stdio remains usable with current tool discovery", async () => {
  const client = new Client({ name: "stdio-test", version: "1" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["bridge/server.mjs"],
    env: { ...process.env, BAIZEFIG_PORT: "0" },
    stderr: "pipe",
  });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 8);
    const result = await client.callTool({
      name: "get_capabilities",
      arguments: {},
    });
    assert.equal(JSON.parse(result.content[0].text).mode, "stdio");
  } finally {
    await client.close();
  }
});

test("HTTP rejects malformed, oversized and non-JSON requests without dropping the service", async (t) => {
  const f = await fixture();
  t.after(() => f.bridge.close());
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  assert.equal(
    (await fetch(f.url, { method: "POST", headers, body: "{" })).status,
    400,
  );
  assert.equal(
    (
      await fetch(f.url, {
        method: "POST",
        headers,
        body: "x".repeat(1024 * 1024 + 1),
      })
    ).status,
    413,
  );
  assert.equal(
    (
      await fetch(f.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: "text",
      })
    ).status,
    415,
  );
  const chunked = await new Promise((resolve, reject) => {
    const req = httpRequest(f.url, { method: "POST", headers }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.write("x".repeat(600 * 1024));
    req.end("x".repeat(600 * 1024));
  });
  assert.equal(chunked, 413);
  const ws = new WebSocket(f.ws, { origin });
  await once(ws, "open");
  ws.send("null");
  assert.equal((await once(ws, "close"))[0], 1008);
  assert.equal((await fetch(f.url.replace("/mcp", "/healthz"))).status, 200);
});
