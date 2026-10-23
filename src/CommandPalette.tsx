import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { matchesCommand } from "./commandSearch";
import { useI18n } from "./LanguageContext";
export type CommandCandidate = {
  name: string;
  key?: string;
  disabled?: boolean;
  run: () => void;
};
export function CommandPalette({
  actions,
  query,
  onQueryChange,
  onClose,
}: {
  actions: CommandCandidate[];
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const id = useId(),
    list = useRef<HTMLDivElement>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const candidates = actions.filter((action) =>
    matchesCommand(action.name, query, t(action.name)),
  );
  const enabled = candidates.filter((action) => !action.disabled);
  const active =
    enabled.find((action) => action.name === activeName) || enabled[0];
  const activeIndex = candidates.findIndex((action) => action === active);
  useEffect(() => {
    if (activeIndex >= 0)
      list.current?.children[activeIndex]?.scrollIntoView?.({
        block: "nearest",
      });
  }, [active?.name, query, activeIndex]);
  function execute(action: CommandCandidate) {
    if (action.disabled) return;
    onClose();
    action.run();
  }
  return (
    <>
      <div className="command-search">
        <Search size={17} />
        <input
          autoFocus
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={id}
          aria-activedescendant={active ? `${id}-${activeIndex}` : undefined}
          placeholder={t("Search commands by Chinese, English or pinyin…")}
          aria-label={t("Search actions")}
          value={query}
          onChange={(e) => {
            setActiveName(null);
            onQueryChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key))
              return;
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "Escape") {
              onClose();
              return;
            }
            if (e.key === "Enter") {
              if (active) execute(active);
              return;
            }
            if (!enabled.length) return;
            const current = enabled.findIndex((action) => action === active);
            const next =
              (current + (e.key === "ArrowDown" ? 1 : -1) + enabled.length) %
              enabled.length;
            setActiveName(enabled[next].name);
          }}
        />
      </div>
      <div
        className="action-list"
        ref={list}
        id={id}
        role="listbox"
        aria-label={t("Suggested commands")}
      >
        {candidates.map((action, index) => (
          <button
            key={action.name}
            id={`${id}-${index}`}
            role="option"
            aria-label={t(action.name)}
            aria-selected={action === active}
            aria-disabled={action.disabled || undefined}
            disabled={action.disabled}
            tabIndex={-1}
            onMouseMove={() => {
              if (!action.disabled) setActiveName(action.name);
            }}
            onClick={() => execute(action)}
          >
            <span>{t(action.name)}</span>
            <kbd>{action.key}</kbd>
          </button>
        ))}
      </div>
      {!candidates.length && (
        <p className="command-empty" role="status">
          {t("No matching commands")}
        </p>
      )}
      <p className="command-keyboard-hint">
        {t("↑ ↓ to select · Enter to run · Esc to close")}
      </p>
    </>
  );
}
