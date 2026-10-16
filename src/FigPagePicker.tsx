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
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const total = pages.reduce(
    (n, p) =>
      n +
      (selected.includes(p.id)
        ? p.layers
        : (p.parts ?? [])
            .filter((part) => selected.includes(part.id))
            .reduce((sum, part) => sum + part.layers, 0)),
    0,
  );
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
            <div key={page.id}>
              <label style={{ display: "flex", gap: 10, padding: 8 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(page.id)}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [
                            ...ids.filter(
                              (id) =>
                                !page.parts?.some((part) => part.id === id),
                            ),
                            page.id,
                          ]
                        : ids.filter((id) => id !== page.id),
                    )
                  }
                />
                <span>
                  {page.name} ·{" "}
                  {t("{count} source layers", { count: page.layers })}
                </span>
              </label>
              {!!page.parts?.length && (
                <button
                  onClick={() =>
                    setExpanded((ids) =>
                      ids.includes(page.id)
                        ? ids.filter((id) => id !== page.id)
                        : [...ids, page.id],
                    )
                  }
                  aria-expanded={expanded.includes(page.id)}
                >
                  {t("Choose frames or sections in {page}", {
                    page: page.name,
                  })}
                </button>
              )}
              {expanded.includes(page.id) && (
                <div style={{ paddingLeft: 24 }}>
                  {page.parts?.map((part) => (
                    <label
                      key={part.id}
                      style={{ display: "flex", gap: 10, padding: 6 }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected.includes(page.id) ||
                          selected.includes(part.id)
                        }
                        onChange={(e) =>
                          setSelected((ids) => {
                            const remaining = ids.filter(
                              (id) => id !== page.id && id !== part.id,
                            );
                            const siblings = ids.includes(page.id)
                              ? (page.parts ?? [])
                                  .filter((p) => p.id !== part.id)
                                  .map((p) => p.id)
                              : [];
                            return [
                              ...new Set([
                                ...remaining,
                                ...siblings,
                                ...(e.target.checked ? [part.id] : []),
                              ]),
                            ];
                          })
                        }
                      />
                      <span>
                        {part.name} ·{" "}
                        {t("{count} source layers", { count: part.layers })}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p>
          {t("{count} source layers", { count: total })}
          {total > 20000
            ? ` — ${t("Choose fewer pages or individual frames")}`
            : ""}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onChoose([])}>{t("Cancel")}</button>
          <button
            className="primary"
            disabled={!selected.length || total > 20000}
            onClick={() => onChoose(selected)}
          >
            {t("Import selected pages")}
          </button>
        </div>
      </div>
    </div>
  );
}
