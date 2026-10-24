import { chatCompletionsUrl, type AIConfig } from "./ai";
import { useI18n } from "./LanguageContext";

export function AIAgentSettings({
  config,
  onChange,
}: {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}) {
  const { t } = useI18n();
  let endpoint = "";
  try {
    const url = new URL(chatCompletionsUrl(config.baseUrl));
    endpoint = url.origin + url.pathname;
  } catch {
    /* Incomplete input is expected. */
  }
  return (
    <div className="ai-agent-settings">
      <div className="ai-agent-settings-heading">
        {t("Model connection")}
        <span>{t("Key · session only")}</span>
      </div>
      <label>
        {t("API base URL")}
        <input
          aria-label={t("Agent API URL")}
          value={config.baseUrl}
          onChange={(e) => onChange({ ...config, baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
        />
      </label>
      <p className="ai-agent-settings-help">
        {t(
          "Enter an API base URL, such as https://example.com/v1. A bare domain uses /v1 automatically.",
        )}
      </p>
      <div className="ai-agent-settings-fields">
        <label>
          {t("Model")}
          <input
            aria-label={t("Agent model")}
            value={config.model}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
            placeholder={t("Your model name")}
          />
        </label>
        <label>
          {t("API key")}
          <input
            type="password"
            autoComplete="off"
            aria-label={t("Agent API key")}
            value={config.key}
            onChange={(e) => onChange({ ...config, key: e.target.value })}
            placeholder={t("Optional for local models")}
          />
        </label>
      </div>
      {endpoint && (
        <div className="ai-agent-endpoint">
          <span>{t("Request endpoint")}</span>
          <code>{endpoint}</code>
        </div>
      )}
      <label>
        {t("Design guidelines")}
        <textarea
          aria-label={t("Design guidelines")}
          value={config.system}
          onChange={(e) => onChange({ ...config, system: e.target.value })}
          placeholder={t("Your component, color and typography rules")}
          rows={4}
        />
      </label>
      <p className="ai-agent-settings-help">
        {t("Use a compatible model service. Your key stays in memory.")}
      </p>
      <div className="ai-agent-settings-note">
        {t(
          "Choose a design mode and describe your request in the Create tab. Model settings apply to all design modes.",
        )}
      </div>
    </div>
  );
}
