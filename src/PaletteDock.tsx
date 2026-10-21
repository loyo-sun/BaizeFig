import { useId, useRef, useState } from "react";
import { Palette, Search } from "lucide-react";
import { execute, type Document } from "./core";
import { useI18n } from "./LanguageContext";
export function PaletteDock({
  doc,
  selected,
  onChange,
}: {
  doc: Document;
  selected: string[];
  onChange: (doc: Document) => void;
}) {
  const { t } = useI18n(),
    id = useId(),
    ref = useRef<HTMLDivElement>(null),
    [tab, setTab] = useState<"color" | "type">("color"),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  const colors = [
    ...[
      ...new Set(doc.nodes.map((n) => n.fill).filter((f) => f !== "none")),
    ].map((color) => ({ id: undefined, name: color.toUpperCase(), color })),
  ].filter((c) =>
    (c.name + c.color).toLowerCase().includes(query.toLowerCase()),
  );
  const styles = [
    ...new Map(
      doc.nodes
        .filter((n) => n.type === "text")
        .map((n) => [
          JSON.stringify([
            n.fontFamily,
            n.fontSize,
            n.fontWeight,
            n.lineHeight,
          ]),
          n,
        ]),
    ).values(),
  ].filter((n) =>
    `${n.fontFamily} ${n.fontSize}`.toLowerCase().includes(query.toLowerCase()),
  );
  const apply = (fn: (doc: Document, id: string) => Document) => {
    try {
      let next = doc;
      for (const id of selected) next = fn(next, id);
      onChange(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  function position(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect(),
      el = ref.current!;
    el.style.left = `${Math.min(window.innerWidth - 300, Math.max(8, r.left))}px`;
    el.style.top = `${r.bottom + 332 <= window.innerHeight ? r.bottom + 12 : Math.max(8, r.top - 332)}px`;
  }
  return (
    <div className="palette-dock">
      <button
        aria-label={t("Styles")}
        title={t("Colors and typography")}
        popoverTarget={id}
        onClick={position}
      >
        <Palette size={16} strokeWidth={1.5} />
      </button>
      <div
        popover="auto"
        ref={ref}
        id={id}
        className="inspector-popover quick-palette"
        role="dialog"
        aria-label={t("Styles")}
      >
        <div
          className="palette-tabs"
          role="tablist"
          aria-label={t("Colors and typography")}
        >
          <button
            role="tab"
            aria-selected={tab === "color"}
            className={tab === "color" ? "active" : ""}
            onClick={() => {
              setTab("color");
              setQuery("");
              setError("");
            }}
          >
            {t("Colors")}
          </button>
          <button
            role="tab"
            aria-selected={tab === "type"}
            className={tab === "type" ? "active" : ""}
            onClick={() => {
              setTab("type");
              setQuery("");
              setError("");
            }}
          >
            {t("Typography")}
          </button>
        </div>
        <label className="palette-search">
          <Search size={14} />
          <input
            aria-label={t("Search styles")}
            placeholder={t("Search styles")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {tab === "color" ? (
          <div className="palette-colors">
            {colors.map((c, i) => (
              <button
                key={c.id ?? c.color + i}
                disabled={!selected.length}
                aria-label={t("Apply color") + " " + c.name}
                title={c.name}
                onClick={() =>
                  apply(
                    (d, id) =>
                      execute(d, {
                        type: "update",
                        ids: [id],
                        patch: { fill: c.color },
                      }).doc,
                  )
                }
              >
                <span style={{ background: c.color }} />
                <label>{c.name}</label>
              </button>
            ))}
          </div>
        ) : (
          <div className="palette-typography">
            {styles.map((n) => (
              <button
                key={n.id}
                disabled={
                  !selected.some((id) =>
                    doc.nodes.some((n) => n.id === id && n.type === "text"),
                  )
                }
                onClick={() =>
                  apply((d, id) => {
                    const node = d.nodes.find((n) => n.id === id)!;
                    return node.type === "text"
                      ? execute(d, {
                          type: "update",
                          ids: [id],
                          patch: {
                            fontFamily: n.fontFamily,
                            fontSize: n.fontSize,
                            fontWeight: n.fontWeight,
                            lineHeight: n.lineHeight,
                            textFlow: {
                              ...node.textFlow!,
                              letterSpacing: n.textFlow?.letterSpacing ?? 0,
                            },
                          },
                        }).doc
                      : d;
                  })
                }
              >
                {n.fontFamily.replaceAll('"', "")}
                <small>
                  {n.fontSize} / {n.fontWeight}
                </small>
              </button>
            ))}
          </div>
        )}
        {!(tab === "color" ? colors.length : styles.length) && (
          <p className="muted">{t("No styles in this file")}</p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
