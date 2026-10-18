import { useState } from "react";
import type { CloudSession } from "./cloud";
import { Cloud, Server, Bot, ChevronRight } from "lucide-react";
import { useI18n } from "./LanguageContext";

export function CloudPanel(p: {
  status: string;
  session: CloudSession | null;
  signingIn: boolean;
  cloudActive: boolean;
  serviceAddress: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onCloudConnect: () => void;
  onCloudDisconnect: () => void;
  onCopy: (address: string) => void;
  onConnection: () => void;
  onLocal: () => void;
}) {
  const { t } = useI18n();
  const [deployment, setDeployment] = useState<"cloud" | "self">("cloud");
  const connected = p.status === "Connected";
  const cloudService =
    p.status !== "Disconnected" ? p.cloudActive : deployment === "cloud";
  const address = cloudService ? p.session?.mcpUrl : p.serviceAddress;
  return (
    <section className="cloud-panel" aria-label={t("Cloud services")}>
      <header className="cloud-panel-header">
        <div className="cloud-title-row">
          <h2>{t("Cloud")}</h2>
          <select
            aria-label={t("Deployment method")}
            value={deployment}
            onChange={(e) => setDeployment(e.target.value as "cloud" | "self")}
          >
            <option value="cloud">LoyoCloud</option>
            <option value="self">{t("Your own deployment")}</option>
          </select>
        </div>
        <p>{t("Connect AI through LoyoCloud or your own deployment.")}</p>
      </header>
      <div className="cloud-panel-body">
        {deployment === "cloud" ? (
          <section className="cloud-card" aria-labelledby="loyocloud-heading">
            <div className="cloud-card-heading">
              <span className="cloud-service-icon">
                <Cloud size={23} fill="currentColor" aria-hidden="true" />
              </span>
              <div>
                <h3 id="loyocloud-heading">LoyoCloud</h3>
                <p>{t("Official cloud service")}</p>
              </div>
            </div>
            {p.session ? (
              <div className="cloud-card-content">
                <div className="cloud-account-row">
                  <span>{t("Account")}</span>
                  <strong>{p.session.user.username}</strong>
                </div>
                <a
                  className="cloud-account-link"
                  href={p.session.base + "/console"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Account center")}
                  <ChevronRight size={15} aria-hidden="true" />
                </a>
              </div>
            ) : (
              <div className="cloud-card-content">
                <p>
                  {t(
                    "Sign in to manage your application access and AI connections.",
                  )}
                </p>
                <button
                  className="cloud-primary"
                  onClick={p.onSignIn}
                  disabled={p.signingIn}
                >
                  {t(p.signingIn ? "Signing in…" : "Sign in to LoyoCloud")}
                </button>
                <p className="cloud-fine-print">
                  {t(
                    "Sign in or create an account in the secure cloud window. Your password is never sent to this editor.",
                  )}
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="cloud-card" aria-labelledby="local-cloud-heading">
            <div className="cloud-card-heading">
              <span className="cloud-service-icon cloud-self-icon">
                <Server size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 id="local-cloud-heading">{t("Your own deployment")}</h3>
                <p>{t("Your infrastructure, your control")}</p>
              </div>
            </div>
            <div className="cloud-card-content">
              <p>
                {t(
                  "Connect a local MCP service or configure your self-hosted service. No LoyoCloud account is required.",
                )}
              </p>
              <button
                onClick={p.onLocal}
                disabled={p.status !== "Disconnected"}
              >
                {t("Configure deployment")}
              </button>
            </div>
          </section>
        )}
        <section
          className="cloud-card cloud-mcp-card"
          aria-labelledby="mcp-cloud-heading"
        >
          <div className="cloud-card-heading">
            <span className="cloud-service-icon cloud-mcp-icon">
              <Bot size={23} aria-hidden="true" />
            </span>
            <div>
              <h3 id="mcp-cloud-heading">MCP</h3>
              <p>{t("Shared by both deployments")}</p>
            </div>
            <span
              className={`cloud-status ${connected ? "is-connected" : ""}`}
              role="status"
            >
              <i />
              {t(p.status)}
            </span>
          </div>
          <div className="cloud-card-content">
            <span className="cloud-field-label">
              {t("MCP service address")}
            </span>
            {address ? (
              <div className="cloud-address-row">
                <code>{address}</code>
                <button onClick={() => p.onCopy(address)}>
                  {t("Copy address")}
                </button>
              </div>
            ) : (
              <p className="cloud-empty-address">
                {t("Connect a service to view its MCP address.")}
              </p>
            )}
            {p.status !== "Disconnected" && (
              <p className="cloud-fine-print">
                {t("Current connection")}:{" "}
                {p.cloudActive ? "LoyoCloud" : t("Your own deployment")}
              </p>
            )}
          </div>
          <div className="cloud-mcp-actions">
            {p.status === "Disconnected" &&
              deployment === "cloud" &&
              p.session && (
                <button className="cloud-primary" onClick={p.onCloudConnect}>
                  {t("Connect this canvas")}
                </button>
              )}
            <button onClick={p.onConnection}>{t("MCP connection")}</button>
            {p.status !== "Disconnected" && (
              <button className="cloud-danger" onClick={p.onCloudDisconnect}>
                {t("Disconnect")}
              </button>
            )}
          </div>
        </section>
        {p.session && (
          <footer className="cloud-panel-footer">
            <button onClick={p.onSignOut}>{t("Sign out of cloud")}</button>
            <p>
              {t(
                "Application authorization stays valid when you switch canvases.",
              )}
            </p>
          </footer>
        )}
      </div>
    </section>
  );
}
