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
test("cloud save sends overwrite, selected folder and expected version; failure does not update target", async () => {
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
    overwrite: true,
    folderId: "folder",
    headId: "old-head",
  });
  expect(readCloudBinding(session, doc.id)?.headId).toBe("new-head");
  await expect(
    saveCloudDocument(session, doc, "folder", "old-head"),
  ).rejects.toThrow("版本冲突");
  expect(readCloudBinding(session, doc.id)?.headId).toBe("new-head");
});
test("existing cloud deployment applies selected folder and replaces the previous version without a server update", async () => {
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
    session.base +
      "/api/v1/space/files/" +
      doc.id +
      "/versions/old-head/delete",
  ]);
  expect(readCloudBinding(session, doc.id)).toEqual({
    headId: "new-head",
    folderId: "folder",
  });
});
