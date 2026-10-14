import { randomBytes, randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// This process is launched by an MCP client. Never log to stdout: it carries MCP.
const token = randomBytes(24).toString("hex");
const allowedOrigins = new Set(
  (
    process.env.BAIZEFIG_ORIGINS ??
    "http://127.0.0.1:4318,http://localhost:4318"
  ).split(","),
);
const wss = new WebSocketServer({
  host: "127.0.0.1",
  port: 4319,
  maxPayload: 50 * 1024 * 1024,
  verifyClient: ({ req }, done) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1:4319");
    done(
      allowedOrigins.has(req.headers.origin ?? "") &&
        url.searchParams.get("token") === token,
      403,
      "Invalid origin or pairing token",
    );
  },
});
let browser;
const pending = new Map();
wss.on("connection", (ws) => {
  browser?.close(1000, "Replaced by a newly paired browser");
  browser = ws;
  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }
    const entry = pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(message.id);
    message.error
      ? entry.reject(Error(message.error))
      : entry.resolve(message.result);
  });
  ws.on("close", () => {
    if (browser === ws) {
      browser = undefined;
      for (const [id, entry] of pending) {
        clearTimeout(entry.timer);
        entry.reject(Error("Editor disconnected"));
        pending.delete(id);
      }
    }
  });
});
wss.on("error", (error) => {
  console.error(`BaizeFig bridge: ${error.message}`);
  process.exit(1);
});
function request(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!browser || browser.readyState !== 1) {
      reject(Error("No browser paired. Open BaizeFig → Connect AI."));
      return;
    }
    const id = randomUUID(),
      timer = setTimeout(() => {
        pending.delete(id);
        reject(Error("Editor request timed out"));
      }, 30000);
    pending.set(id, { resolve, reject, timer });
    browser.send(JSON.stringify({ id, method, params }));
  });
}
const server = new McpServer({ name: "baizefig", version: "0.1.0" });
for (const [name, description] of [
  ["get_document", "Read the currently paired editor document."],
  ["get_selection", "Read the active selection."],
  ["export_svg", "Export the selection or current page as SVG."],
]) {
  server.tool(name, description, {}, async () => {
    try {
      return {
        content: [{ type: "text", text: JSON.stringify(await request(name)) }],
      };
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: e.message }] };
    }
  });
}
server.tool(
  "get_screenshot",
  "Get a PNG rendering of the selection or current page.",
  {},
  async () => {
    try {
      const url = await request("get_screenshot");
      return {
        content: [
          { type: "image", mimeType: "image/png", data: url.split(",")[1] },
        ],
      };
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: e.message }] };
    }
  },
);
server.tool(
  "apply_commands",
  "Apply an atomic command batch to the paired editor. Browser write permission is required. Commands use the BaizeFig schema documented in docs/ARCHITECTURE.md.",
  { commands: z.array(z.record(z.unknown())).max(100) },
  async ({ commands }) => {
    try {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await request("apply_commands", { commands })),
          },
        ],
      };
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: e.message }] };
    }
  },
);
await server.connect(new StdioServerTransport());
console.error(
  `BaizeFig local MCP bridge listening on 127.0.0.1:4319\nPairing token: ${token}\nAllowed editor origins: ${[...allowedOrigins].join(", ")}`,
);
process.on("SIGINT", () => {
  wss.close();
  process.exit(0);
});
process.stdin.on("end", () => {
  wss.close();
  process.exit(0);
});
