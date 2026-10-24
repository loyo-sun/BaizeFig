import { expect, test, vi } from "vitest";
import { JSDOM } from "test-dom-jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useAgentWorkspace, type AgentWorkspace } from "../src/agentWorkspace";

test("source switches share context, local data survives a reload, and cloud previews never write to local storage or a server", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://editor.test" });
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("localStorage", dom.window.localStorage);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  let workspace!: AgentWorkspace;
  const config = { baseUrl: "https://model.test/v1", key: "private-key", model: "custom-model", system: "" };
  function Harness() { workspace = useAgentWorkspace("design-1", config); return null; }
  let root = createRoot(document.getElementById("root")!);
  try {
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => {
      workspace.setTurns([{ id: 1, request: "Keep this design context", mode: "product", outcome: "discarded", source: "cloud" }]);
      workspace.saveProfile({ id: "cloud-profile", name: "Cloud preview only", description: "", system: "Cloud rules", location: "cloud" });
    });
    expect(localStorage.getItem("baizefig.agent.contexts.v1")).toBeNull();
    expect(localStorage.getItem("baizefig.agent.library.v1")).not.toContain("Cloud preview only");
    await act(async () => workspace.setPolicy(policy => ({ ...policy, order: ["custom", "cloud"] })));
    expect(workspace.location).toBe("local");
    expect(workspace.turns[0].request).toBe("Keep this design context");
    expect(localStorage.getItem("baizefig.agent.contexts.v1")).toContain("Keep this design context");
    await act(async () => workspace.saveProfile({ id: "local-profile", name: "Local assistant", description: "", system: "Local rules", location: "local" }));
    expect(localStorage.getItem("baizefig.agent.library.v1")).toContain("Local assistant");
    expect(localStorage.getItem("baizefig.agent.library.v1")).not.toContain("Cloud preview only");
    expect(JSON.stringify(localStorage)).not.toContain("private-key");
    await act(async () => root.unmount());
    root = createRoot(document.getElementById("root")!);
    await act(async () => root.render(React.createElement(Harness)));
    expect(workspace.turns[0].request).toBe("Keep this design context");
    expect(workspace.profiles.map(profile => profile.name)).toEqual(["Local assistant"]);
    expect(request).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals(); dom.window.close();
  }
});
