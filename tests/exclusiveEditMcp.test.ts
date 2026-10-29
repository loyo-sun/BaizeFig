import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JSDOM } from "test-dom-jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useExclusiveEdit } from "../src/useExclusiveEdit";
import { EditorMcp } from "../src/mcp";
import { emptyDocument, type Document } from "../src/core";
import { cloudRequest } from "../src/saveDestination";
import type { CloudSession } from "../src/cloud";

vi.mock("../src/saveDestination", () => ({
  cloudRequest: vi.fn(),
  isCloudBackedDocument: () => true,
  rememberCloudBinding: vi.fn(),
}));
vi.mock("../src/cloudConnectivity", () => ({
  isCloudOffline: () => false,
  CLOUD_NETWORK_EVENT: "baizefig-cloud-network",
}));
vi.mock("../src/cloudRecovery", () => ({
  canEditOffline: () => false,
  claimLocalEditor: async () => true,
  releaseLocalEditor: vi.fn(),
  ownsLocalEditor: () => false,
  resolveCloudOpen: async (_session: unknown, latest: unknown) => latest,
  setOfflineEditing: vi.fn(),
  offlineSessionForDoc: () => null,
  readCloudRecovery: async () => null,
  markRecoveredDocument: (doc: Document) => doc,
}));

let dom: JSDOM, root: Root, doc: Document;
let edit: ReturnType<typeof useExclusiveEdit>;
let lock: { editor_id: string; grant_id?: string } | null;
const mcp = new EditorMcp();
const session: CloudSession = {
  base: "https://cloud.test",
  token: "test",
  expiresAt: Date.now() + 86400000,
  user: { id: "u", username: "user" },
  mcpUrl: "https://cloud.test/mcp/baizefig",
};
function Harness() {
  edit = useExclusiveEdit(
    session,
    doc.id,
    mcp.editorId,
    (latest) => {
      doc = latest;
    },
    async () => {},
  );
  return null;
}
const poll = async () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
beforeEach(async () => {
  vi.useFakeTimers();
  dom = new JSDOM('<div id="root"></div>', { url: "https://editor.test" });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  }))
    vi.stubGlobal(key, value);
  doc = emptyDocument();
  lock = null;
  vi.mocked(cloudRequest)
    .mockReset()
    .mockImplementation(async (_s, path) => {
      if (path.endsWith("/edit/acquire")) {
        lock = { editor_id: mcp.editorId };
        return { token: crypto.randomUUID(), expires_at: Date.now() + 90000 };
      }
      if (path.endsWith("/edit/renew"))
        return { expires_at: Date.now() + 90000 };
      if (path.endsWith("/edit")) return { lock };
      return {
        file: { head_id: "head", folder_id: null },
        content: structuredClone(doc),
      };
    });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      lock = null;
      return { ok: true };
    }),
  );
  root = createRoot(document.getElementById("root")!);
  await act(async () => {
    root.render(React.createElement(Harness));
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  dom.window.close();
});

it("opening and polling an online browser leaves the human lease available", async () => {
  await poll();
  expect(edit.canEdit(doc.id)).toBe(false);
  expect(edit.lease.current).toBeNull();
  expect(
    vi
      .mocked(cloudRequest)
      .mock.calls.some(([, path]) => path.endsWith("/acquire")),
  ).toBe(false);
});

it("read → automatic AI lease → write → release works for two consecutive batches", async () => {
  const context = () => ({
    doc,
    page: doc.pages[0].id,
    selected: [],
    bridgeWrite: true,
    bridgeExport: true,
  });
  const call = (method: string, params = {}) =>
    mcp.handle(method, params, context(), (next) => {
      doc = next;
    }) as any;
  for (let batch = 0; batch < 2; batch++) {
    const read = call("get_document");
    lock = { editor_id: mcp.editorId, grant_id: "ai-grant" };
    const token = crypto.randomUUID();
    await act(async () => {
      await edit.begin("ai", token);
    });
    expect(edit.canEdit(doc.id)).toBe(false);
    const result = call("apply_commands", {
      documentId: doc.id,
      editorId: mcp.editorId,
      expectedRevision: read.revision,
      idempotencyKey: crypto.randomUUID(),
      commands: [
        {
          type: "create",
          nodes: [
            {
              id: `batch-${batch}`,
              pageId: doc.pages[0].id,
              type: "rectangle",
              width: 64,
              height: 64,
            },
          ],
        },
      ],
    });
    expect(result.applied).toBe(1);
    await act(async () => {
      await edit.end(token);
    });
    await poll();
    expect(edit.lease.current).toBeNull();
    expect(edit.canEdit(doc.id)).toBe(false);
  }
  expect(doc.nodes).toHaveLength(2);
  // A reload after AI has finished must also remain available for MCP.
  await act(async () => root.unmount());
  root = createRoot(document.getElementById("root")!);
  await act(async () => {
    root.render(React.createElement(Harness));
  });
  await poll();
  expect(edit.lease.current).toBeNull();
});

it("explicit human start and finish still work without automatic reacquisition", async () => {
  await act(async () => {
    await edit.begin();
  });
  expect(edit.canEdit(doc.id)).toBe(true);
  expect(edit.lease.current?.kind).toBe("human");
  await act(async () => {
    await edit.end();
  });
  await poll();
  expect(edit.canEdit(doc.id)).toBe(false);
  expect(edit.lease.current).toBeNull();
});
