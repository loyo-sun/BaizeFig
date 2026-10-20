import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "./LanguageContext";
type Item = { id: string; label: string; key: string; icon: LucideIcon };
const groups = [
  ["move", "hand", "scale"],
  ["frame"],
  ["rectangle", "line", "arrow", "ellipse", "polygon", "star"],
  ["pen", "pencil"],
  ["text"],
];
export function ToolDock({
  items,
  active,
  onSelect,
}: {
  items: Item[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n(),
    ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [remembered, setRemembered] = useState<Record<number, string>>({});
  useEffect(() => {
    const index = groups.findIndex((ids) => ids.includes(active));
    if (index >= 0) setRemembered((p) => ({ ...p, [index]: active }));
  }, [active]);
  useEffect(() => {
    if (open !== null)
      ref.current
        ?.querySelector<HTMLButtonElement>('[role="menu"] button')
        ?.focus();
  }, [open]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <div
      className="tool-dock grouped-dock"
      ref={ref}
      role="toolbar"
      aria-label={t("Drawing tools")}
    >
      {groups.map((ids, index) => {
        const id = ids.includes(active)
          ? active
          : (remembered[index] ?? ids[0]);
        const item = items.find((i) => i.id === id)!;
        const select = (value: string) => {
          setRemembered((p) => ({ ...p, [index]: value }));
          onSelect(value);
          setOpen(null);
        };
        return (
          <div className="dock-group" key={index}>
            <button
              className={ids.includes(active) ? "active" : ""}
              aria-pressed={ids.includes(active)}
              aria-label={t(item.label)}
              title={`${t(item.label)} · ${item.id === "frame" ? "F / A" : item.key}`}
              onClick={() => select(item.id)}
            >
              <item.icon size={21} />
            </button>
            {ids.length > 1 && (
              <button
                className="dock-chevron"
                aria-label={t(item.label) + " · " + t("Tool options")}
                aria-haspopup="menu"
                aria-expanded={open === index}
                onClick={() => setOpen(open === index ? null : index)}
              >
                <ChevronDown size={16} strokeWidth={2.5} />
              </button>
            )}
            {open === index && (
              <div
                className="dock-menu"
                role="menu"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const buttons = [
                      ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                        "button",
                      ),
                    ];
                    const at = buttons.indexOf(
                      document.activeElement as HTMLButtonElement,
                    );
                    buttons[
                      (at + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                        buttons.length
                    ]?.focus();
                  }
                }}
              >
                {ids.map((key) => {
                  const entry = items.find((i) => i.id === key)!;
                  return (
                    <button
                      role="menuitemradio"
                      aria-checked={active === key}
                      key={key}
                      onClick={() => select(key)}
                    >
                      <span>{active === key && <Check size={15} />}</span>
                      <entry.icon size={18} />
                      <span>{t(entry.label)}</span>
                      <kbd>{key === "frame" ? "F / A" : entry.key}</kbd>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
