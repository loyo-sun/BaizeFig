import { AlertTriangle, Replace } from "lucide-react";
import type { Document } from "./core";
import { unavailableOriginalFonts } from "./fonts";
import { useFontAvailability } from "./useFontAvailability";
import { useI18n } from "./LanguageContext";
export function FontNotice({
  doc,
  onReplace,
}: {
  doc: Document;
  onReplace: () => void;
}) {
  const { status } = useFontAvailability(doc),
    { t } = useI18n();
  const missing = unavailableOriginalFonts(doc, status);
  if (!missing.length) return null;
  return (
    <div className="font-notice" role="status">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <strong>{t("Original fonts unavailable")}</strong>
        <p title={missing.join(", ")}>{missing.join(", ")}</p>
        <small>
          {t("Choose replacement fonts before editing for consistent layout.")}
        </small>
      </div>
      <button
        className="icon-button"
        title={t("Replace missing fonts")}
        aria-label={t("Replace missing fonts")}
        onClick={onReplace}
      >
        <Replace size={17} />
      </button>
    </div>
  );
}
