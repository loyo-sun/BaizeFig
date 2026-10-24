import { useI18n } from "./LanguageContext";
export function WebFileStatus({
  readOnly,
  modified,
  cloud,
  busy,
  title,
  onEdit,
  onSave,
  onFinish,
}: {
  readOnly: boolean;
  modified: boolean;
  cloud: boolean;
  busy: boolean;
  title?: string;
  onEdit: () => void;
  onSave: () => void;
  onFinish: () => void;
}) {
  const { t } = useI18n();
  const state = readOnly ? "readonly" : modified ? "modified" : "saved";
  return (
    <div
      className={"web-file-status web-file-status--" + state}
      role="status"
      aria-live="polite"
      data-save-status={state}
      title={title}
    >
      <span className="web-file-status-label">
        <i aria-hidden="true" />
        {t(readOnly ? "Read only" : modified ? "Modified" : "Saved")}
      </span>
      {readOnly ? (
        <button disabled={busy} onClick={onEdit}>
          [{t("Edit")}]
        </button>
      ) : (
        cloud && (
          <span className="web-file-status-actions">
            {modified && (
              <button disabled={busy} onClick={onSave}>
                [{t("Save")}]
              </button>
            )}
            <button disabled={busy} onClick={onFinish}>
              {t("Finish editing")}
            </button>
          </span>
        )
      )}
    </div>
  );
}
