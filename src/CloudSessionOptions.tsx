import { useI18n } from "./LanguageContext";
import { CLOUD_SESSION_DAYS } from "./useCloudSession";
export function CloudSessionOptions({
  days,
  onChange,
  disabled,
}: {
  days: number;
  onChange: (days: number) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className="cloud-session-options">
      <span>{t("Remember sign-in for")}</span>
      <select
        aria-label={t("Remember sign-in for")}
        value={days}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {CLOUD_SESSION_DAYS.map((value) => (
          <option key={value} value={value}>
            {t("{days} days", { days: value })}
          </option>
        ))}
      </select>
      <small>
        {t(
          "Restore sign-in and canvas connection in this browser until expiration.",
        )}
      </small>
    </label>
  );
}
