import { CloudFiles } from "./CloudFiles";
import type { Document } from "./core";
import { Cloud, LogOut } from "lucide-react";
import type { CloudSession } from "./cloud";
import { CloudSessionOptions } from "./CloudSessionOptions";
import { useI18n } from "./LanguageContext";
export function CloudWorkspace({
  document,
  onOpen,
  session,
  signingIn,
  restoring,
  restoreError,
  onRetryRestore,
  durationDays,
  onDurationChange,
  onSignIn,
  onSignOut,
}: {
  document: Document;
  onOpen: (doc: Document) => Promise<void>;
  session: CloudSession | null;
  signingIn: boolean;
  restoring: boolean;
  restoreError: string;
  onRetryRestore: () => void;
  durationDays: number;
  onDurationChange: (days: number) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const { t } = useI18n();
  return (
    <section
      className={`cloud-workspace ${session ? "has-session" : ""}`}
      aria-label={"LoyoCloud"}
    >
      <span className="cloud-workspace-icon">
        <Cloud size={28} />
      </span>
      <h3>{"LoyoCloud"}</h3>
      {session ? (
        <>
          <CloudFiles session={session} document={document} onOpen={onOpen} />

        </>
      ) : (
        <>
          {restoreError && (
            <div role="status">
              <p>{t(restoreError)}</p>
              <button onClick={onRetryRestore} disabled={restoring}>
                {t("Retry restoring sign-in")}
              </button>
            </div>
          )}
          <CloudSessionOptions
            days={durationDays}
            onChange={onDurationChange}
            disabled={signingIn}
          />
          <button className="primary" disabled={signingIn} onClick={onSignIn}>
            {t(
              restoring
                ? "Restoring sign-in…"
                : signingIn
                  ? "Signing in…"
                  : "Sign in to LoyoCloud",
            )}
          </button>
        </>
      )}
    </section>
  );
}
