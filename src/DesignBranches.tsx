import { useEffect, useMemo, useState } from "react";
import type { Document } from "./core";
import {
  save,
  branchContext,
  createDesignBranch,
  getDocument,
  reviewDesignBranch,
  mergeDesignBranch,
  type DesignBranch,
  type BranchReview,
} from "./storage";
import { compareDesign, type MergeSide } from "./designMerge";
import { useI18n } from "./LanguageContext";
export function DesignBranches({
  doc,
  onOpen,
}: {
  doc: Document;
  onOpen: (d: Document) => void;
}) {
  const { t } = useI18n(),
    [mainId, setMainId] = useState(doc.id),
    [branches, setBranches] = useState<DesignBranch[]>([]),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [review, setReview] = useState<BranchReview | null>(null),
    [choices, setChoices] = useState<Record<string, MergeSide>>({});
  useEffect(() => {
    let active = true;
    branchContext(doc.id)
      .then((c) => {
        if (active) {
          setMainId(c.mainId);
          setBranches(c.branches);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [doc.id]);
  const comparison = useMemo(
    () =>
      review
        ? compareDesign(review.branch.base, review.main, review.draft, choices)
        : null,
    [review, choices],
  );
  async function perform(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const label = (path: string[]) =>
    path
      .map((part, index) => {
        if (index === 1 && path[0] === "nodes") {
          return (
            review?.draft.nodes.find((n) => n.id === part)?.name ??
            review?.main.nodes.find((n) => n.id === part)?.name ??
            part
          );
        }
        if (index === 1 && path[0] === "pages")
          return review?.draft.pages.find((p) => p.id === part)?.name ?? part;
        return t(part);
      })
      .join(" › ");
  const value = (v: unknown) =>
    v === undefined ? t("Deleted") : JSON.stringify(v)?.slice(0, 500);
  return (
    <section className="design-branches text-properties">
      <p className="muted">
        {t(
          "Design branches stay in this browser. They are separate design files, unrelated to Git branches. Compare and merge into the main design; recovery snapshots are saved automatically.",
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {doc.id === mainId ? (
        <div className="find-buttons">
          <input
            aria-label={t("Branch name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Branch name")}
          />
          <button
            className="primary"
            disabled={busy || !name.trim()}
            onClick={() =>
              void perform(async () =>
                onOpen(await createDesignBranch(doc, name)),
              )
            }
          >
            {t("Create and open branch")}
          </button>
        </div>
      ) : (
        <button
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              if (!(await save(doc)))
                throw Error("Restore the file from trash first");
              onOpen(await getDocument(mainId));
            })
          }
        >
          {t("Open main design")}
        </button>
      )}
      {!branches.length && <p>{t("No design branches yet")}</p>}
      {branches.map((b) => (
        <article className="version-row" key={b.id}>
          <strong>
            {b.name}
            {doc.id === b.id ? " · " + t("Current branch") : ""}
          </strong>
          <div className="find-buttons">
            <button
              disabled={busy || doc.id === b.id}
              onClick={() =>
                void perform(async () => {
                  if (!(await save(doc)))
                    throw Error("Restore the file from trash first");
                  onOpen(await getDocument(b.id));
                })
              }
            >
              {t("Open branch")}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  setReview(await reviewDesignBranch(doc, b.id));
                  setChoices({});
                })
              }
            >
              {t("Compare and merge")}
            </button>
          </div>
        </article>
      ))}
      {review && comparison && (
        <div className="branch-review">
          <h3>
            {t("Compare branch")} · {review.branch.name}
          </h3>
          <p>
            {t("Non-conflicting changes")}: {comparison.changes.length} ·{" "}
            {t("Conflicts")}: {comparison.conflicts.length}
          </p>
          <details>
            <summary>{t("Changed fields")}</summary>
            <ul>
              {comparison.changes.map((c, i) => (
                <li key={i}>
                  {label(c.path)} ·{" "}
                  {t(
                    c.side === "branch"
                      ? "Branch design"
                      : c.side === "main"
                        ? "Main design"
                        : "Both designs",
                  )}
                </li>
              ))}
            </ul>
          </details>
          {comparison.conflicts.map((c) => (
            <fieldset key={c.id}>
              <legend>{label(c.path)}</legend>
              <p>
                {t("Base value")}: <code>{value(c.base)}</code>
              </p>
              <label>
                {t("Resolve conflict")}
                <select
                  aria-label={t("Resolve conflict") + " " + label(c.path)}
                  value={choices[c.id] ?? ""}
                  disabled={busy}
                  onChange={(e) =>
                    setChoices({
                      ...choices,
                      [c.id]: e.target.value as MergeSide,
                    })
                  }
                >
                  <option value="" disabled>
                    {t("Choose a side")}
                  </option>
                  <option value="main">{t("Main design")}</option>
                  <option value="branch">{t("Branch design")}</option>
                </select>
              </label>
              <p>
                {t("Main design")}: <code>{value(c.main)}</code>
              </p>
              <p>
                {t("Branch design")}: <code>{value(c.branch)}</code>
              </p>
            </fieldset>
          ))}
          <p className="muted">
            {t(
              "The main file name is retained. Deleted parents or changed references must form a valid document after resolving conflicts. Merging saves checkpoints for both files and rebases the branch.",
            )}
          </p>
          <button
            className="primary"
            disabled={busy || comparison.conflicts.some((c) => !choices[c.id])}
            onClick={() =>
              void perform(async () =>
                onOpen(await mergeDesignBranch(review, choices)),
              )
            }
          >
            {t("Merge into main design")}
          </button>
        </div>
      )}
    </section>
  );
}
