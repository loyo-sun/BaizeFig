import { useI18n } from "./LanguageContext";
export function WebFileStatus({
  readOnly,
  checking,
  occupant,
  modified,
  cloud,
  draft,
  busy,
  title,
  onEdit,
  onSave,
  onFinish,
}: {
  readOnly: boolean;
  checking?: boolean;
  occupant?: string;
  modified: boolean;
  cloud: boolean;
  draft?: boolean;
  busy: boolean;
  title?: string;
  onEdit: () => void;
  onSave: () => void;
  onFinish: () => void;
}) {
  const { t } = useI18n();
  const state = checking
    ? "checking"
    : readOnly
      ? "readonly"
      : modified
        ? "modified"
        : "saved";
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
        <span className="web-file-status-text">
          {checking
            ? t("Acquiring edit access")
            : t(readOnly ? "Read only" : modified ? "Modified" : "Saved")}
          {!checking && readOnly && occupant
            ? " · " + occupant + " " + t("is editing")
            : ""}
        </span>
      </span>
      {checking ? null : readOnly ? (
        <button disabled={busy} onClick={onEdit}>
          [{t("Edit")}]
        </button>
      ) : (
        cloud && (
          <span className="web-file-status-actions">
            {(modified || draft) && (
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
