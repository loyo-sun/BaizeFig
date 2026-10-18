import type { CloudSession } from "./cloud";
import { Cloud, Server, Plug } from "lucide-react";
import { useI18n } from "./LanguageContext";

export function CloudPanel(p: {
  status: string;
  session: CloudSession | null;
  signingIn: boolean;
  cloudActive: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onCloudConnect: () => void;
  onCloudDisconnect: () => void;
  onCopy: () => void;
  onConnection: () => void;
  onLocal: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="cloud-panel" aria-label={t("Cloud services")}>
      <header>
        <h2>{t("Cloud")}</h2>
        <p>{t("Connect AI through LoyoCloud or your own deployment.")}</p>
      </header>
      <section className="cloud-card" aria-labelledby="loyocloud-heading">
        <Cloud size={21} aria-hidden="true" />
        <h3 id="loyocloud-heading">LoyoCloud</h3>
        {p.session ? (
          <>
            <p>{p.session.user.username}</p>
            <p className="muted">
              {t(
                "Application authorization stays valid when you switch canvases.",
              )}
            </p>
            <button
              className="primary"
              onClick={p.onCloudConnect}
              disabled={p.cloudActive && p.status !== "Disconnected"}
            >
              {t("Connect this canvas")}
            </button>
            {p.cloudActive && p.status !== "Disconnected" && (
              <button onClick={p.onCloudDisconnect}>
                {t("Disconnect canvas")}
              </button>
            )}
            <button onClick={p.onCopy}>{t("Copy MCP address")}</button>
            <a
              href={p.session.base + "/console"}
              target="_blank"
              rel="noreferrer"
            >
              {t("Manage application access")}
            </a>
            <button onClick={p.onSignOut}>{t("Sign out of cloud")}</button>
          </>
        ) : (
          <>
            <p>
              {t(
                "Sign in to manage your application access and AI connections.",
              )}
            </p>
            <button
              className="primary"
              onClick={p.onSignIn}
              disabled={p.signingIn}
            >
              {t(p.signingIn ? "Signing in…" : "Sign in to LoyoCloud")}
            </button>
            <p className="muted">
              {t(
                "Sign in or create an account in the secure cloud window. Your password is never sent to this editor.",
              )}
            </p>
          </>
        )}
      </section>
      <section className="cloud-card" aria-labelledby="local-cloud-heading">
        <Server size={21} aria-hidden="true" />
        <h3 id="local-cloud-heading">{t("Your own deployment")}</h3>
        <p>
          {t(
            "Connect a local MCP service or configure your self-hosted service. No LoyoCloud account is required.",
          )}
        </p>
        <button onClick={p.onLocal} disabled={p.status !== "Disconnected"}>
          {t("Local deployment")}
        </button>
      </section>
      <section className="cloud-card" aria-labelledby="mcp-cloud-heading">
        <Plug size={21} aria-hidden="true" />
        <h3 id="mcp-cloud-heading">MCP</h3>
        <div className="connection-state" role="status">
          <span
            className={p.status === "Connected" ? "green-dot" : "gray-dot"}
          />
          {t(p.status)}
        </div>
        {p.cloudActive && p.session ? (
          <>
            <code className="cloud-mcp-url">{p.session.mcpUrl}</code>
            <p>
              {t(
                "Add this MCP address in your AI tool, then sign in and authorize BaizeFig.",
              )}
            </p>
            <a
              href={p.session.base + "/guide"}
              target="_blank"
              rel="noreferrer"
            >
              {t("Connection guide")}
            </a>
          </>
        ) : (
          <button onClick={p.onConnection}>{t("MCP connection")}</button>
        )}
      </section>
    </section>
  );
}
