import { describe, it, expect } from "vitest";
import { EditorMcp, bridgeWebSocketUrl } from "../src/mcp";
import { emptyDocument, makeNode, History } from "../src/core";
function fixture() {
  let doc = emptyDocument();
  doc.nodes = [makeNode("rectangle", doc.pages[0].id, { id: "a" })];
  const mcp = new EditorMcp(),
    history = new History();
  const context = () => ({
    doc,
    page: doc.pages[0].id,
    selected: ["a"],
    bridgeWrite: true,
    bridgeExport: true,
  });
  const commit = (next: typeof doc) => {
    history.push(doc);
    doc = next;
  };
  const call = (method: string, params = {}) =>
    mcp.handle(method, params, context(), commit) as any;
  const read = () => call("get_document");
  const write = () => {
    const r = read();
    return {
      documentId: r.documentId,
      editorId: r.editorId,
      expectedRevision: r.revision,
      idempotencyKey: crypto.randomUUID(),
      commands: [{ type: "update", ids: ["a"], patch: { name: "MCP" } }],
    };
  };
  return {
    mcp,
    context,
    call,
    read,
    write,
    history,
    commit,
    get doc() {
      return doc;
    },
  };
}
describe("MCP editor boundary", () => {
  it("commits once, exposes receipts, detects conflicting keys and undoes one atomic batch", () => {
    const f = fixture(),
      p = f.write(),
      original = structuredClone(f.doc);
    p.commands.push({ type: "update", ids: ["a"], patch: { name: "second" } });
    const result = f.call("apply_commands", p);
    expect(result.applied).toBe(2);
    expect(f.call("apply_commands", p)).toEqual(result);
    expect(f.call("get_request_status", pTarget(p)).status).toBe("applied");
    expect(() =>
      f.call("apply_commands", { ...p, commands: [p.commands[0]] }),
    ).toThrow(/different commands/);
    expect(f.history.undo(f.doc)).toEqual(original);
    expect(f.history.past).toHaveLength(0);
  });
  it("previews without changing the document; any invalid operation rolls back the batch", () => {
    const f = fixture(),
      p = f.write(),
      before = f.doc;
    expect(f.call("preview_commands", p).updated).toEqual(["a"]);
    expect(f.doc).toBe(before);
    expect(() =>
      f.call("apply_commands", {
        ...p,
        commands: [...p.commands, { type: "delete", ids: ["missing"] }],
      }),
    ).toThrow(/not found/);
    expect(f.doc).toBe(before);
    expect(f.call("get_request_status", pTarget(p)).status).toBe("not_found");
  });
  it("rejects local-edit conflicts, stale targets, permission denial and locked nodes", () => {
    const f = fixture(),
      p = f.write();
    f.commit({ ...f.doc, name: "local change" });
    expect(() => f.call("apply_commands", p)).toThrow(/Document changed/);
    expect(() =>
      f.call("get_selection", { documentId: "other", editorId: p.editorId }),
    ).toThrow(/changed/);
    expect(() =>
      f.mcp.handle(
        "apply_commands",
        f.write(),
        { ...f.context(), bridgeWrite: false },
        f.commit,
      ),
    ).toThrow(/disabled/);
    expect(() =>
      f.mcp.handle(
        "get_screenshot",
        pTargetOnly(p),
        { ...f.context(), bridgeExport: false },
        f.commit,
      ),
    ).toThrow(/disabled/);
    f.commit({
      ...f.doc,
      nodes: f.doc.nodes.map((n) => ({ ...n, locked: true })),
    });
    expect(() => f.call("apply_commands", f.write())).toThrow(/locked/);
  });
  it("strictly rejects unknown fields and identity changes and creates nodes with defaults", () => {
    const f = fixture(),
      p = f.write();
    expect(() => f.call("apply_commands", { ...p, surprise: true })).toThrow();
    expect(() =>
      f.call("apply_commands", {
        ...p,
        commands: [{ type: "update", ids: ["a"], patch: { id: "b" } }],
      }),
    ).toThrow();
    const nodes = [
      { id: "b", type: "text", pageId: f.doc.pages[0].id, text: "Hello" },
    ];
    f.call("apply_commands", { ...p, commands: [{ type: "create", nodes }] });
    expect(f.doc.nodes.find((n) => n.id === "b")?.fontSize).toBeGreaterThan(0);
  });
  it("bounds and filters reads, and detects a revision change between pages", () => {
    const f = fixture(),
      first = f.read();
    const p = {
      fields: ["id", "name"],
      limit: 1,
      expectedRevision: first.revision,
    };
    expect(f.call("get_document", p).nodes).toEqual([
      { id: "a", name: "Rectangle" },
    ]);
    f.call("apply_commands", f.write());
    expect(() => f.call("get_document", p)).toThrow(/pagination/);
    expect(() => f.call("get_document", { limit: 501 })).toThrow();
  });
  it("validates remote URLs and maps reverse-proxy path prefixes", () => {
    expect(bridgeWebSocketUrl("https://design.example/ai/mcp")).toBe(
      "wss://design.example/ai/bridge",
    );
    expect(bridgeWebSocketUrl("http://127.0.0.1:4319/mcp")).toBe(
      "ws://127.0.0.1:4319/bridge",
    );
    for (const address of [
      "http://example.com/mcp",
      "https://a:b@example.com/mcp",
      "https://example.com/mcp?token=secret",
      "javascript:alert(1)",
    ])
      expect(() => bridgeWebSocketUrl(address)).toThrow();
  });
});
function pTargetOnly(p: any) {
  return { documentId: p.documentId, editorId: p.editorId };
}
function pTarget(p: any) {
  return { ...pTargetOnly(p), idempotencyKey: p.idempotencyKey };
}
