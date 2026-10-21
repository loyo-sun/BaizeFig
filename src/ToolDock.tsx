import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Image as ImageIcon, Puzzle } from "lucide-react";
import { useI18n } from "./LanguageContext";
type Item = { id: string; label: string; key: string; icon: LucideIcon };
const groups = [
  ["move", "hand", "scale"],
  ["frame"],
  ["rectangle", "ellipse", "line", "arrow", "polygon", "star"],
  ["text"],
  ["pen", "pencil"],
];
export function ToolDock({
  items,
  active,
  onSelect,
  onImage,
  extensions,
}: {
  items: Item[];
  active: string;
  onSelect: (id: string) => void;
  onImage: () => void;
  extensions: { label: string; run: () => void }[];
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [remembered, setRemembered] = useState<Record<number, string>>({});
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const gesture = useRef<{
    x: number;
    y: number;
    before: typeof position;
  } | null>(null);
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
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  function dismiss() {
    setOpen(null);
    trigger.current?.focus();
  }
  return (
    <div
      className="tool-dock grouped-dock"
      ref={ref}
      role="toolbar"
      aria-label={t("Drawing tools")}
      style={{ marginLeft: position.x, marginTop: position.y }}
      onKeyDown={(e) => {
        if (open !== null && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }
        if (
          open !== null &&
          ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
        ) {
          e.preventDefault();
          const buttons = [
            ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="menu"] button',
            ),
          ];
          const i = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons[
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                  buttons.length
          ]?.focus();
        }
      }}
    >
      {groups.map((ids, index) => {
        const id = ids.includes(active)
          ? active
          : (remembered[index] ?? ids[0]);
        const item = items.find((i) => i.id === id)!;
        return (
          <div className="dock-group" key={index}>
            <button
              className={ids.includes(active) ? "active" : ""}
              aria-pressed={ids.includes(active)}
              aria-label={t(item.label)}
              title={`${t(item.label)} · ${item.key}`}
              onClick={() => {
                onSelect(item.id);
                setOpen(null);
              }}
            >
              <item.icon size={16} strokeWidth={1.5} />
            </button>
            {ids.length > 1 && (
              <button
                className="dock-chevron"
                aria-label={t(item.label) + " · " + t("Tool options")}
                aria-haspopup="menu"
                aria-expanded={open === index}
                onClick={(e) => {
                  trigger.current = e.currentTarget;
                  setOpen(open === index ? null : index);
                }}
              >
                <span />
              </button>
            )}
            {open === index && (
              <div className="dock-menu" role="menu">
                {ids.map((key) => {
                  const entry = items.find((i) => i.id === key)!;
                  return (
                    <button
                      role="menuitemradio"
                      aria-checked={active === key}
                      key={key}
                      onClick={() => {
                        setRemembered((p) => ({ ...p, [index]: key }));
                        onSelect(key);
                        dismiss();
                      }}
                    >
                      <span>{active === key && <Check size={14} />}</span>
                      <entry.icon size={18} />
                      <span>{t(entry.label)}</span>
                      <kbd>{entry.key}</kbd>
                    </button>
                  );
                })}
              </div>
            )}
            {index === 3 && (
              <button
                className="image-tool"
                aria-label={t("Place image")}
                title={t("Place image")}
                onClick={onImage}
              >
                <ImageIcon size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>
        );
      })}
      <div className="dock-group dock-extensions">
        <button
          aria-label={t("Extensions")}
          title={t("Extensions")}
          aria-haspopup="menu"
          aria-expanded={open === 9}
          onClick={(e) => {
            trigger.current = e.currentTarget;
            setOpen(open === 9 ? null : 9);
          }}
        >
          <Puzzle size={16} strokeWidth={1.5} />
        </button>
        {open === 9 && (
          <div className="dock-menu extensions-menu" role="menu">
            {extensions.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  dismiss();
                  item.run();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className="toolbar-grip"
        role="button"
        tabIndex={0}
        aria-label={t("Move toolbar")}
        title={t("Move toolbar")}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          gesture.current = { x: e.clientX, y: e.clientY, before: position };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const g = gesture.current,
            el = ref.current;
          if (!g || !el) return;
          const parent = el.parentElement!.getBoundingClientRect();
          setPosition({
            x: Math.min(
              parent.width / 2 - 164,
              Math.max(164 - parent.width / 2, g.before.x + e.clientX - g.x),
            ),
            y: Math.min(
              parent.height - 100,
              Math.max(-6, g.before.y + e.clientY - g.y),
            ),
          });
        }}
        onPointerUp={() => (gesture.current = null)}
        onPointerCancel={() => {
          if (gesture.current) setPosition(gesture.current.before);
          gesture.current = null;
        }}
        onDoubleClick={() => setPosition({ x: 0, y: 0 })}
        onKeyDown={(e) => {
          if (e.key === "Home") setPosition({ x: 0, y: 0 });
        }}
      />
    </div>
  );
}
