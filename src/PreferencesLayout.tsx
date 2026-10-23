import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { useI18n } from "./LanguageContext";
export type PreferencesSection =
  "general" | "appearance" | "canvas" | "snapping" | "keyboard" | "fonts";
export function PreferencesLayout({
  sections,
  active,
  onChange,
  onClose,
}: {
  sections: {
    id: PreferencesSection;
    title: string;
    description: string;
    keywords: string;
    content: ReactNode;
  }[];
  active: PreferencesSection;
  onChange: (id: PreferencesSection) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const visible = sections.filter((s) =>
    (t(s.title) + " " + t(s.description) + " " + s.keywords)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const current = visible.find((s) => s.id === active) || visible[0];
  return (
    <div className="preferences-layout">
      <aside className="preferences-sidebar">
        <label className="preferences-search">
          <Search size={15} />
          <input
            aria-label={t("Search settings")}
            placeholder={t("Search settings")}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div
          className="preferences-navigation"
          role="tablist"
          aria-label={t("Settings categories")}
          aria-orientation="vertical"
        >
          {visible.map((section, index) => (
            <button
              key={section.id}
              id={"preference-tab-" + section.id}
              role="tab"
              aria-selected={section.id === current?.id}
              aria-controls={"preference-panel-" + section.id}
              tabIndex={section.id === current?.id ? 0 : -1}
              onClick={() => onChange(section.id)}
              onKeyDown={(e) => {
                let next = index;
                if (e.key === "ArrowDown") next = (index + 1) % visible.length;
                else if (e.key === "ArrowUp")
                  next = (index + visible.length - 1) % visible.length;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = visible.length - 1;
                else return;
                e.preventDefault();
                onChange(visible[next].id);
                document
                  .getElementById("preference-tab-" + visible[next].id)
                  ?.focus();
              }}
            >
              {t(section.title)}
            </button>
          ))}
        </div>
      </aside>
      <div className="preferences-main">
        {current ? (
          <section
            key={current.id}
            role="tabpanel"
            id={"preference-panel-" + current.id}
            aria-labelledby={"preference-tab-" + current.id}
            tabIndex={0}
            className="preferences-content general-settings"
          >
            <header>
              <h3>{t(current.title)}</h3>
              <p className="muted">{t(current.description)}</p>
            </header>
            {current.content}
          </section>
        ) : (
          <p className="preferences-empty" role="status">
            {t("No matching settings")}
          </p>
        )}
        <footer className="preferences-footer">
          <span>{t("Changes take effect immediately")}</span>
          <button className="primary" onClick={onClose}>
            {t("Close")}
          </button>
        </footer>
      </div>
    </div>
  );
}
