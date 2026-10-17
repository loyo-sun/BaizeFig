import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { WebSocket } from "ws";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createBridge } from "../bridge/server.mjs";
const issuer = "https://mcp.example.test",
  resource = issuer + "/mcp",
  token = "p".repeat(48);
test("OAuth PKCE consent, denial, code replay, refresh rotation, bound routing and disconnect revocation", async (t) => {
  const bridge = createBridge({
    http: true,
    authMode: "oauth",
    publicUrl: issuer,
    port: 0,
    pairingToken: token,
  });
  const address = await bridge.start();
  t.after(() => bridge.close());
  const root = `http://127.0.0.1:${address.port}`;
  const post = async (path, body, json = false) => {
    const res = await fetch(root + path, {
      method: "POST",
      headers: {
        "Content-Type": json
          ? "application/json"
          : "application/x-www-form-urlencoded",
      },
      body: json ? JSON.stringify(body) : new URLSearchParams(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const unauthorized = await fetch(root + "/mcp");
  assert.equal(unauthorized.status, 401);
  assert.match(
    unauthorized.headers.get("www-authenticate"),
    /resource_metadata/,
  );
  const metadata = await (
    await fetch(root + "/.well-known/oauth-authorization-server")
  ).json();
  assert.equal(metadata.issuer, issuer);
  assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
  assert.equal(
    (
      await post(
        "/oauth/register",
        { redirect_uris: ["http://evil.example/callback"] },
        true,
      )
    ).status,
    400,
  );
  const registered = await post(
    "/oauth/register",
    {
      client_name: "Test AI <script>",
      redirect_uris: ["https://client.example/callback"],
      token_endpoint_auth_method: "none",
    },
    true,
  );
  assert.equal(registered.status, 201);
  const clientId = registered.body.client_id;
  const verifier = "v".repeat(43),
    challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: "https://client.example/callback",
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: "test-state",
    resource,
  };
  assert.equal(
    (await fetch(root + "/oauth/authorize?" + new URLSearchParams(params)))
      .status,
    503,
  );
  const ws = new WebSocket(root.replace("http:", "ws:") + "/bridge", {
    origin: "http://127.0.0.1:4318",
  });
  t.after(() => ws.terminate());
  await once(ws, "open");
  ws.send(
    JSON.stringify({
      type: "pair",
      token,
      documentId: "doc",
      editorId: "editor",
    }),
  );
  await once(ws, "message");
  async function authorize(approved) {
    const next = once(ws, "message");
    const page = await fetch(
      root + "/oauth/authorize?" + new URLSearchParams(params),
    );
    const html = await page.text();
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("Test AI <script>"));
    const msg = JSON.parse((await next)[0]);
    assert.equal(msg.type, "oauth_request");
    ws.send(
      JSON.stringify({ type: "oauth_decision", id: msg.request.id, approved }),
    );
    let result;
    for (let i = 0; i < 100; i++) {
      result = await (
        await fetch(root + "/oauth/result?id=" + msg.request.id)
      ).json();
      if (result.redirect) break;
    }
    return new URL(result.redirect);
  }
  assert.equal(
    (await authorize(false)).searchParams.get("error"),
    "access_denied",
  );
  const callback = await authorize(true);
  assert.equal(callback.searchParams.get("state"), "test-state");
  assert.equal(callback.searchParams.get("iss"), issuer);
  const grant = {
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: params.redirect_uri,
    resource,
    code: callback.searchParams.get("code"),
    code_verifier: verifier,
  };
  assert.equal(
    (await post("/oauth/token", { ...grant, code_verifier: "x".repeat(43) }))
      .status,
    400,
  );
  const issued = await post("/oauth/token", grant);
  assert.equal(issued.status, 200);
  assert.equal((await post("/oauth/token", grant)).status, 400);
  const refresh = {
    grant_type: "refresh_token",
    client_id: clientId,
    resource,
    refresh_token: issued.body.refresh_token,
  };
  const rotated = await post("/oauth/token", refresh);
  assert.equal(rotated.status, 200);
  assert.equal((await post("/oauth/token", refresh)).status, 400);
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.method)
      ws.send(
        JSON.stringify({
          id: msg.id,
          result: { documentId: msg.params.documentId },
        }),
      );
  });
  const call = async (args) => {
    const res = await fetch(root + "/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rotated.body.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "get_document", arguments: args },
      }),
    });
    return { status: res.status, body: await res.json() };
  };
  assert.equal((await call({})).status, 200);
  const wrong = await call({ documentId: "another-doc" });
  assert.equal(wrong.body.result.isError, true);
  ws.close();
  await once(ws, "close");
  assert.equal((await call({})).status, 401);
});
test("local opt-in automatic pairing needs an allowed origin and cannot enable remote HTTP auto-pairing", async () => {
  assert.throws(() =>
    createBridge({ http: true, autoPair: true, accessToken: "a".repeat(48) }),
  );
  const client = new Client({ name: "automatic-pair-test", version: "1" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["bridge/server.mjs"],
    env: { ...process.env, BAIZEFIG_PORT: "0", BAIZEFIG_AUTO_PAIR: "1" },
    stderr: "pipe",
  });
  let port;
  transport.stderr.on("data", (data) => {
    const match = data.toString().match(/listening on [^\n]+:(\d+)/);
    if (match) port = Number(match[1]);
  });
  let ws;
  try {
    await client.connect(transport);
    assert.ok(port);
    ws = new WebSocket(`ws://127.0.0.1:${port}/bridge`, {
      origin: "http://127.0.0.1:4318",
    });
    await once(ws, "open");
    ws.send(
      JSON.stringify({
        type: "pair",
        auto: true,
        documentId: "doc",
        editorId: "editor",
      }),
    );
    assert.equal(JSON.parse((await once(ws, "message"))[0]).type, "paired");
  } finally {
    ws?.terminate();
    await client.close();
  }
});
