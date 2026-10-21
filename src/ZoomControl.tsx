import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "./LanguageContext";

export function ZoomControl({
  zoom,
  onZoom,
  onFit,
  onSelection,
  hasSelection,
  fitShortcut,
  selectionShortcut,
}: {
  zoom: number;
  onZoom: (zoom: number) => void;
  onFit: () => void;
  onSelection: () => void;
  hasSelection: boolean;
  fitShortcut: string;
  selectionShortcut: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [open]);
  const finish = (action: () => void) => {
    action();
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div
      className="zoom-control"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="inspector-zoom"
        aria-label={t("Zoom menu")}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? id : undefined}
        onClick={() => {
          setDraft(String(Math.round(zoom * 100)));
          setOpen(!open);
        }}
      >
        {Math.round(zoom * 100)}%<ChevronDown size={12} />
      </button>
      {open && (
        <div
          id={id}
          className="zoom-menu"
          role="dialog"
          aria-label={t("Canvas zoom")}
        >
          <form
            className="zoom-entry"
            onSubmit={(event) => {
              event.preventDefault();
              const value = Number(draft);
              if (Number.isFinite(value) && value >= 5 && value <= 800)
                finish(() => onZoom(value / 100));
            }}
          >
            <label htmlFor={`${id}-value`}>{t("Zoom percentage")}</label>
            <div>
              <input
                id={`${id}-value`}
                autoFocus
                type="number"
                min={5}
                max={800}
                step="any"
                required
                value={draft}
                onFocus={(event) => event.target.select()}
                onChange={(event) => setDraft(event.target.value)}
              />
              <span>%</span>
              <button
                type="submit"
                aria-label={t("Apply zoom")}
                title={t("Apply zoom")}
              >
                <Check size={16} />
              </button>
            </div>
            <small>{t("Enter a value from 5 to 800")}</small>
          </form>
          <div className="zoom-presets">
            {[25, 50, 100, 200].map((value) => (
              <button
                key={value}
                aria-pressed={Math.abs(zoom * 100 - value) < 0.01}
                onClick={() => finish(() => onZoom(value / 100))}
              >
                {value}%
              </button>
            ))}
          </div>
          <hr />
          <button onClick={() => finish(onFit)}>
            {t("Zoom to fit")}
            <kbd>{fitShortcut}</kbd>
          </button>
          <button disabled={!hasSelection} onClick={() => finish(onSelection)}>
            {t("Zoom to selection")}
            <kbd>{selectionShortcut}</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
