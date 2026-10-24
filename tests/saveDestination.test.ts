import { test, expect, vi, afterEach } from "vitest";
import {
  readSaveDestination,
  storeSaveDestination,
  readCloudBinding,
  rememberCloudBinding,
  saveCloudDocument,
} from "../src/saveDestination";
import { emptyDocument } from "../src/core";
vi.mock("../src/Canvas", () => ({ svgString: vi.fn(), raster: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
test("defaults and cloud targets are isolated by user, server and document", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  expect(readSaveDestination()).toBe("ask");
  storeSaveDestination("cloud");
  expect(readSaveDestination()).toBe("cloud");
  const session = {
    base: "https://cloud.test",
    token: "token",
    expiresAt: Date.now() + 60000,
    user: { id: "one", username: "one" },
    mcpUrl: "",
  };
  rememberCloudBinding(session, "file", "head", "folder");
  expect(readCloudBinding(session, "file")).toEqual({
    headId: "head",
    folderId: "folder",
  });
  expect(
    readCloudBinding(
      { ...session, user: { id: "two", username: "two" } },
      "file",
    ),
  ).toBeNull();
  expect(
    readCloudBinding({ ...session, base: "https://other.test" }, "file"),
  ).toBeNull();
});
test("cloud save preserves history and sends, selected folder and expected version; failure does not update target", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  const session = {
    base: "https://cloud.test",
    token: "token",
    expiresAt: Date.now() + 60000,
    user: { id: "one", username: "one" },
    mcpUrl: "",
  };
  const doc = { ...emptyDocument(), pages: [] };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        headId: "new-head",
        folderApplied: true,
        overwriteApplied: true,
      }),
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error_description: "版本冲突" }),
    });
  vi.stubGlobal("fetch", fetcher);
  await saveCloudDocument(session, doc, "folder", "old-head");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    overwrite: false,
    folderId: "folder",
    headId: "old-head",
  });
  expect(readCloudBinding(session, doc.id)?.headId).toBe("new-head");
  await expect(
    saveCloudDocument(session, doc, "folder", "old-head"),
  ).rejects.toThrow("版本冲突");
  expect(readCloudBinding(session, doc.id)?.headId).toBe("new-head");
});
test("existing cloud deployment applies selected folder without deleting previous versions", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  const session = {
    base: "https://cloud.test",
    token: "token",
    expiresAt: Date.now() + 60000,
    user: { id: "one", username: "one" },
    mcpUrl: "",
  };
  const doc = { ...emptyDocument(), pages: [] };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ headId: "new-head" }),
    })
    .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetcher);
  await saveCloudDocument(session, doc, "folder", "old-head");
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    session.base + "/api/v1/space/files/" + doc.id + "/save",
    session.base + "/api/v1/space/files/" + doc.id + "/move",
  ]);
  expect(readCloudBinding(session, doc.id)).toEqual({
    headId: "new-head",
    folderId: "folder",
  });
});

test("web cloud status follows the server result; identical autosaves skip uploads and quota failure remains unsaved", async () => {
  const { markCloudSnapshotSaved, isCloudSnapshotSaved, readCloudSaveState } =
    await import("../src/saveDestination");
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal("window", { dispatchEvent: vi.fn(), CustomEvent });
  const session = {
    base: "https://status.test",
    token: "token",
    expiresAt: Date.now() + 60000,
    user: { id: "status-user", username: "status-user" },
    mcpUrl: "",
  };
  const doc = { ...emptyDocument(), pages: [] };
  rememberCloudBinding(session, doc.id, "head-1", null);
  markCloudSnapshotSaved(session, doc);
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await saveCloudDocument(session, structuredClone(doc), null, "head-1", {
    editorId: "editor",
    lockToken: "lock",
    saveMode: "autosave",
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(isCloudSnapshotSaved(session, structuredClone(doc))).toBe(true);
  const changed = { ...doc, name: "Changed" };
  let finish!: (response: unknown) => void;
  fetcher.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = saveCloudDocument(session, changed, null, "head-1", {
    editorId: "editor",
    lockToken: "lock",
    saveMode: "autosave",
  });
  expect(readCloudSaveState(session, changed)).toMatchObject({
    saved: false,
    saving: true,
  });
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  finish({
    ok: false,
    status: 413,
    json: async () => ({ error_description: "云空间容量不足" }),
  });
  await expect(pending).rejects.toThrow("云空间容量不足");
  expect(readCloudSaveState(session, changed)).toEqual({
    saved: false,
    saving: false,
    error: "云空间容量不足",
  });
  // A local cache write must never clear the cloud failure or turn its status green.
  values.set("local-recovery", JSON.stringify(changed));
  expect(readCloudSaveState(session, changed).saved).toBe(false);
  fetcher.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ headId: "head-2", folderApplied: true }),
  });
  await saveCloudDocument(session, changed, null, "head-1", {
    editorId: "editor",
    lockToken: "lock",
  });
  expect(readCloudSaveState(session, changed)).toEqual({
    saved: true,
    saving: false,
    error: "",
  });
});
