import { ColorSwatch, type StyleGesture } from "./ColorSwatch";
import { CommitNumberInput } from "./CommitNumberInput";
import { InspectorPopover } from "./InspectorPopover";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import type { Node } from "./core";
import type { ImportedEffect } from "./appearance";
import { useI18n } from "./LanguageContext";

export const effectNames = {
  "drop-shadow": "Drop shadow",
  "inner-shadow": "Inner shadow",
  blur: "Layer blur",
  "background-blur": "Background blur",
} as const;
export function EffectsProperties({
  node,
  onChange,
  group,
  onGesture,
}: {
  node: Node;
  onGesture?: StyleGesture;
  group?: "shadow" | "blur";
  onChange: (patch: Partial<Node>) => void;
}) {
  const { t } = useI18n();
  const effects = (node.fidelity?.effects ?? []).map((effect) => ({
    ...effect,
    color:
      effect.color.length === 4 || effect.color.length === 5
        ? "#" + [...effect.color.slice(1)].map((c) => c + c).join("")
        : effect.color,
  }));
  const save = (next: ImportedEffect[]) =>
    onChange({
      fidelity: {
        ...(node.fidelity ?? { size: [node.width, node.height] }),
        effects: next,
      },
    });
  const update = (index: number, patch: Partial<ImportedEffect>) =>
    save(
      effects.map((effect, i) =>
        i === index ? { ...effect, ...patch } : effect,
      ),
    );
  const move = (index: number, delta: number) => {
    const next = [...effects];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    save(next);
  };
  return (
    <section
      className="effects-properties"
      aria-label={t(
        group === "shadow" ? "Shadow" : group === "blur" ? "Blur" : "Effects",
      )}
    >
      <div className="section-heading">
        {t(
          group === "shadow" ? "Shadow" : group === "blur" ? "Blur" : "Effects",
        )}
        <button
          title={t(
            group === "shadow"
              ? "Add shadow"
              : group === "blur"
                ? "Add blur"
                : "Add effect",
          )}
          aria-label={t(
            group === "shadow"
              ? "Add shadow"
              : group === "blur"
                ? "Add blur"
                : "Add effect",
          )}
          disabled={effects.length >= 100}
          onClick={() =>
            save([
              ...effects,
              {
                type: group === "blur" ? "blur" : "drop-shadow",
                color: "#00000040",
                radius: 4,
                spread: 0,
                x: 0,
                y: 4,
                visible: true,
              },
            ])
          }
        >
          <Plus size={14} />
        </button>
      </div>
      {effects.map((effect, index) =>
        group &&
        (group === "blur") !==
          (effect.type === "blur" ||
            effect.type === "background-blur") ? null : (
          <div className="effect-card" key={index}>
            <div className="effect-toolbar">
              <select
                aria-label={t("Effect type")}
                value={effect.type}
                onChange={(e) =>
                  update(index, {
                    type: e.target.value as ImportedEffect["type"],
                  })
                }
              >
                {Object.entries(effectNames).map(([value, name]) => (
                  <option value={value} key={value}>
                    {t(name)}
                  </option>
                ))}
              </select>
              <button
                title={t(effect.visible ? "Hide effect" : "Show effect")}
                aria-label={t(effect.visible ? "Hide effect" : "Show effect")}
                onClick={() => update(index, { visible: !effect.visible })}
              >
                {effect.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                title={t("Duplicate effect")}
                aria-label={t("Duplicate effect")}
                disabled={effects.length >= 100}
                onClick={() =>
                  save([
                    ...effects.slice(0, index + 1),
                    { ...effect },
                    ...effects.slice(index + 1),
                  ])
                }
              >
                <Copy size={14} />
              </button>
              <button
                title={t("Remove effect")}
                aria-label={t("Remove effect")}
                onClick={() => save(effects.filter((_, i) => i !== index))}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <InspectorPopover title={t(effectNames[effect.type])} iconOnly>
              <div className="effect-fields">
                {(effect.type === "drop-shadow" ||
                  effect.type === "inner-shadow") && (
                  <>
                    <label>
                      {t("Effect color")}
                      <ColorSwatch
                        label={t("Effect color")}
                        value={effect.color}
                        onChange={(color) => update(index, { color })}
                        onGesture={onGesture}
                      />
                    </label>
                    <label>
                      {t("Opacity")}
                      <CommitNumberInput
                        aria-label={t("Effect opacity")}
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(
                          (effect.color.length === 9
                            ? parseInt(effect.color.slice(7), 16) / 255
                            : 1) * 100,
                        )}
                        onValueChange={(v) => {
                          update(index, {
                            color:
                              effect.color.slice(0, 7) +
                              Math.round(Math.max(0, Math.min(100, v)) * 2.55)
                                .toString(16)
                                .padStart(2, "0"),
                          });
                        }}
                      />
                    </label>
                  </>
                )}
                {(
                  [
                    "radius",
                    ...(effect.type.endsWith("shadow")
                      ? ["spread", "x", "y"]
                      : []),
                  ] as const
                ).map((field) => (
                  <label key={field}>
                    {t(
                      field === "radius"
                        ? "Blur radius"
                        : field === "spread"
                          ? "Spread"
                          : field.toUpperCase(),
                    )}
                    <CommitNumberInput
                      aria-label={t(
                        field === "radius"
                          ? "Blur radius"
                          : field === "spread"
                            ? "Spread"
                            : `Effect ${field.toUpperCase()}`,
                      )}
                      type="number"
                      step="any"
                      min={field === "radius" ? 0 : undefined}
                      value={effect[field as "radius" | "spread" | "x" | "y"]}
                      onValueChange={(v) => update(index, { [field]: v })}
                    />
                  </label>
                ))}
              </div>
              <div className="effect-order">
                <button
                  title={t("Move effect up")}
                  aria-label={t("Move effect up")}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  title={t("Move effect down")}
                  aria-label={t("Move effect down")}
                  disabled={index === effects.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </InspectorPopover>
          </div>
        ),
      )}
    </section>
  );
}
