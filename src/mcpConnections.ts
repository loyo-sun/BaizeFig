export function remoteEndpoint(address: string) {
  const url = new URL(address.trim());
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["/", "/mcp"].includes(url.pathname)
  )
    throw Error(
      "Enter an HTTPS service origin or /mcp address without credentials",
    );
  return url.origin + "/mcp";
}
export function newPairingToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export function serviceEnvironment(
  address: string,
  editorOrigin: string,
  pairingToken: string,
) {
  const endpoint = new URL(remoteEndpoint(address)),
    origin = new URL(editorOrigin);
  if (
    origin.origin !== editorOrigin ||
    !["http:", "https:"].includes(origin.protocol) ||
    !/^[0-9a-f]{64}$/.test(pairingToken)
  )
    throw Error("Invalid service configuration");
  return [
    "# BaizeFig OAuth service. Keep this file private; do not commit it.",
    "BAIZEFIG_HOST=127.0.0.1",
    "BAIZEFIG_PORT=4319",
    "BAIZEFIG_AUTH_MODE=oauth",
    `BAIZEFIG_PUBLIC_URL=${endpoint.origin}`,
    `BAIZEFIG_HOSTS=${endpoint.hostname},127.0.0.1,localhost`,
    `BAIZEFIG_ORIGINS=${editorOrigin}`,
    `BAIZEFIG_PAIRING_TOKEN=${pairingToken}`,
    "",
  ].join("\n");
}
export function configuredMcpEndpoint(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return remoteEndpoint(value);
  } catch {
    return "";
  }
}
export function connectionGuide(address: string) {
  return JSON.stringify(
    {
      name: "BaizeFig",
      url: remoteEndpoint(address),
      transport: "streamableHttp",
      authentication: { type: "OAuth", pkce: "S256" },
      steps: [
        "Add this same MCP URL through the client's custom connector entry.",
        "Choose OAuth, then approve the request in the paired BaizeFig canvas.",
      ],
      instructions:
        "A generic connection guide, not a client import manifest. Deploy your own HTTPS service first. Requires custom remote MCP support with Streamable HTTP and OAuth (S256 PKCE).",
    },
    null,
    2,
  );
}

export function localConnectionConfig(origin: string) {
  const url = new URL(origin);
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol))
    throw Error("Invalid editor origin");
  return JSON.stringify(
    {
      mcpServers: {
        baizefig: {
          command: "node",
          args: ["/absolute/path/to/BaizeFig/bridge/server.mjs"],
          env: { BAIZEFIG_ORIGINS: origin, BAIZEFIG_AUTO_PAIR: "1" },
        },
      },
    },
    null,
    2,
  );
}
