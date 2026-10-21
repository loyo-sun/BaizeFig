export type CloudSession = {
  token: string;
  expiresAt: number;
  user: { id: string; username: string };
  base: string;
  mcpUrl: string;
};
export function cloudBase(value: unknown): string {
  const u = new URL(
    typeof value === "string" && value ? value : "https://cloud.loyo.work",
  );
  if (
    u.origin !== u.href.replace(/\/$/, "") ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    (u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname)
      ))
  )
    throw Error("Invalid LoyoCloud address");
  return u.origin;
}
const encode = (data: Uint8Array) =>
  btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export function loginCloud(
  base: string,
  durationDays = 30,
): Promise<CloudSession> {
  const state = encode(crypto.getRandomValues(new Uint8Array(24))),
    verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
  // Open synchronously with the click, before PKCE hashing, to avoid popup blocking.
  const opened = window.open(
    "about:blank",
    "loyocloud-login",
    "popup,width=560,height=760",
  );
  if (!opened)
    return Promise.reject(
      Error("Allow the LoyoCloud sign-in window, then try again."),
    );
  const popup: Window = opened;
  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => {
      finished = true;
      window.removeEventListener("message", receive);
      clearTimeout(timeout);
      clearInterval(poll);
    };
    const timeout = setTimeout(() => {
      cleanup();
      popup.close();
      reject(Error("Cloud sign-in timed out. Please try again."));
    }, 300000);
    const poll = setInterval(() => {
      if (!finished && popup.closed) {
        cleanup();
        reject(Error("Cloud sign-in window was closed."));
      }
    }, 1000);
    async function receive(event: MessageEvent) {
      if (
        event.origin !== base ||
        event.source !== popup ||
        event.data?.type !== "loyocloud_connected" ||
        event.data?.state !== state ||
        typeof event.data.code !== "string"
      )
        return;
      cleanup();
      try {
        const response = await fetch(base + "/api/v1/editor/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: event.data.code,
            code_verifier: verifier,
          }),
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error_description || "Cloud sign-in failed");
        if (
          typeof result.token !== "string" ||
          typeof result.user?.username !== "string" ||
          result.mcp_url !== base + "/mcp/baizefig" ||
          typeof result.user?.id !== "string" ||
          !Number.isFinite(result.expires_in) ||
          result.expires_in <= 0 ||
          result.expires_in > 90 * 86400
        )
          throw Error("Invalid cloud response");
        resolve({
          token: result.token,
          user: result.user,
          base,
          mcpUrl: result.mcp_url,
          expiresAt: Number.isFinite(result.expires_at)
            ? result.expires_at
            : Date.now() + result.expires_in * 1000,
        });
        popup.close();
      } catch (e) {
        popup.close();
        reject(e);
      }
    }
    window.addEventListener("message", receive);
    void crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(verifier))
      .then((hash) => {
        if (finished) return;
        const u = new URL("/connect/baizefig", base);
        u.search = new URLSearchParams({
          origin: location.origin,
          state,
          code_challenge: encode(new Uint8Array(hash)),
          session_days: String(durationDays),
        }).toString();
        popup.location.href = u.href;
      })
      .catch((e) => {
        cleanup();
        popup.close();
        reject(e);
      });
  });
}
export async function logoutCloud(s: CloudSession) {
  const r = await fetch(s.base + "/api/v1/editor/logout", {
    method: "POST",
    headers: { Authorization: "Bearer " + s.token },
  });
  if (!r.ok) throw Error("Cloud sign-out failed. Please retry.");
}

export async function restoreCloudSession(
  session: CloudSession,
  signal?: AbortSignal,
): Promise<CloudSession> {
  const response = await fetch(session.base + "/api/v1/editor/session", {
    headers: { Authorization: "Bearer " + session.token },
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
  });
  if (response.status === 401 || response.status === 403)
    throw Object.assign(Error("Cloud session expired. Please sign in again."), {
      invalidSession: true,
    });
  if (response.status === 404 || response.status === 405)
    throw Object.assign(
      Error("Cloud service needs an update before sign-in can be restored."),
      { unsupported: true },
    );
  if (!response.ok) throw Error("Cloud session restore unavailable");
  const result = await response.json();
  if (
    typeof result.user?.id !== "string" ||
    typeof result.user?.username !== "string" ||
    result.mcp_url !== session.base + "/mcp/baizefig" ||
    !Number.isFinite(result.expires_at) ||
    result.expires_at <= Date.now()
  )
    throw Object.assign(Error("Invalid cloud session"), {
      invalidSession: true,
    });
  return {
    ...session,
    user: result.user,
    expiresAt: result.expires_at,
    mcpUrl: result.mcp_url,
  };
}
