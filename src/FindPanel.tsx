import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Document } from "./core";
import { findMatches, type FindMatch, type FindOptions } from "./findReplace";
import { useI18n } from "./LanguageContext";
export function FindPanel({
  doc,
  pageId,
  onLocate,
  onReplace,
  onClose,
}: {
  doc: Document;
  pageId: string;
  onLocate: (m: FindMatch) => void;
  onReplace: (matches: FindMatch[], value: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState(""),
    [replacement, setReplacement] = useState(""),
    [field, setField] = useState<FindOptions["field"]>("text"),
    [sensitive, setSensitive] = useState(false),
    [allPages, setAllPages] = useState(true),
    [index, setIndex] = useState(-1);
  const matches = useMemo(
    () =>
      findMatches(doc, {
        query,
        field,
        caseSensitive: sensitive,
        pageId: allPages ? undefined : pageId,
      }),
    [doc, query, field, sensitive, allPages, pageId],
  );
  useEffect(() => setIndex(-1), [query, field, sensitive, allPages]);
  const current = index >= 0 ? matches[index] : undefined;
  function step(direction: number) {
    if (!matches.length) return;
    const at =
      index < 0
        ? direction > 0
          ? 0
          : matches.length - 1
        : (index + direction + matches.length) % matches.length;
    setIndex(at);
    onLocate(matches[at]);
  }
  return (
    <section
      className="find-panel"
      role="dialog"
      aria-label={t("Find and replace")}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        } else if (
          e.key === "Enter" &&
          !(e.target instanceof HTMLButtonElement)
        ) {
          e.preventDefault();
          step(e.shiftKey ? -1 : 1);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
          e.preventDefault();
          step(e.shiftKey ? -1 : 1);
        }
      }}
    >
      <header>
        <strong>{t("Find and replace")}</strong>
        <button
          className="tiny"
          aria-label={t("Close dialog")}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>
      <input
        autoFocus
        aria-label={t("Find text")}
        placeholder={t("Find text")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        aria-label={t("Search scope")}
        value={field}
        onChange={(e) => setField(e.target.value as FindOptions["field"])}
      >
        <option value="text">{t("Text content")}</option>
        <option value="name">{t("Layer names")}</option>
        <option value="both">{t("Text and layer names")}</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
        />
        {t("Match case")}
      </label>
      <label>
        <input
          type="checkbox"
          checked={allPages}
          onChange={(e) => setAllPages(e.target.checked)}
        />
        {t("All pages")}
      </label>
      <div className="find-buttons">
        <button disabled={!matches.length} onClick={() => step(-1)}>
          {t("Find previous")}
        </button>
        <span role="status">
          {current ? index + 1 : 0} / {matches.length}
        </span>
        <button disabled={!matches.length} onClick={() => step(1)}>
          {t("Find next")}
        </button>
      </div>
      <input
        aria-label={t("Replace with")}
        placeholder={t("Replace with")}
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
      />
      <div className="find-buttons">
        <button
          disabled={!current}
          onClick={() => {
            onReplace([current!], replacement);
            setIndex(-1);
          }}
        >
          {t("Replace")}
        </button>
        <button
          disabled={!matches.length}
          onClick={() => {
            onReplace(matches, replacement);
            setIndex(-1);
          }}
        >
          {t("Replace all")}
        </button>
      </div>
      <small>
        {t("Locked layers are searchable but will not be replaced.")}
      </small>
    </section>
  );
}
