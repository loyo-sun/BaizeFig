import { describe, it, expect } from "vitest";
import { bridgeNeedsNetwork } from "../src/mcp";
describe("local MCP without internet", () => {
  it("keeps IPv4, IPv6 and localhost available while offline", () => {
    for (const host of ["127.0.0.1", "[::1]", "localhost"])
      expect(bridgeNeedsNetwork(`ws://${host}:4319/bridge`)).toBe(false);
    expect(bridgeNeedsNetwork("wss://cloud.example/bridge")).toBe(true);
    expect(bridgeNeedsNetwork("not a URL")).toBe(true);
  });
});
