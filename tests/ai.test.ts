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

describe("AI endpoint configuration and diagnostics", () => {
  it("accepts a base URL and a complete endpoint without duplicating the route", async () => {
    const { chatCompletionsUrl } = await import("../src/ai");
    expect(chatCompletionsUrl(" https://example.com/v1/ ")).toBe(
      "https://example.com/v1/chat/completions",
    );
    expect(chatCompletionsUrl("https://example.com/v1/chat/completions/")).toBe(
      "https://example.com/v1/chat/completions",
    );
    expect(
      chatCompletionsUrl("https://example.com/custom/v2?api-version=test"),
    ).toBe("https://example.com/custom/v2/chat/completions?api-version=test");
    expect(() =>
      chatCompletionsUrl("https://example.com/v1/responses"),
    ).toThrow("Responses");
  });
  it("preserves the service's 404 explanation and redacts the configured key", async () => {
    const { formatAIError } = await import("../src/ai");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: { message: "Model unknown. Key: session-key" },
        }),
      }),
    );
    let caught: unknown;
    try {
      await generate(
        config,
        "Design",
        emptyDocument(),
        [],
        new AbortController().signal,
      );
    } catch (e) {
      caught = e;
    }
    const message = formatAIError(caught, (s) => s);
    expect(message).toContain("404");
    expect(message).toContain("API route or model");
    expect(message).toContain("Model unknown");
    expect(message).not.toContain(config.key);
    expect(message).toContain("[redacted]");
  });
  it("keeps HTTP diagnostics when the service returns an HTML error", async () => {
    const { formatAIError } = await import("../src/ai");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => {
          throw Error("HTML response");
        },
      }),
    );
    let caught: unknown;
    try {
      await generate(
        config,
        "Design",
        emptyDocument(),
        [],
        new AbortController().signal,
      );
    } catch (e) {
      caught = e;
    }
    expect(formatAIError(caught, (s) => s)).toContain("Authentication failed");
  });
});
