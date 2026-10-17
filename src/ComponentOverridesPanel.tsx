import { RotateCcw, Upload } from "lucide-react";
import type { Document, Node } from "./core";
import {
  listComponentOverrides,
  resetComponentOverride,
  canPushComponentOverrides,
  pushComponentOverrides,
} from "./componentOverrides";
import { useI18n } from "./LanguageContext";
export function ComponentOverridesPanel({
  doc,
  node,
  onChange,
  onError,
}: {
  doc: Document;
  node: Node;
  onChange: (doc: Document) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  if (!node.componentOwner && node.type !== "instance") return null;
  const entries = listComponentOverrides(doc, node.id);
  const act = (fn: () => Document) => {
    try {
      onChange(fn());
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return (
    <details className="override-panel">
      <summary>
        {t("Instance overrides")} · {entries.length}
      </summary>
      {!entries.length && <p className="muted">{t("No local overrides")}</p>}
      {entries.map((e) => (
        <div className="override-row" key={e.path + ":" + e.field}>
          <span>
            {e.name} · {t(e.field)}
          </span>
          <button
            title={t("Reset property")}
            aria-label={t("Reset property") + ": " + e.name + " " + e.field}
            onClick={() =>
              act(() => resetComponentOverride(doc, node.id, e.path, e.field))
            }
          >
            <RotateCcw size={14} />
          </button>
        </div>
      ))}
      {!!entries.length && (
        <button onClick={() => act(() => resetComponentOverride(doc, node.id))}>
          {t("Reset selected layer overrides")}
        </button>
      )}
      {node.type === "instance" && (
        <button
          disabled={!entries.length || !canPushComponentOverrides(doc, node.id)}
          title={t(
            "Only unlocked local top-level instances can push changes to their main component.",
          )}
          onClick={() => act(() => pushComponentOverrides(doc, node.id))}
        >
          <Upload size={14} />
          {t("Push changes to main component")}
        </button>
      )}
    </details>
  );
}
