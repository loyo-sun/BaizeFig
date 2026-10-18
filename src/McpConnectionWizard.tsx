import { zipSync, strToU8 } from "fflate";
import { useI18n } from "./LanguageContext";
import {
  macSetupScript,
  localSetupCommand,
  newPairingToken,
  remoteClientConfig,
  remoteEndpoint,
  serviceEnvironment,
  type McpClient,
} from "./mcpConnections";
export type OAuthApproval = {
  id: string;
  clientName: string;
  redirectUri: string;
};
export function McpConnectionWizard(p: {
  address: string;
  token: string;
  status: string;
  write: boolean;
  exporting: boolean;
  client: McpClient;
  remote: boolean;
  onClient: (client: McpClient) => void;
  onRemote: (value: boolean) => void;
  onAddress: (value: string) => void;
  onToken: (value: string) => void;
  onWrite: (value: boolean) => void;
  onExport: (value: boolean) => void;
  onConnect: (automatic: boolean) => void;
  onDisconnect: () => void;
  approvals: OAuthApproval[];
  onApproval: (id: string, allowed: boolean) => void;
  notify: (value: string) => void;
}) {
  const { t } = useI18n();
  const { client, remote, onClient: setClient, onRemote: setRemote } = p;
  const locked = p.status !== "Disconnected";
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      p.notify("Copied");
    } catch {
      p.notify("Copy failed. Select and copy the displayed text.");
    }
  };
  function download(name: string, value: string | Uint8Array) {
    const url = URL.createObjectURL(
      new Blob(
        [typeof value === "string" ? value : new Uint8Array(value).buffer],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function choose(id: McpClient) {
    setClient(id);
    if (id === "doubao") {
      setRemote(true);
      if (p.address.startsWith("http:")) {
        p.onAddress("");
        p.onToken("");
      }
    }
  }
  function mode(value: boolean) {
    if (value === remote) return;
    setRemote(value);
    p.onAddress(value ? "" : "http://127.0.0.1:4319/mcp");
    p.onToken("");
  }
  let endpoint = "";
  try {
    endpoint = remoteEndpoint(p.address);
  } catch {
    /* Incomplete input is expected. */
  }
  return (
    <div className="mcp-wizard">
      <p className="muted">
        {t(
          "One MCP address and OAuth authorization for WorkBuddy, ChatGPT and Doubao Work. Keep this canvas open while designing.",
        )}
      </p>
      <div
        className="mcp-client-options"
        role="group"
        aria-label={t("Client setup instructions")}
      >
        {(
          [
            ["workbuddy", "WorkBuddy"],
            ["chatgpt", "ChatGPT"],
            ["doubao", "豆包工作"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={client === id}
            disabled={locked}
            onClick={() => choose(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="connection-state">
        <span className={p.status === "Connected" ? "green-dot" : "gray-dot"} />
        {t(p.status)}
      </div>
      {remote ? (
        <section aria-label={t("Unified remote connection")}>
          <ol className="bridge-steps">
            <li>
              {t("Copy the same HTTPS MCP address for any supported client.")}
            </li>
            <li>
              {t(
                "Add a custom MCP connection in your AI tool and choose OAuth.",
              )}
            </li>
            <li>
              {t(
                "Return to this canvas to approve access, then start designing.",
              )}
            </li>
          </ol>
          {!p.address && (
            <p className="notice">
              {t(
                "No online MCP service is configured yet. A deployment administrator must provide a real HTTPS service address; the static editor URL is not an MCP endpoint.",
              )}
            </p>
          )}
          <label className="config-label">
            {t("MCP service address")}
            <input
              aria-label={t("MCP service address")}
              value={p.address}
              disabled={locked}
              onChange={(e) => {
                p.onAddress(e.target.value);
                p.onToken("");
              }}
              placeholder="https://mcp.your-domain.com/mcp"
            />
          </label>
          <div className="file-actions">
            <button
              className="primary"
              disabled={!endpoint}
              onClick={() => void copy(endpoint)}
            >
              {t("Copy MCP address")}
            </button>
            <button
              disabled={!endpoint}
              onClick={() =>
                download(
                  "baizefig-mcp-connection.json",
                  remoteClientConfig(client, endpoint),
                )
              }
            >
              {t("Download connection guide")}
            </button>
          </div>
          <p>
            {t(
              client === "workbuddy"
                ? "WorkBuddy: add this address as a custom connector and use OAuth authorization."
                : client === "chatgpt"
                  ? "ChatGPT: add this address through the custom MCP entry available to your account and use OAuth authorization."
                  : "Doubao Work: use the custom connector or developer entry available to your account, with the same address and OAuth authorization.",
            )}
          </p>
          {client === "doubao" && (
            <p className="notice">
              {t(
                "Doubao Work's developer platform is in preview. Use its custom connector entry where available; official installation and publishing require platform access. No public plugin has been published.",
              )}
            </p>
          )}
          <p className="muted">
            {t(
              "Before client authorization, connect this canvas to the deployed service through the administrator settings below.",
            )}
          </p>
          <button
            disabled={locked || !endpoint || !p.token}
            onClick={() => p.onConnect(false)}
          >
            {t("Connect canvas to service")}
          </button>
        </section>
      ) : (
        <p className="notice">
          {t(
            "Local compatibility mode is active. Open the advanced local options to configure it, or return to the unified remote connection.",
          )}
        </p>
      )}
      <details className="mcp-advanced">
        <summary>{t("Local connection (advanced)")}</summary>
        <div
          className="mcp-mode-options"
          role="group"
          aria-label={t("Connection method")}
        >
          <button
            aria-pressed={!remote}
            disabled={locked || client === "doubao"}
            onClick={() => mode(false)}
          >
            {t("This computer")}
          </button>
          <button
            aria-pressed={remote}
            disabled={locked}
            onClick={() => mode(true)}
          >
            {t("Online MCP")}
          </button>
        </div>
        {!remote && (
          <>
            <p>
              {t(
                client === "chatgpt"
                  ? "Use ChatGPT desktop with local MCP support. For ChatGPT web, choose Online MCP."
                  : "Configure WorkBuddy once, then connect automatically without reading logs or copying pairing tokens.",
              )}
            </p>
            <button
              onClick={() =>
                download(
                  `baizefig-${client}-setup-macos.zip`,
                  zipSync({
                    "连接 BaizeFig.command": [
                      strToU8(
                        macSetupScript(
                          client as "workbuddy" | "chatgpt",
                          location.origin,
                        ),
                      ),
                      { os: 3, attrs: (0o100755 << 16) >>> 0 },
                    ],
                  }),
                )
              }
            >
              {t("Download Mac setup assistant")}
            </button>
            <p className="muted">
              {t(
                "On Mac: unzip, run the assistant, and select your installed BaizeFig project. Other systems can use the command below. Node.js and project dependencies are required.",
              )}
            </p>
            <pre className="mcp-config-preview">
              {localSetupCommand(
                client as "workbuddy" | "chatgpt",
                location.origin,
              )}
            </pre>
            <button
              onClick={() =>
                void copy(
                  localSetupCommand(
                    client as "workbuddy" | "chatgpt",
                    location.origin,
                  ),
                )
              }
            >
              {t("Copy setup command")}
            </button>
            <p className="muted">
              {t(
                "Setup preserves existing servers and creates a configuration backup. Run one local AI connection at a time.",
              )}
            </p>
            <button
              className="primary"
              disabled={locked}
              onClick={() => p.onConnect(true)}
            >
              {t("Connect automatically")}
            </button>
          </>
        )}
      </details>
      <details className="mcp-advanced">
        <summary>{t("Manual pairing and advanced settings")}</summary>
        {remote && (
          <>
            <p>
              {t(
                "Administrators only: generate a private deployment file, deploy the service, then connect this canvas. This does not create or host an online service.",
              )}
            </p>
            <button
              disabled={!endpoint || locked}
              onClick={() => {
                const token = newPairingToken();
                p.onToken(token);
                download(
                  ".env.baizefig",
                  serviceEnvironment(endpoint, location.origin, token),
                );
                p.notify(
                  "Service configuration downloaded. Restart your service with this file, then connect the canvas.",
                );
              }}
            >
              {t("Generate service configuration")}
            </button>
          </>
        )}
        {!remote && (
          <label className="config-label">
            {t("MCP service address")}
            <input
              aria-label={t("MCP service address")}
              value={p.address}
              onChange={(e) => {
                p.onAddress(e.target.value);
                p.onToken("");
              }}
              disabled={locked}
            />
          </label>
        )}
        <label className="config-label">
          {t("Pairing token")}
          <input
            type="password"
            aria-label={t("Bridge pairing token")}
            value={p.token}
            onChange={(e) => p.onToken(e.target.value)}
            disabled={locked}
          />
        </label>
        <button
          disabled={locked || !p.token}
          onClick={() => p.onConnect(false)}
        >
          {t("Connect bridge")}
        </button>
      </details>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={p.write}
          onChange={(e) => p.onWrite(e.target.checked)}
        />
        {t("Allow MCP to modify the currently open document")}
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={p.exporting}
          onChange={(e) => p.onExport(e.target.checked)}
        />
        {t("Allow MCP screenshots and SVG export")}
      </label>
      {p.approvals.map((request) => (
        <div className="mcp-consent" key={request.id}>
          <strong>{t("An AI client requests access to this canvas")}</strong>
          <p>
            {t("Client-reported name")}: {request.clientName}
          </p>
          <p className="mcp-redirect">
            {t("Return address")}: {request.redirectUri}
          </p>
          <p>
            {t(
              "Allow only a connection you started. Reading is allowed after approval; editing and export still require the permissions above.",
            )}
          </p>
          <div className="file-actions">
            <button
              className="primary"
              onClick={() => p.onApproval(request.id, true)}
            >
              {t("Allow access")}
            </button>
            <button onClick={() => p.onApproval(request.id, false)}>
              {t("Deny")}
            </button>
          </div>
        </div>
      ))}
      <div className="file-actions">
        <button onClick={p.onDisconnect}>{t("Disconnect")}</button>
        <a
          href={
            client === "doubao"
              ? "https://open.doubao.com/"
              : client === "chatgpt"
                ? "https://chatgpt.com/"
                : "https://www.workbuddy.cn/"
          }
          target="_blank"
          rel="noreferrer"
        >
          {t("Open client website")}
        </a>
      </div>
      <p className="notice">
        {t(
          "Disconnecting or switching files revokes access. Pairing never enables editing or export automatically.",
        )}
      </p>
    </div>
  );
}
