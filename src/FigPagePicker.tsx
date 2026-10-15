import { useState } from "react";
import type { FigPageSummary } from "./figImport";
import { useI18n } from "./LanguageContext";
export function FigPagePicker({
  pages,
  onChoose,
}: {
  pages: FigPageSummary[];
  onChoose: (ids: string[]) => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const total = pages
    .filter((p) => selected.includes(p.id))
    .reduce((n, p) => n + p.layers, 0);
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("Choose Figma pages")}
      >
        <h2>{t("Choose Figma pages")}</h2>
        <p>
          {t(
            "This large file can be imported by page. Referenced components are included automatically.",
          )}
        </p>
        <p>
          {t(
            "Source layer counts exclude expanded instances. Import fewer pages if the result exceeds the processing limit.",
          )}
        </p>
        <div style={{ maxHeight: "45vh", overflow: "auto" }}>
          {pages.map((page) => (
            <label
              key={page.id}
              style={{ display: "flex", gap: 10, padding: 8 }}
            >
              <input
                type="checkbox"
                checked={selected.includes(page.id)}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, page.id]
                      : ids.filter((id) => id !== page.id),
                  )
                }
              />
              <span>
                {page.name} ·{" "}
                {t("{count} source layers", { count: page.layers })}
              </span>
            </label>
          ))}
        </div>
        <p>
          {t("{count} source layers", { count: total })}
          {total > 15000 ? ` — ${t("Choose fewer pages")}` : ""}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onChoose([])}>{t("Cancel")}</button>
          <button
            className="primary"
            disabled={!selected.length || total > 15000}
            onClick={() => onChoose(selected)}
          >
            {t("Import selected pages")}
          </button>
        </div>
      </div>
    </div>
  );
}
