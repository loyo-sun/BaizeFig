import { describe, expect, it } from "vitest";
import {
  defaultPolicy,
  exportAgentProfile,
  parseAgentProfile,
  parseSharedContext,
  resolveAgentSource,
  type AgentProfile,
} from "../src/agentWorkspace";

describe("Agent model-source priority", () => {
  it("uses the first available source, and honors a changed priority", () => {
    expect(resolveAgentSource(defaultPolicy, { model: "custom-model" })).toBe(
      "cloud",
    );
    expect(
      resolveAgentSource(
        { ...defaultPolicy, order: ["custom", "cloud"] },
        { model: "custom-model" },
      ),
    ).toBe("custom");
  });
  it("falls back when credits are depleted, and skips an unconfigured custom source", () => {
    expect(
      resolveAgentSource(
        { ...defaultPolicy, previewCredits: 0 },
        { model: "custom-model" },
      ),
    ).toBe("custom");
    expect(
      resolveAgentSource(
        { ...defaultPolicy, order: ["custom", "cloud"] },
        { model: " " },
      ),
    ).toBe("cloud");
    expect(
      resolveAgentSource(
        { ...defaultPolicy, previewCredits: 0 },
        { model: "" },
      ),
    ).toBeNull();
  });
  it("never uses disabled sources even when they have balance or credentials", () => {
    expect(
      resolveAgentSource(
        { ...defaultPolicy, enabled: { cloud: false, custom: true } },
        { model: "model" },
      ),
    ).toBe("custom");
    expect(
      resolveAgentSource(
        {
          ...defaultPolicy,
          enabled: { cloud: true, custom: false },
          previewCredits: 0,
        },
        { model: "model" },
      ),
    ).toBeNull();
    expect(
      resolveAgentSource(
        { ...defaultPolicy, enabled: { cloud: false, custom: false } },
        { model: "model" },
      ),
    ).toBeNull();
  });
});

describe("Portable Agent and shared-context files", () => {
  const profile: AgentProfile = {
    id: "cloud-agent",
    name: "Brand assistant",
    description: "Our visual style",
    system: "Use warm colors",
    location: "cloud",
  };
  it("imports a cloud Agent as a separate local copy without connection credentials", () => {
    const file = exportAgentProfile({
      ...profile,
      key: "secret-api-key",
    } as AgentProfile);
    const local = parseAgentProfile(file, "local");
    expect(local.location).toBe("local");
    expect(local.id).not.toBe(profile.id);
    expect(local.system).toBe(profile.system);
    expect(JSON.stringify(file)).not.toContain("secret-api-key");
    expect(JSON.stringify(file)).not.toContain("cloud-agent");
  });
  it("rejects invalid Agent data before it reaches the library", () => {
    expect(() =>
      parseAgentProfile(
        { format: "baize-agent", agent: { name: "", system: "" } },
        "local",
      ),
    ).toThrow("Invalid Agent");
    expect(() =>
      parseAgentProfile(
        {
          format: "baize-agent",
          agent: { name: "name", description: "", system: 42 },
        },
        "cloud",
      ),
    ).toThrow("Invalid Agent");
  });
  it("preserves context from both sources and never restores a pending actionable proposal", () => {
    const context = parseSharedContext({
      format: "baize-context",
      turns: [
        {
          request: "Design a reading app",
          mode: "product",
          outcome: "applied",
          source: "cloud",
          agentName: "Baize",
        },
        {
          request: "Continue the same style",
          mode: "ui",
          outcome: "pending",
          source: "custom",
        },
      ],
    });
    expect(context.map((turn) => turn.source)).toEqual(["cloud", "custom"]);
    expect(context[0].outcome).toBe("applied");
    expect(context[1].outcome).toBe("discarded");
    expect(context.map((turn) => turn.id)).toEqual([1, 2]);
  });
  it("rejects malformed context and command-bearing data", () => {
    expect(() =>
      parseSharedContext({
        format: "baize-context",
        turns: [{ request: 123, mode: "ui" }],
      }),
    ).toThrow("Invalid context");
    const turns = parseSharedContext({
      format: "baize-context",
      turns: [
        {
          request: "Sketch",
          mode: "ui",
          outcome: "pending",
          commands: [{ type: "delete", ids: ["all"] }],
        },
      ],
    });
    expect(turns[0]).not.toHaveProperty("commands");
  });
});
