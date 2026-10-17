import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
const random = () => randomBytes(32).toString("base64url");
const digest = (value) =>
  createHash("sha256").update(value).digest("base64url");
const equals = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function validatePublicUrl(value) {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw Error(
      "BAIZEFIG_PUBLIC_URL must be an HTTPS origin (HTTP only on loopback), without a path or credentials",
    );
  return url.origin;
}
function validRedirect(value) {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) ||
        (url.protocol === "workbuddy:" &&
          url.hostname === "workbuddy" &&
          url.pathname.startsWith("/mcp/")))
    );
  } catch {
    return false;
  }
}
export function createOAuth({ publicUrl, getEditor, notify, now = Date.now }) {
  const issuer = validatePublicUrl(publicUrl),
    resource = issuer + "/mcp";
  const clients = new Map(),
    flows = new Map(),
    codes = new Map(),
    tokens = new Map(),
    refreshes = new Map();
  const expired = (map) => {
    for (const [id, entry] of map) if (entry.expires <= now()) map.delete(id);
  };
  const sweep = () =>
    [clients, flows, codes, tokens, refreshes].forEach(expired);
  const redirect = (flow, fields) => {
    const url = new URL(flow.redirectUri);
    for (const [key, value] of Object.entries({
      ...fields,
      state: flow.state,
      iss: issuer,
    }))
      if (value) url.searchParams.set(key, value);
    return url.href;
  };
  function json(res, status, value) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    });
    res.end(JSON.stringify(value));
  }
  function error(res, name, message, status = 400) {
    json(res, status, { error: name, error_description: message });
  }
  function bound(entry) {
    const editor = getEditor();
    return (
      editor &&
      entry.editorId === editor.editorId &&
      entry.documentId === editor.documentId
    );
  }
  function issue(entry) {
    if (tokens.size >= 500 || refreshes.size >= 500)
      throw Error("Token capacity reached");
    const access = random(),
      refresh = random();
    tokens.set(digest(access), { ...entry, expires: now() + 3600000 });
    refreshes.set(digest(refresh), {
      ...entry,
      expires: now() + 30 * 86400000,
    });
    return {
      access_token: access,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refresh,
      scope: "baizefig:design",
    };
  }
  return {
    resource,
    authenticate(header) {
      sweep();
      const entry =
        typeof header === "string" && header.startsWith("Bearer ")
          ? tokens.get(digest(header.slice(7)))
          : undefined;
      return entry && bound(entry)
        ? { documentId: entry.documentId, editorId: entry.editorId }
        : null;
    },
    revokeEditor(editorId) {
      for (const map of [flows, codes, tokens, refreshes])
        for (const [key, entry] of map)
          if (entry.editorId === editorId) map.delete(key);
    },
    decide(id, approved, editor) {
      sweep();
      const flow = flows.get(id);
      if (
        !flow ||
        flow.result ||
        flow.editorId !== editor.editorId ||
        flow.documentId !== editor.documentId ||
        !bound(flow)
      )
        return false;
      if (approved) {
        if (codes.size >= 100) return false;
        const code = random();
        codes.set(digest(code), { ...flow, expires: now() + 120000 });
        flow.result = redirect(flow, { code });
      } else flow.result = redirect(flow, { error: "access_denied" });
      return true;
    },
    async route(req, res, url, readBody) {
      if (
        ![
          "/.well-known/oauth-protected-resource",
          "/.well-known/oauth-protected-resource/mcp",
          "/.well-known/oauth-authorization-server",
          "/oauth/register",
          "/oauth/authorize",
          "/oauth/result",
          "/oauth/token",
        ].includes(url.pathname)
      )
        return false;
      sweep();
      if (url.pathname.startsWith("/.well-known/") && req.method === "GET") {
        json(
          res,
          200,
          url.pathname.includes("protected-resource")
            ? {
                resource,
                authorization_servers: [issuer],
                scopes_supported: ["baizefig:design"],
                bearer_methods_supported: ["header"],
              }
            : {
                issuer,
                authorization_endpoint: issuer + "/oauth/authorize",
                token_endpoint: issuer + "/oauth/token",
                registration_endpoint: issuer + "/oauth/register",
                response_types_supported: ["code"],
                grant_types_supported: ["authorization_code", "refresh_token"],
                code_challenge_methods_supported: ["S256"],
                token_endpoint_auth_methods_supported: ["none"],
                scopes_supported: ["baizefig:design"],
                authorization_response_iss_parameter_supported: true,
              },
        );
        return true;
      }
      if (url.pathname === "/oauth/register" && req.method === "POST") {
        const body = await readBody(req);
        let p;
        try {
          p = JSON.parse(body);
        } catch {
          error(res, "invalid_client_metadata", "JSON required");
          return true;
        }
        if (
          !p ||
          typeof p !== "object" ||
          !Array.isArray(p.redirect_uris) ||
          !p.redirect_uris.length ||
          p.redirect_uris.length > 5 ||
          !p.redirect_uris.every(validRedirect) ||
          (p.token_endpoint_auth_method &&
            p.token_endpoint_auth_method !== "none") ||
          (p.client_name &&
            (typeof p.client_name !== "string" || p.client_name.length > 120))
        ) {
          error(
            res,
            "invalid_client_metadata",
            "Public clients and valid exact redirect URIs required",
          );
          return true;
        }
        if (clients.size >= 200) {
          error(
            res,
            "temporarily_unavailable",
            "Client registration limit",
            429,
          );
          return true;
        }
        const id = random();
        const client = {
          client_id: id,
          client_name: p.client_name || "MCP client",
          redirect_uris: p.redirect_uris,
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
        };
        clients.set(id, { ...client, expires: now() + 30 * 86400000 });
        json(res, 201, client);
        return true;
      }
      if (url.pathname === "/oauth/authorize" && req.method === "GET") {
        const p = Object.fromEntries(url.searchParams),
          client = clients.get(p.client_id),
          editor = getEditor();
        if (!client || !client.redirect_uris.includes(p.redirect_uri)) {
          error(res, "invalid_request", "Unknown client or redirect URI");
          return true;
        }
        if (
          p.response_type !== "code" ||
          p.code_challenge_method !== "S256" ||
          !/^[A-Za-z0-9_-]{43}$/.test(p.code_challenge ?? "") ||
          p.resource !== resource ||
          (p.scope && p.scope !== "baizefig:design") ||
          (p.state?.length ?? 0) > 1000
        ) {
          error(
            res,
            "invalid_request",
            "Code flow requires S256 PKCE, this MCP resource and the supported scope",
          );
          return true;
        }
        if (!editor) {
          error(
            res,
            "temporarily_unavailable",
            "Connect your BaizeFig canvas before authorizing this client",
            503,
          );
          return true;
        }
        if (flows.size >= 20) {
          error(
            res,
            "temporarily_unavailable",
            "Too many pending approvals",
            429,
          );
          return true;
        }
        const id = random();
        const flow = {
          ...editor,
          clientId: p.client_id,
          redirectUri: p.redirect_uri,
          challenge: p.code_challenge,
          state: p.state ?? "",
          expires: now() + 300000,
        };
        flows.set(id, flow);
        notify({
          type: "oauth_request",
          request: {
            id,
            clientName: client.client_name,
            redirectUri: p.redirect_uri,
          },
        });
        const nonce = random();
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Frame-Options": "DENY",
          "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`,
        });
        res.end(
          `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>连接 BaizeFig</title><h1>请在 BaizeFig 画布中确认连接</h1><p>客户端声明的名称：${escape(client.client_name)}</p><p>返回地址：${escape(p.redirect_uri)}</p><p id="status">保持此窗口打开。仅在你主动发起连接时，在画布中允许访问。</p><script nonce="${nonce}">const end=Date.now()+300000;async function poll(){try{const r=await fetch('/oauth/result?id=${id}',{cache:'no-store'});const d=await r.json();if(d.redirect){location.replace(d.redirect);return;}if(!r.ok||Date.now()>end){document.getElementById('status').textContent='请求已失效，请重新连接。';return;}}catch{}setTimeout(poll,1000);}poll();</script></html>`,
        );
        return true;
      }
      if (url.pathname === "/oauth/result" && req.method === "GET") {
        const id = url.searchParams.get("id"),
          flow = flows.get(id);
        if (!flow || !bound(flow))
          error(res, "invalid_request", "Approval expired", 404);
        else if (flow.result) {
          flows.delete(id);
          json(res, 200, { redirect: flow.result });
        } else json(res, 200, { pending: true });
        return true;
      }
      if (url.pathname === "/oauth/token" && req.method === "POST") {
        const raw = await readBody(req);
        const p = Object.fromEntries(new URLSearchParams(raw));
        if (p.resource !== resource || !clients.has(p.client_id)) {
          error(res, "invalid_grant", "Invalid resource or client");
          return true;
        }
        if (p.grant_type === "authorization_code") {
          const entry = codes.get(digest(p.code ?? ""));
          if (
            !entry ||
            !bound(entry) ||
            entry.clientId !== p.client_id ||
            entry.redirectUri !== p.redirect_uri ||
            !/^[A-Za-z0-9._~-]{43,128}$/.test(p.code_verifier ?? "") ||
            !equals(entry.challenge, digest(p.code_verifier))
          ) {
            error(
              res,
              "invalid_grant",
              "Code, PKCE verifier, redirect or canvas is invalid",
            );
            return true;
          }
          codes.delete(digest(p.code));
          json(res, 200, issue(entry));
          return true;
        }
        if (p.grant_type === "refresh_token") {
          const entry = refreshes.get(digest(p.refresh_token ?? ""));
          if (!entry || !bound(entry) || entry.clientId !== p.client_id) {
            error(res, "invalid_grant", "Refresh token or canvas is invalid");
            return true;
          }
          refreshes.delete(digest(p.refresh_token));
          json(res, 200, issue(entry));
          return true;
        }
        error(
          res,
          "unsupported_grant_type",
          "Authorization code or refresh token required",
        );
        return true;
      }
      error(res, "invalid_request", "Method not allowed", 405);
      return true;
    },
  };
}
