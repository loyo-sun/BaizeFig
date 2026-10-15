import { useEffect, useState } from "react";
import { compareSnapshots } from "./designMerge";
import type { Document } from "./core";
import {
  listVersions,
  saveVersion,
  restoreVersion,
  type DocumentVersion,
} from "./storage";
import { useI18n } from "./LanguageContext";
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
    [comparison, setComparison] = useState<DocumentVersion | null>(null),
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
      {comparison && (
        <section>
          <h3>
            {t("Changed fields")} · {t(comparison.name)}
          </h3>
          <p>{t("Comparing saved version with current design")}</p>
          <ul>
            {compareSnapshots(comparison.document, doc).map((c, i) => (
              <li key={i}>
                {c.path
                  .map((part, index) =>
                    index === 1 && c.path[0] === "nodes"
                      ? ((
                          doc.nodes.find((n) => n.id === part) ??
                          comparison.document.nodes.find((n) => n.id === part)
                        )?.name ?? part)
                      : t(part),
                  )
                  .join(" › ")}
              </li>
            ))}
          </ul>
        </section>
      )}
      {versions.map((v) => (
        <article key={v.id} className="version-row">
          <div>
            <strong>
              {["Before restore", "Before merge"].includes(v.name)
                ? t(v.name)
                : v.name}
            </strong>
            <p>
              {new Date(v.createdAt).toLocaleString(language)} ·{" "}
              {v.document.pages.length} {t("Pages")} · {v.document.nodes.length}{" "}
              {t("Layers")}
            </p>
          </div>
          <button disabled={busy} onClick={() => setComparison(v)}>
            {t("Compare version")}
          </button>
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
