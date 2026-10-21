import { useRef, useState } from "react";

export function InlineNameInput({
  name,
  label,
  onCommit,
  onCancel,
}: {
  name: string;
  label: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(name);
  const finished = useRef(false);
  function finish(cancel = false) {
    if (finished.current) return;
    finished.current = true;
    const next = draft.trim();
    if (cancel || !next || next === name) onCancel();
    else onCommit(next);
  }
  return (
    <input
      className="inline-name-input"
      aria-label={label}
      autoFocus
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={() => finish()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          finish(e.key === "Escape");
        }
      }}
    />
  );
}
