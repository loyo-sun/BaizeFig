import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { restoreCloudSession, type CloudSession } from "../src/cloud";
import {
  CLOUD_SESSION_KEY,
  readStoredCloudSession,
} from "../src/useCloudSession";
const base = "https://cloud.loyo.work";
const session = (): CloudSession => ({
  token: "a".repeat(43),
  expiresAt: Date.now() + 86400000,
  user: { id: "user-a", username: "alice" },
  base,
  mcpUrl: base + "/mcp/baizefig",
});
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("remembered cloud sign-in", () => {
  it("accepts remembered sign-in without overwriting an explicit disconnect", () => {
    localStorage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ session: session(), autoConnect: false }),
    );
    expect(readStoredCloudSession(base)?.autoConnect).toBe(false);
  });
  it("rejects expired, malformed or different-service records", () => {
    for (const saved of [
      null,
      {},
      { session: { ...session(), expiresAt: 1 }, autoConnect: true },
      {
        session: { ...session(), base: "https://elsewhere.test" },
        autoConnect: true,
      },
      {
        session: { ...session(), mcpUrl: "https://elsewhere.test/mcp" },
        autoConnect: true,
      },
    ]) {
      localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(saved));
      expect(readStoredCloudSession(base)).toBeNull();
    }
  });
  it("uses the server's original absolute expiry and does not mint a new login", async () => {
    const remembered = session(),
      expiresAt = Date.now() + 50000;
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            user: remembered.user,
            expires_at: expiresAt,
            mcp_url: remembered.mcpUrl,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const restored = await restoreCloudSession(remembered);
    expect(restored.token).toBe(remembered.token);
    expect(restored.expiresAt).toBe(expiresAt);
    expect(fetch).toHaveBeenCalledWith(
      base + "/api/v1/editor/session",
      expect.objectContaining({
        cache: "no-store",
        headers: { Authorization: "Bearer " + remembered.token },
      }),
    );
  });
  it("clears rejected credentials but distinguishes temporary service failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(restoreCloudSession(session())).rejects.toMatchObject({
      invalidSession: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 503 })),
    );
    await expect(restoreCloudSession(session())).rejects.not.toHaveProperty(
      "invalidSession",
    );
  });
});
