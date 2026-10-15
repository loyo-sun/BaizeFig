import type { Node } from "./core";
import { useI18n } from "./LanguageProvider";
import type { TextCase } from "./textCase";
export function TextProperties({
  node,
  onChange,
  onCase,
}: {
  node: Node;
  onChange: (patch: Partial<Node>) => void;
  onCase: (mode: TextCase) => void;
}) {
  const { t } = useI18n(),
    flow = node.textFlow ?? {
      autoResize: "fixed" as const,
      verticalAlign: "top" as const,
      letterSpacing: node.fidelity?.text?.letterSpacing ?? 0,
      runs: node.fidelity?.text?.spans,
    };
  const change = (value: Partial<NonNullable<Node["textFlow"]>>) =>
    onChange({ textFlow: { ...flow, ...value } });
  return (
    <div className="text-properties">
      <label>
        {t("Text resizing")}
        <select
          aria-label={t("Text resizing")}
          value={flow.autoResize}
          onChange={(e) =>
            onChange({
              textFlow: {
                ...flow,
                autoResize: e.target.value as typeof flow.autoResize,
              },
              layoutItem: {
                ...node.layoutItem,
                horizontalSizing: e.target.value === "both" ? "hug" : "fixed",
                verticalSizing: e.target.value === "fixed" ? "fixed" : "hug",
              },
            })
          }
        >
          <option value="fixed">{t("Fixed size")}</option>
          <option value="height">{t("Auto height")}</option>
          <option value="both">{t("Auto width and height")}</option>
        </select>
      </label>
      <label>
        {t("Letter spacing")}
        <input
          aria-label={t("Letter spacing")}
          type="number"
          value={flow.letterSpacing}
          step={0.1}
          onChange={(e) => {
            if (e.target.value !== "")
              change({ letterSpacing: Number(e.target.value) });
          }}
        />
      </label>
      <label>
        {t("Paragraph spacing")}
        <input
          aria-label={t("Paragraph spacing")}
          type="number"
          value={flow.paragraphSpacing ?? 0}
          min={0}
          max={10000}
          onChange={(e) => {
            if (e.target.value !== "")
              change({ paragraphSpacing: Number(e.target.value) });
          }}
        />
      </label>
      <label>
        {t("Vertical text alignment")}
        <select
          aria-label={t("Vertical text alignment")}
          value={flow.verticalAlign}
          onChange={(e) =>
            change({
              verticalAlign: e.target.value as typeof flow.verticalAlign,
            })
          }
        >
          {(["top", "center", "bottom"] as const).map((v) => (
            <option key={v} value={v}>
              {t(v === "top" ? "Top" : v === "center" ? "Center" : "Bottom")}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Text direction")}
        <select
          aria-label={t("Text direction")}
          value={flow.direction ?? "auto"}
          onChange={(e) =>
            change({ direction: e.target.value as "auto" | "ltr" | "rtl" })
          }
        >
          {["auto", "ltr", "rtl"].map((v) => (
            <option key={v} value={v}>
              {t(
                v === "auto"
                  ? "Automatic direction"
                  : v === "ltr"
                    ? "Left to right"
                    : "Right to left",
              )}
            </option>
          ))}
        </select>
      </label>
      <div className="segmented">
        {(["upper", "lower", "title"] as const).map((mode) => (
          <button key={mode} onClick={() => onCase(mode)}>
            {t(
              mode === "upper"
                ? "UPPERCASE"
                : mode === "lower"
                  ? "lowercase"
                  : "Title Case",
            )}
          </button>
        ))}
      </div>
      <label>
        <input
          aria-label={t("Browser spell check")}
          type="checkbox"
          checked={flow.spellCheck ?? false}
          onChange={(e) => change({ spellCheck: e.target.checked })}
        />
        {t("Browser spell check")}
      </label>
      <label>
        {t("Text language")}
        <select
          aria-label={t("Text language")}
          value={flow.language ?? ""}
          onChange={(e) => change({ language: e.target.value || undefined })}
        >
          {[
            ["", "Automatic"],
            ["zh-CN", "简体中文"],
            ["en", "English"],
            ["ar", "العربية"],
            ["he", "עברית"],
            ["tr", "Türkçe"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        {t(
          "Spell check uses your browser dictionaries and privacy settings. BaizeFig does not send text to a spelling service.",
        )}
      </p>
    </div>
  );
}
