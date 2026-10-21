import { Cloud, Construction, LogOut } from "lucide-react";
import type { CloudSession } from "./cloud";
import { useI18n } from "./LanguageContext";
export function CloudWorkspace({
  session,
  signingIn,
  onSignIn,
  onSignOut,
}: {
  session: CloudSession | null;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="cloud-workspace" aria-label={t("Cloud workspace")}>
      <span className="cloud-workspace-icon">
        <Cloud size={28} />
      </span>
      <h3>{t("Cloud workspace")}</h3>
      <p className="workspace-coming-soon">
        <Construction size={15} />
        {t("In development")}
      </p>
      <p>
        {t(
          "Cloud files and team workspaces are in development. Your local files stay in this browser.",
        )}
      </p>
      {session ? (
        <div className="workspace-account">
          <span>{t("Signed in")}</span>
          <strong>{session.user.username}</strong>
          <button onClick={onSignOut}>
            <LogOut size={14} />
            {t("Sign out of cloud")}
          </button>
        </div>
      ) : (
        <button className="primary" disabled={signingIn} onClick={onSignIn}>
          {t(signingIn ? "Signing in…" : "Sign in to LoyoCloud")}
        </button>
      )}
    </section>
  );
}
