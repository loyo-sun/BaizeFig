export type McpClient = "workbuddy" | "chatgpt" | "doubao";
export function localSetupCommand(
  client: Exclude<McpClient, "doubao">,
  origin: string,
) {
  const url = new URL(origin);
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol))
    throw Error("Invalid editor origin");
  // Double quotes on POSIX shells must escape command substitution as well as quotes.
  const quoted = '"' + origin.replace(/[\\"$`]/g, "\\$&") + '"';
  return `npm run mcp:connect -- --client ${client} --origin ${quoted}`;
}
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
export function remoteClientConfig(_client: McpClient, address: string) {
  return JSON.stringify(
    {
      name: "BaizeFig",
      url: remoteEndpoint(address),
      transport: "streamableHttp",
      authentication: { type: "OAuth", pkce: "S256" },
      clients: ["WorkBuddy", "ChatGPT", "豆包工作"],
      steps: [
        "Add this same MCP URL through the client's custom connector entry.",
        "Choose OAuth, then approve the request in the paired BaizeFig canvas.",
      ],
      instructions:
        "A shared connection guide, not an official client import manifest. Deploy your own HTTPS service first. Doubao Work availability depends on platform access; this is not a verified Doubao plugin manifest.",
    },
    null,
    2,
  );
}

export function macSetupScript(
  client: Exclude<McpClient, "doubao">,
  origin: string,
) {
  if (!["workbuddy", "chatgpt"].includes(client))
    throw Error("Unsupported local client");
  const command = localSetupCommand(client, origin);
  const originArg = command.slice(command.indexOf("--origin ") + 9);
  return `#!/bin/zsh
set -eu
BAIZEFIG_PROJECT=$(/usr/bin/osascript -e 'POSIX path of (choose folder with prompt "选择已安装的 BaizeFig 项目文件夹")')
if [ ! -f "$BAIZEFIG_PROJECT/scripts/connect-client.mjs" ]; then
  echo "所选文件夹不是 BaizeFig 项目。请下载 GitHub 源码并完成 npm ci 后重试。"
  exit 1
fi
BAIZEFIG_NODE=""
for candidate in "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node || true)"; do
  if [ -x "$candidate" ] && "$candidate" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=19)?0:1)' 2>/dev/null; then
    BAIZEFIG_NODE="$candidate"
    break
  fi
done
if [ -z "$BAIZEFIG_NODE" ]; then
  echo "请先安装 Node.js 20.19 或更高版本，然后重新运行本助手。"
  exit 1
fi
cd -- "$BAIZEFIG_PROJECT"
"$BAIZEFIG_NODE" scripts/connect-client.mjs --client ${client} --origin ${originArg}
echo "配置完成。请在客户端重启 BaizeFig MCP，然后回到画布点击自动连接。"
`;
}
