import { useEffect, useRef, useState } from "react";
import type { Document } from "./core";
import {
  publishLibrary,
  useLibrary,
  toggleLibrary,
  validateLibraryPackage,
  type LibraryPackage,
} from "./componentLibraries";
import {
  saveLibrary,
  listLibraryVersions,
  latestLibraries,
  download,
} from "./storage";
import { useI18n } from "./LanguageContext";
export function LibraryManager({
  doc,
  onChange,
}: {
  doc: Document;
  onChange: (doc: Document) => void;
}) {
  const { t } = useI18n(),
    [packs, setPacks] = useState<LibraryPackage[]>([]),
    [versions, setVersions] = useState<LibraryPackage[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [replace, setReplace] = useState(false),
    [name, setName] = useState(doc.name),
    [choices, setChoices] = useState<Record<string, number>>({}),
    input = useRef<HTMLInputElement>(null);
  async function refresh() {
    const [latest, all] = await Promise.all([
      latestLibraries(),
      listLibraryVersions(),
    ]);
    setPacks(latest);
    setVersions(all);
    const own = latest.find((p) => p.sourceDocumentId === doc.id);
    if (own) setName(own.name);
  }
  useEffect(() => {
    void refresh().catch((e) => setError((e as Error).message));
  }, []);
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const missing = (doc.libraries ?? []).filter(
    (s) => !packs.some((p) => p.id === s.id),
  );
  return (
    <section className="library-manager text-properties">
      <h3>{t("Local component libraries")}</h3>
      <p className="muted">
        {t(
          "Publish a version, reuse it in another document, and apply updates when you choose. Cached components work offline.",
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {notice && <p role="status">{t(notice)}</p>}
      <label>
        {t("Library name")}
        <input
          aria-label={t("Library name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="segmented">
        <button
          disabled={busy || !name.trim()}
          onClick={() =>
            void act(async () => {
              const previous = packs.find((p) => p.sourceDocumentId === doc.id),
                pack = publishLibrary(doc, previous, name);
              await saveLibrary(pack);
              await refresh();
              setNotice("Library version published locally");
            })
          }
        >
          {t("Publish library version")}
        </button>
        <button disabled={busy} onClick={() => input.current?.click()}>
          {t("Import component library")}
        </button>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept=".baizefig-library,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file)
            void act(async () => {
              if (file.size > 50 * 1024 * 1024)
                throw Error("Library file exceeds 50 MiB");
              const parsed = JSON.parse(await file.text());
              validateLibraryPackage(parsed);
              await saveLibrary(parsed);
              await refresh();
              setNotice("Library imported locally");
            });
        }}
      />
      <label>
        <input
          type="checkbox"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
        />
        {t("Replace local edits to library mains when applying a version")}
      </label>
      {packs.map((pack) => {
        const subscription = doc.libraries?.find((s) => s.id === pack.id),
          revision = choices[pack.id] ?? pack.revision,
          chosen =
            versions.find((p) => p.id === pack.id && p.revision === revision) ??
            pack,
          removed =
            doc.componentLibrary?.filter(
              (c) => c.libraryId === pack.id && c.missing,
            ).length ?? 0;
        return (
          <article className="library-card" key={pack.id}>
            <strong>{pack.name}</strong>
            <p>
              {t("Published v{published}; this document: {current}", {
                published: pack.revision,
                current: subscription
                  ? "v" + subscription.revision
                  : t("Not enabled"),
              })}
            </p>
            <label>
              {t("Library version")}
              <select
                aria-label={t("Library version {name}", { name: pack.name })}
                value={revision}
                onChange={(e) =>
                  setChoices({ ...choices, [pack.id]: Number(e.target.value) })
                }
              >
                {versions
                  .filter((v) => v.id === pack.id)
                  .map((v) => (
                    <option key={v.revision} value={v.revision}>
                      v{v.revision}
                    </option>
                  ))}
              </select>
            </label>
            <div className="segmented">
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    if (
                      subscription?.revision === chosen.revision &&
                      subscription.enabled === false &&
                      !replace
                    )
                      onChange(toggleLibrary(doc, pack.id, true));
                    else onChange(useLibrary(doc, chosen, replace));
                    setNotice("Library version applied to this document");
                  })
                }
              >
                {t(subscription ? "Apply library version" : "Enable library")}
              </button>
              {subscription && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      onChange(
                        toggleLibrary(doc, pack.id, !subscription.enabled),
                      );
                    })
                  }
                >
                  {t(
                    subscription.enabled
                      ? "Disable library"
                      : "Enable cached library",
                  )}
                </button>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  download(
                    JSON.stringify(chosen, null, 2),
                    pack.name + "-v" + revision + ".baizefig-library",
                  )
                }
              >
                {t("Export library file")}
              </button>
            </div>
            {removed > 0 && (
              <p role="status">
                {t(
                  "{count} removed definitions remain cached for existing instances.",
                  { count: removed },
                )}
              </p>
            )}
          </article>
        );
      })}
      {missing.map((s) => (
        <article className="library-card" key={s.id}>
          <strong>
            {s.name} · v{s.revision}
          </strong>
          <p>
            {t(
              "Only the document cache is available. Import a library file to check updates; existing instances are preserved.",
            )}
          </p>
          <button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                onChange(toggleLibrary(doc, s.id, !s.enabled));
              })
            }
          >
            {t(s.enabled ? "Disable library" : "Enable cached library")}
          </button>
        </article>
      ))}
      {!packs.length && !missing.length && (
        <p>
          {t(
            "No published libraries yet. Publish this document or import a library file.",
          )}
        </p>
      )}
    </section>
  );
}
