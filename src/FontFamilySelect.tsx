import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import type { Document } from "./core";
import { documentFonts, hasFont, fontFamilies } from "./fonts";
import { useI18n } from "./LanguageContext";
const candidates = [
  "Inter",
  "Arial",
  "Helvetica",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Menlo",
  "Monaco",
  "PingFang SC",
  "Hiragino Sans GB",
  "Songti SC",
  "Heiti SC",
  "Microsoft YaHei",
  "SimSun",
  "Noto Sans CJK SC",
  "Noto Sans SC",
];
export function FontFamilySelect({
  doc,
  value,
  onChange,
  label = "Font family",
}: {
  doc: Document;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { t } = useI18n();
  const [installed, setInstalled] = useState<string[]>(["Inter"]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const popoverId = useId(),
    popup = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    search = useRef<HTMLInputElement>(null);
  const names = useMemo(() => documentFonts(doc), [doc]);
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx || !alive) return;
      setInstalled(
        candidates.filter(
          (name) =>
            name === "Inter" ||
            hasFont(name, (font, sample) => {
              ctx.font = `72px ${font}`;
              return ctx.measureText(sample).width;
            }),
        ),
      );
    });
    return () => {
      alive = false;
    };
  }, []);
  const choices = [...new Set([...installed, ...names])].sort((a, b) =>
    a.localeCompare(b),
  );
  const filtered = choices.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );
  const choose = (name: string) => {
    onChange(JSON.stringify(name));
    popup.current?.hidePopover();
    trigger.current?.focus();
  };
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="font-family-select"
        aria-label={t(label)}
        title={value}
        popoverTarget={popoverId}
        aria-haspopup="listbox"
        onClick={() => {
          const b = trigger.current!.getBoundingClientRect();
          popup.current!.style.left = `${Math.max(8, b.left - 300)}px`;
          popup.current!.style.top = `${Math.max(8, Math.min(innerHeight - 408, b.top))}px`;
          setQuery("");
          setActive(0);
        }}
      >
        <span>{fontFamilies(value)[0] || value}</span>
        <ChevronDown size={14} />
      </button>
      <div
        ref={popup}
        id={popoverId}
        popover="auto"
        className="font-picker inspector-popover"
        role="dialog"
        aria-label={t(label)}
        onToggle={(e) => {
          if (e.newState === "open") search.current?.focus();
        }}
      >
        <label className="font-search">
          <Search size={16} />
          <input
            ref={search}
            aria-label={t("Search fonts")}
            placeholder={t("Search fonts")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                if (e.key === "Enter") {
                  if (filtered[active]) choose(filtered[active]);
                } else {
                  const next = Math.max(
                    0,
                    Math.min(
                      filtered.length - 1,
                      active + (e.key === "ArrowDown" ? 1 : -1),
                    ),
                  );
                  setActive(next);
                  popup.current
                    ?.querySelectorAll('[role="option"]')
                    [next]?.scrollIntoView({ block: "nearest" });
                }
              }
            }}
          />
        </label>
        <div role="listbox" aria-label={t("Font family")}>
          {filtered.map((name, i) => (
            <button
              type="button"
              role="option"
              key={name}
              aria-selected={fontFamilies(value)[0] === name}
              className={active === i ? "keyboard-active" : ""}
              onClick={() => choose(name)}
              style={{ fontFamily: name }}
            >
              <span>
                {name}
                {!installed.includes(name) ? ` · ${t("Document font")}` : ""}
              </span>
              {fontFamilies(value)[0] === name && <Check size={14} />}
            </button>
          ))}
          {!filtered.length && <p>{t("No matching fonts")}</p>}
        </div>
      </div>
    </>
  );
}
