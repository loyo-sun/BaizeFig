// Run with the bundled Electron executable in Node mode; stdout is MCP only.
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
try {
  const state = JSON.parse(await readFile(process.argv[2], "utf8"));
  if (!state.installed || !state.enabled || !state.endpoint)
    throw Error("请先打开 BaizeFig 并启动本机 MCP");
  const url = new URL(state.endpoint);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/mcp"
  )
    throw Error("Invalid local MCP endpoint");
  const client = new Client({
    name: "baizefig-desktop-adapter",
    version: "1.0.0",
  });
  await client.connect(
    new StreamableHTTPClientTransport(url, {
      requestInit: {
        headers: { Authorization: `Bearer ${state.accessToken}` },
      },
    }),
  );
  const server = new Server(
    { name: "baizefig-desktop", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, () => client.listTools());
  server.setRequestHandler(CallToolRequestSchema, (request) =>
    client.callTool(request.params),
  );
  const stop = async () => {
    await server.close();
    await client.close();
    process.exit(0);
  };
  process.stdin.on("end", () => void stop());
  process.on("SIGTERM", () => void stop());
  await server.connect(new StdioServerTransport());
} catch (e) {
  console.error(`BaizeFig MCP: ${e.message}`);
  process.exitCode = 1;
}
