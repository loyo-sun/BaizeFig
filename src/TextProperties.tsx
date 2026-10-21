import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  Square,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
} from "lucide-react";
import { InspectorPopover } from "./InspectorPopover";
import { NumberField } from "./NumberField";
import { FontSettingsPanel } from "./FontSettingsPanel";
import { useState } from "react";
import { FontManager } from "./FontManager";
import type { Node, Document } from "./core";
import { useI18n } from "./LanguageContext";
import type { TextCase } from "./textCase";
export function TextProperties({
  node,
  onChange,
  onCase,
  doc,
  onReplaceFonts,
}: {
  node: Node;
  onChange: (patch: Partial<Node>) => void;
  onCase: (mode: TextCase) => void;
  doc: Document;
  onReplaceFonts: (doc: Document) => void;
}) {
  const [tab, setTab] = useState<"typography" | "fonts">("typography");
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
    <div className="text-properties text-main-controls">
      <div className="text-icon-row">
        <div className="segmented" role="group" aria-label={t("Text resizing")}>
          {(
            [
              ["both", "Auto width and height", ArrowLeftRight],
              ["height", "Auto height", ArrowUpDown],
              ["fixed", "Fixed size", Square],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              title={t(label)}
              aria-label={t(label)}
              aria-pressed={flow.autoResize === value}
              className={flow.autoResize === value ? "active" : ""}
              onClick={() =>
                onChange({
                  textFlow: { ...flow, autoResize: value },
                  layoutItem: {
                    ...node.layoutItem,
                    horizontalSizing: value === "both" ? "hug" : "fixed",
                    verticalSizing: value === "fixed" ? "fixed" : "hug",
                  },
                })
              }
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>
      <div
        className="segmented text-alignment-buttons"
        role="group"
        aria-label={t("Text alignment")}
      >
        {(
          [
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const
        ).map(([value, Icon]) => (
          <button
            key={value}
            title={t(value)}
            aria-label={t("Text alignment") + ": " + t(value)}
            aria-pressed={node.textAlign === value}
            className={node.textAlign === value ? "active" : ""}
            onClick={() => onChange({ textAlign: value })}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <InspectorPopover title={t("Advanced typography")} iconOnly>
        <div
          className="segmented"
          role="group"
          aria-label={t("Vertical text alignment")}
        >
          {(
            [
              ["top", "Top", AlignStartVertical],
              ["center", "Center", AlignCenterVertical],
              ["bottom", "Bottom", AlignEndVertical],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              title={t(label)}
              aria-label={t("Vertical text alignment") + ": " + t(label)}
              aria-pressed={flow.verticalAlign === value}
              className={flow.verticalAlign === value ? "active" : ""}
              onClick={() => change({ verticalAlign: value })}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <div
          className="segmented"
          role="tablist"
          aria-label={t("Advanced typography")}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            const next =
              e.key === "Home"
                ? "typography"
                : e.key === "End"
                  ? "fonts"
                  : tab === "fonts"
                    ? "typography"
                    : "fonts";
            setTab(next);
            e.currentTarget
              .querySelectorAll<HTMLButtonElement>('[role="tab"]')
              [next === "typography" ? 0 : 1]?.focus();
          }}
        >
          <button
            role="tab"
            tabIndex={tab === "typography" ? 0 : -1}
            aria-selected={tab === "typography"}
            onClick={() => setTab("typography")}
          >
            {t("Typography")}
          </button>
          <button
            role="tab"
            tabIndex={tab === "fonts" ? 0 : -1}
            aria-selected={tab === "fonts"}
            onClick={() => setTab("fonts")}
          >
            {t("Font availability and replacement")}
          </button>
        </div>
        {tab === "fonts" ? (
          <div
            role="tabpanel"
            aria-label={t("Font availability and replacement")}
          >
            <FontManager doc={doc} onReplace={onReplaceFonts} />
          </div>
        ) : (
          <div
            className="advanced-typography-fields"
            role="tabpanel"
            aria-label={t("Typography")}
          >
            <NumberField
              label="Paragraph spacing"
              value={flow.paragraphSpacing ?? 0}
              min={0}
              max={10000}
              onChange={(paragraphSpacing) => change({ paragraphSpacing })}
            />
            <FontSettingsPanel expanded node={node} onChange={onChange} />
            <label>
              {t("Text direction")}
              <select
                aria-label={t("Text direction")}
                value={flow.direction ?? "auto"}
                onChange={(e) =>
                  change({
                    direction: e.target.value as "auto" | "ltr" | "rtl",
                  })
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
                onChange={(e) =>
                  change({ language: e.target.value || undefined })
                }
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
        )}
      </InspectorPopover>
    </div>
  );
}
