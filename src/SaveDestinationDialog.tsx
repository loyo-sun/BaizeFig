import { useI18n } from "./LanguageContext";
import { useEffect, useState } from "react";
import type { CloudSession } from "./cloud";
import { cloudRequest } from "./saveDestination";
export function SaveDestinationDialog({
  session,
  busy,
  error,
  onSave,
  onCancel,
  initialWhere = "local",
  initialFolderId = null,
}: {
  initialWhere?: "local" | "cloud";
  initialFolderId?: string | null;
  session: CloudSession;
  busy: boolean;
  error: string;
  onSave: (
    where: "local" | "cloud",
    makeDefault: boolean,
    folderId: string | null,
  ) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [where, setWhere] = useState<"local" | "cloud">(initialWhere),
    [makeDefault, setMakeDefault] = useState(false),
    [parent, setParent] = useState<string | null>(initialFolderId),
    [folders, setFolders] = useState<
      { id: string; name: string; parent_id: string | null }[]
    >([]),
    [loading, setLoading] = useState(false),
    [folderError, setFolderError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (where !== "cloud") return;
    let stopped = false;
    setLoading(true);
    setFolderError("");
    cloudRequest(session, "")
      .then((d) => {
        if (!stopped) setFolders(d.folders);
      })
      .catch((e) => {
        if (!stopped) setFolderError(e.message);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [session.token, where, retry]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.stopImmediatePropagation();
        onCancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [busy, onCancel]);
  const chain = [];
  let cursor = parent;
  while (cursor) {
    const f = folders.find((x) => x.id === cursor);
    if (!f) break;
    chain.unshift(f);
    cursor = f.parent_id;
  }
  return (
    <div className="modal-backdrop save-destination-backdrop">
      <section
        className="modal save-destination-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Save file")}
      >
        <h2>{t("Where would you like to save?")}</h2>
        <p className="muted">{t("Choose a location for this save.")}</p>
        <fieldset disabled={busy}>
          <div className="save-location-options">
            <label>
              <input
                autoFocus
                type="radio"
                name="destination"
                checked={where === "local"}
                onChange={() => setWhere("local")}
              />
              {t("Local")}
              <span>{t("Download a .baizefig file")}</span>
            </label>
            <label>
              <input
                type="radio"
                name="destination"
                checked={where === "cloud"}
                onChange={() => setWhere("cloud")}
              />
              {t("Cloud")}
              <span>{t("Save to LoyoCloud")}</span>
            </label>
          </div>
          {where === "cloud" && (
            <section className="save-folder-picker">
              <h3>{t("Choose a cloud folder")}</h3>
              <nav aria-label={t("Save path")}>
                <button onClick={() => setParent(null)}>
                  {t("Cloud space")}
                </button>
                {chain.map((f) => (
                  <span key={f.id}>
                    {" "}
                    / <button onClick={() => setParent(f.id)}>{f.name}</button>
                  </span>
                ))}
              </nav>
              {loading ? (
                <p role="status">{t("Loading folders…")}</p>
              ) : folderError ? (
                <p role="alert">
                  {t(folderError)}{" "}
                  <button onClick={() => setRetry((x) => x + 1)}>
                    {t("Retry")}
                  </button>
                </p>
              ) : (
                <div className="save-folder-list">
                  {folders
                    .filter((f) => f.parent_id === parent)
                    .map((f) => (
                      <button key={f.id} onClick={() => setParent(f.id)}>
                        📁 {f.name}
                      </button>
                    ))}
                  {!folders.some((f) => f.parent_id === parent) && (
                    <p className="muted">
                      {t("This folder has no subfolders")}
                    </p>
                  )}
                </div>
              )}
              <p>
                {t("Save to: Cloud space")}
                {chain.map((f) => " / " + f.name).join("")}
              </p>
            </section>
          )}
          <label className="save-default-check">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
            />
            {t("Use as default save location (change in Preferences)")}
          </label>
          {error && <p role="alert">{t(error)}</p>}
          <div className="save-dialog-actions">
            <button onClick={onCancel}>{t("Cancel")}</button>
            <button
              className="primary"
              disabled={where === "cloud" && (loading || !!folderError)}
              onClick={() => onSave(where, makeDefault, parent)}
            >
              {busy ? t("Saving…") : t("Save")}
            </button>
          </div>
        </fieldset>
      </section>
    </div>
  );
}
