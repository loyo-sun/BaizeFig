import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "./LanguageContext";
export function NumberField({
  label,
  aria,
  value,
  onChange,
  min = -100000,
  max = 100000,
  step = 1,
  disabled = false,
  onClear,
  placeholder,
  icon,
}: {
  label: string;
  aria?: string;
  value: number | null;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onClear?: () => void;
  placeholder?: string;
  icon?: ReactNode;
}) {
  const { t } = useI18n();
  const format = (v: number | null) =>
    v === null ? "" : String(Math.round(v * 100) / 100);
  const [draft, setDraft] = useState(format(value));
  const dirty = useRef(false);
  useEffect(() => {
    setDraft(format(value));
    dirty.current = false;
  }, [value]);
  function apply() {
    if (!dirty.current) return;
    dirty.current = false;
    const n = Number(draft);
    if (Number.isFinite(n) && draft.trim()) {
      const next = Math.min(max, Math.max(min, n));
      if (next !== value) onChange(next);
      setDraft(String(next));
    } else if (!draft.trim() && onClear) onClear();
    else setDraft(format(value));
  }
  return (
    <label
      className="number-field"
      title={
        disabled
          ? t("Edit the main component to change instance layer geometry")
          : undefined
      }
    >
      <span aria-hidden={icon ? true : undefined}>{icon ?? t(label)}</span>
      <input
        type="number"
        disabled={disabled}
        aria-label={t(aria ?? label)}
        value={draft}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder ?? (value === null ? t("Mixed") : undefined)}
        onChange={(e) => {
          dirty.current = true;
          setDraft(e.target.value);
        }}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            dirty.current = false;
            setDraft(format(value));
            e.currentTarget.blur();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
