import { useEffect, useState } from "react";
import type { Document } from "./core";
import {
  listVersions,
  saveVersion,
  restoreVersion,
  type DocumentVersion,
} from "./storage";
import { useI18n } from "./LanguageProvider";
export function VersionHistory({
  doc,
  onRestore,
}: {
  doc: Document;
  onRestore: (d: Document) => void;
}) {
  const { t, language } = useI18n(),
    [versions, setVersions] = useState<DocumentVersion[]>([]),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    listVersions(doc.id)
      .then((v) => {
        if (active) setVersions(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [doc.id]);
  async function perform(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
      setVersions(await listVersions(doc.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="version-history">
      <p className="muted">
        {t(
          "Named snapshots are stored in this browser. Restoring creates a recovery checkpoint and can be undone.",
        )}
      </p>
      <div className="find-buttons">
        <input
          aria-label={t("Version name")}
          placeholder={t("Version name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              await saveVersion(
                doc,
                name || new Date().toLocaleString(language),
              );
              setName("");
            })
          }
        >
          {t("Save version")}
        </button>
      </div>
      {error && <p role="alert">{t(error)}</p>}
      {!versions.length && <p>{t("No saved versions yet")}</p>}
      {versions.map((v) => (
        <article key={v.id} className="version-row">
          <div>
            <strong>
              {v.name === "Before restore" ? t("Before restore") : v.name}
            </strong>
            <p>
              {new Date(v.createdAt).toLocaleString(language)} ·{" "}
              {v.document.pages.length} {t("Pages")} · {v.document.nodes.length}{" "}
              {t("Layers")}
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                onRestore(await restoreVersion(doc, v.id));
              })
            }
          >
            {t("Restore version")}
          </button>
        </article>
      ))}
    </section>
  );
}
