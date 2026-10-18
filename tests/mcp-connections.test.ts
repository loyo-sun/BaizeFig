import { describe, it, expect } from "vitest";
import {
  localConnectionConfig,
  remoteEndpoint,
  newPairingToken,
  serviceEnvironment,
  connectionGuide,
  configuredMcpEndpoint,
} from "../src/mcpConnections";
describe("client connection setup", () => {
  it("exports standard local stdio configuration without a pairing secret", () => {
    const config = JSON.parse(
      localConnectionConfig("https://baizefig.netlify.app"),
    );
    expect(config.mcpServers.baizefig.command).toBe("node");
    expect(config.mcpServers.baizefig.env).toEqual({
      BAIZEFIG_ORIGINS: "https://baizefig.netlify.app",
      BAIZEFIG_AUTO_PAIR: "1",
    });
    expect(JSON.stringify(config)).not.toContain("TOKEN");
    expect(() => localConnectionConfig("https://example.com/path")).toThrow();
  });
  it("requires a real HTTPS root service endpoint", () => {
    expect(remoteEndpoint("https://mcp.example.com/")).toBe(
      "https://mcp.example.com/mcp",
    );
    for (const input of [
      "http://example.com/mcp",
      "https://a:b@example.com/mcp",
      "https://example.com/mcp?token=secret",
      "https://example.com/other",
    ])
      expect(() => remoteEndpoint(input)).toThrow();
  });
  it("accepts only valid configured remote addresses and never invents a service", () => {
    expect(configuredMcpEndpoint(undefined)).toBe("");
    expect(configuredMcpEndpoint("http://127.0.0.1:4319/mcp")).toBe("");
    expect(configuredMcpEndpoint("https://mcp.example.com")).toBe(
      "https://mcp.example.com/mcp",
    );
  });
  it("creates OAuth deployment settings and labels unverified import formats honestly", () => {
    const token = newPairingToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const env = serviceEnvironment(
      "https://mcp.example.com",
      "https://baizefig.netlify.app",
      token,
    );
    expect(env).toContain("BAIZEFIG_AUTH_MODE=oauth");
    expect(env).toContain("BAIZEFIG_ORIGINS=https://baizefig.netlify.app");
    expect(env).not.toContain("BAIZEFIG_ACCESS_TOKEN");
    const guide = JSON.parse(connectionGuide("https://mcp.example.com"));
    expect(guide.url).toBe("https://mcp.example.com/mcp");
    expect(guide.transport).toBe("streamableHttp");
    expect(guide.authentication).toEqual({ type: "OAuth", pkce: "S256" });
    expect(guide).not.toHaveProperty("clients");
    expect(JSON.stringify(guide)).not.toMatch(/WorkBuddy|ChatGPT|Doubao|TOKEN/);
    expect(guide.instructions).toContain("not a client import manifest");
  });
});
