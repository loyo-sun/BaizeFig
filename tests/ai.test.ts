import { afterEach, describe, expect, it, vi } from "vitest";
import { generate } from "../src/ai";
import { emptyDocument, makeNode } from "../src/core";
const config = {
  baseUrl: "http://localhost:11434/v1",
  model: "test-model",
  key: "session-key",
  system: "Use simple typography",
};
afterEach(() => vi.unstubAllGlobals());
describe("AI proposal boundary", () => {
  it("sends the selected document to the configured endpoint and returns valid commands without mutation", async () => {
    const doc = emptyDocument();
    doc.nodes.push(makeNode("rectangle", doc.pages[0].id, { id: "r" }));
    const commands = [
      { type: "update", ids: ["r"], patch: { fill: "#123456" } },
    ];
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ commands }) } }],
      }),
    });
    vi.stubGlobal("fetch", request);
    const result = await generate(
      config,
      "Make this blue",
      doc,
      ["r"],
      new AbortController().signal,
    );
    expect(result).toEqual(commands);
    expect(doc.nodes[0].fill).not.toBe("#123456");
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(JSON.parse(options.body).model).toBe("test-model");
    expect(options.headers.Authorization).toBe("Bearer session-key");
    expect(options.body).not.toContain("session-key");
  });
  it("rejects a partially invalid batch without changing the current document", async () => {
    const doc = emptyDocument();
    doc.nodes.push(makeNode("rectangle", doc.pages[0].id, { id: "r" }));
    const original = structuredClone(doc);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  commands: [
                    { type: "update", ids: ["r"], patch: { fill: "#123456" } },
                    { type: "update", ids: ["r"], patch: { width: -5 } },
                  ],
                }),
              },
            },
          ],
        }),
      }),
    );
    await expect(
      generate(config, "Invalid batch", doc, [], new AbortController().signal),
    ).rejects.toThrow("Invalid node dimensions");
    expect(doc).toEqual(original);
  });
  it("rejects non-design operations from the model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  commands: [{ type: "execute_script", script: "alert(1)" }],
                }),
              },
            },
          ],
        }),
      }),
    );
    await expect(
      generate(
        config,
        "Generate",
        emptyDocument(),
        [],
        new AbortController().signal,
      ),
    ).rejects.toThrow("Unsupported AI command");
  });
  it("reports endpoint failures instead of fabricating a generated result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    await expect(
      generate(
        config,
        "Generate",
        emptyDocument(),
        [],
        new AbortController().signal,
      ),
    ).rejects.toThrow("401");
  });
});
