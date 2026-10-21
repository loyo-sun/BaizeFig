import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "defaultValue"
> & { value: number | null; onValueChange: (value: number) => void };
/** Property edits commit once on Enter/blur; empty and cancelled drafts are inert. */
export function CommitNumberInput({
  value,
  onValueChange,
  min = -100000,
  max = 100000,
  onKeyDown,
  onBlur,
  ...rest
}: Props) {
  const format = (n: number | null) =>
      n === null ? "" : String(Math.round(n * 100) / 100),
    [draft, setDraft] = useState(format(value)),
    dirty = useRef(false);
  useEffect(() => {
    setDraft(format(value));
    dirty.current = false;
  }, [value]);
  const commit = () => {
    if (!dirty.current) return;
    dirty.current = false;
    const n = Number(draft);
    if (draft.trim() && Number.isFinite(n)) {
      const next = Math.max(Number(min), Math.min(Number(max), n));
      if (next !== value) onValueChange(next);
      setDraft(format(next));
    } else setDraft(format(value));
  };
  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => {
        dirty.current = true;
        setDraft(e.target.value);
      }}
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          dirty.current = false;
          setDraft(format(value));
          e.currentTarget.blur();
        } else if (e.key === "Enter") {
          e.preventDefault();
          commit();
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
}
