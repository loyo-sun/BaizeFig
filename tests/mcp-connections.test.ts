import { describe, it, expect } from "vitest";
import {
  localSetupCommand,
  remoteEndpoint,
  newPairingToken,
  serviceEnvironment,
  remoteClientConfig,
} from "../src/mcpConnections";
describe("client connection setup", () => {
  it("builds local setup without exposing a pairing secret", () => {
    expect(
      localSetupCommand("workbuddy", "https://baizefig.netlify.app"),
    ).toContain('--client workbuddy --origin "https://baizefig.netlify.app"');
    expect(
      localSetupCommand("chatgpt", "https://baizefig.netlify.app"),
    ).not.toContain("TOKEN");
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
    expect(
      JSON.parse(remoteClientConfig("workbuddy", "https://mcp.example.com"))
        .mcpServers.baizefig.type,
    ).toBe("streamableHttp");
    expect(
      JSON.parse(remoteClientConfig("doubao", "https://mcp.example.com"))
        .instructions,
    ).toContain("not a verified Doubao plugin manifest");
  });
});
