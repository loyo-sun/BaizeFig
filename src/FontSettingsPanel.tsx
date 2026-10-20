import { Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { Node } from "./core";
import type { FontSettings } from "./fontSettings";
import { useI18n } from "./LanguageContext";
export function FontSettingsPanel({
  node,
  onChange,
  expanded = false,
}: {
  node: Node;
  expanded?: boolean;
  onChange: (patch: Partial<Node>) => void;
}) {
  const { t } = useI18n(),
    [axis, setAxis] = useState("wght");
  const flow = node.textFlow ?? {
    autoResize: "fixed" as const,
    verticalAlign: "top" as const,
    letterSpacing: 0,
    runs: node.fidelity?.text?.spans,
  };
  const settings = flow.fontSettings ?? {};
  function change(kind: keyof FontSettings, tag: string, value?: number) {
    const next = { ...settings, [kind]: { ...settings[kind] } };
    const updates: Record<string, number | undefined> = { [tag]: value };
    if (kind === "features" && tag === "liga") updates.clig = value;
    if (kind === "features" && tag === "tnum" && value === 1) updates.pnum = 0;
    if (kind === "features" && tag === "smcp") updates.c2sc = 0;
    for (const [key, v] of Object.entries(updates))
      if (v === undefined) delete next[kind]![key];
      else next[kind]![key] = v;
    onChange({
      textFlow: {
        ...flow,
        fontSettings: next,
        runs: flow.runs?.map((r) => {
          if (
            !r.fontSettings?.[kind] ||
            !Object.keys(updates).some((key) => key in r.fontSettings![kind]!)
          )
            return r;
          const local = structuredClone(r.fontSettings);
          for (const key of Object.keys(updates)) delete local[kind]![key];
          return { ...r, fontSettings: local };
        }),
      },
    });
  }
  return (
    <details className="font-settings" open={expanded || undefined}>
      <summary>{t("Advanced typography")}</summary>
      <label>
        {t("Truncate overflow text")}
        <input
          type="checkbox"
          aria-label={t("Truncate overflow text")}
          checked={flow.truncation === "ending"}
          onChange={(e) =>
            onChange({
              textFlow: {
                ...flow,
                truncation: e.target.checked ? "ending" : undefined,
                ...(e.target.checked ? { autoResize: "fixed" as const } : {}),
              },
            })
          }
        />
      </label>
      <p className="muted">
        {t(
          "Typography features depend on the selected font. Changes apply to this text layer.",
        )}
      </p>
      {(
        [
          ["liga", "Common ligatures"],
          ["calt", "Contextual alternates"],
          ["tnum", "Tabular numbers"],
          ["zero", "Slashed zero"],
          ["smcp", "Small capitals"],
        ] as const
      ).map(([tag, label]) => (
        <label key={tag}>
          {t(label)}
          <select
            aria-label={t(label)}
            value={
              settings.features?.[tag] === undefined
                ? "default"
                : String(settings.features[tag])
            }
            onChange={(e) =>
              change(
                "features",
                tag,
                e.target.value === "default"
                  ? undefined
                  : Number(e.target.value),
              )
            }
          >
            <option value="default">{t("Font default")}</option>
            <option value="1">{t("On")}</option>
            <option value="0">{t("Off")}</option>
          </select>
        </label>
      ))}
      {Object.entries(settings.variations ?? {}).map(([tag, value]) => (
        <label key={tag}>
          {t("Font axis")} {tag}
          <input
            aria-label={`${t("Font axis")} ${tag}`}
            type="number"
            value={value}
            min={-65536}
            max={65536}
            step={0.1}
            onChange={(e) => {
              if (
                e.target.value !== "" &&
                Number.isFinite(Number(e.target.value))
              )
                change("variations", tag, Number(e.target.value));
            }}
          />
          <button
            title={`${t("Reset font axis")} ${tag}`}
            aria-label={`${t("Reset font axis")} ${tag}`}
            onClick={() => change("variations", tag)}
          >
            <RotateCcw size={14} />
          </button>
        </label>
      ))}
      <div className="field-grid">
        <select
          aria-label={t("Add font axis")}
          value={axis}
          onChange={(e) => setAxis(e.target.value)}
        >
          {[
            ["wght", "Weight"],
            ["wdth", "Width"],
            ["opsz", "Optical size"],
            ["slnt", "Slant"],
            ["ital", "Italic"],
          ].map(([tag, label]) => (
            <option key={tag} value={tag}>
              {t(label)} · {tag}
            </option>
          ))}
        </select>
        <button
          title={t("Add axis")}
          aria-label={t("Add axis")}
          disabled={settings.variations?.[axis] !== undefined}
          onClick={() =>
            change(
              "variations",
              axis,
              axis === "wght"
                ? node.fontWeight
                : axis === "wdth"
                  ? 100
                  : axis === "opsz"
                    ? node.fontSize
                    : 0,
            )
          }
        >
          <Plus size={14} />
        </button>
      </div>
    </details>
  );
}
