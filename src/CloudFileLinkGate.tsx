import { CloudSessionOptions } from "./CloudSessionOptions";
import { useI18n } from "./LanguageContext";
export function CloudFileLinkGate({
  error,
  restoring,
  signingIn,
  signedIn,
  restoreError,
  notice,
  days,
  onDays,
  onSignIn,
  onRestore,
  onRetry,
  onCancel,
}: {
  error: string;
  restoring: boolean;
  signingIn: boolean;
  signedIn: boolean;
  restoreError: string;
  notice: string;
  days: number;
  onDays: (days: number) => void;
  onSignIn: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="cloud-file-link-gate" aria-label={t("Open cloud file")}>
      <div className="cloud-file-link-card">
        <img src="/baize.svg" width="40" height="40" alt="BaizeFig" />
        <h1>
          {t(
            error
              ? "Unable to open cloud file"
              : "Opening selected cloud file…",
          )}
        </h1>
        <p role={error ? "alert" : "status"}>
          {t(
            error ||
              (restoring
                ? "Restoring sign-in…"
                : signedIn
                  ? "Downloading the selected file. Please wait."
                  : "Sign in to LoyoCloud to open the selected file."),
          )}
        </p>
        {restoreError && <p role="status">{t(restoreError)}</p>}
        {notice && <p role="status">{t(notice)}</p>}
        {!signedIn && !restoring && (
          <>
            <CloudSessionOptions
              days={days}
              onChange={onDays}
              disabled={signingIn}
            />
            <button className="primary" onClick={onSignIn} disabled={signingIn}>
              {t(signingIn ? "Signing in…" : "Sign in to LoyoCloud")}
            </button>
            {restoreError && (
              <button onClick={onRestore}>
                {t("Retry restoring sign-in")}
              </button>
            )}
          </>
        )}
        <div className="cloud-file-link-actions">
          {error && (
            <button className="primary" onClick={onRetry}>
              {t("Retry opening file")}
            </button>
          )}
          <button onClick={onCancel}>{t("Cancel opening")}</button>
        </div>
      </div>
    </section>
  );
}
