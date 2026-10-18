import { Cloud, Server, Plug } from "lucide-react";
import { useI18n } from "./LanguageContext";

export function CloudPanel(p: {
  status: string;
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
        <p>
          {t("Sign in to manage your application access and AI connections.")}
        </p>
        <button className="primary" disabled>
          {t("Sign in to LoyoCloud")}
        </button>
        <p className="muted">
          {t(
            "LoyoCloud sign-in is not available yet. You can use your own MCP deployment below.",
          )}
        </p>
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
        <button onClick={p.onConnection}>{t("MCP connection")}</button>
      </section>
    </section>
  );
}
