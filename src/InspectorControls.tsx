import { selectionColors, replaceSelectionColor } from "./selectionColors";
import { Eye, EyeOff } from "lucide-react";
import { type Document, type Node } from "./core";
import { useI18n } from "./LanguageContext";
export function ConstraintsControl({
  doc,
  node,
  onChange,
  disabled,
}: {
  doc: Document;
  node: Node;
  onChange: (patch: Partial<Node>) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n(),
    parent = doc.nodes.find((n) => n.id === node.parentId);
  if (
    !parent ||
    (parent.layout && parent.layout !== "none" && !node.layoutItem?.absolute)
  )
    return null;
  const c = node.constraints ?? { horizontal: "min", vertical: "min" };
  const update = (
    axis: "horizontal" | "vertical",
    value: typeof c.horizontal,
  ) => onChange({ constraints: { ...c, [axis]: value } });
  return (
    <div className="constraint-control">
      <div className="constraint-diagram" aria-label={t("Constraints")}>
        <span className="constraint-inner" />
        {(
          [
            ["horizontal", "min", "left"],
            ["horizontal", "max", "right"],
            ["vertical", "min", "top"],
            ["vertical", "max", "bottom"],
          ] as const
        ).map(([axis, value, side]) => (
          <button
            key={side}
            disabled={disabled}
            className={`pin ${side} ${c[axis] === value || c[axis] === "stretch" ? "active" : ""}`}
            title={t(side)}
            aria-label={
              t(
                axis === "horizontal"
                  ? "Horizontal constraint"
                  : "Vertical constraint",
              ) +
              ": " +
              t(value)
            }
            onClick={() => update(axis, c[axis] === value ? "center" : value)}
          />
        ))}
        <button
          className="pin-center"
          disabled={disabled}
          title={t("Center")}
          aria-label={t("Center constraints")}
          onClick={() =>
            onChange({
              constraints: { horizontal: "center", vertical: "center" },
            })
          }
        >
          +
        </button>
      </div>
      <div className="constraint-selects">
        {(["horizontal", "vertical"] as const).map((axis) => (
          <select
            key={axis}
            disabled={disabled}
            aria-label={t(
              axis === "horizontal"
                ? "Horizontal constraint"
                : "Vertical constraint",
            )}
            value={c[axis]}
            onChange={(e) =>
              update(axis, e.target.value as typeof c.horizontal)
            }
          >
            {["min", "max", "center", "stretch", "scale"].map((value) => (
              <option key={value} value={value}>
                {t(`${axis} ${value}`)}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
export function LayerAppearance({
  node,
  onChange,
}: {
  node: Node;
  onChange: (p: Partial<Node>) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="layer-appearance">
      <div className="section-heading">{t("Layer")}</div>
      <div className="appearance-row">
        <select
          aria-label={t("Blend mode")}
          value={node.fidelity?.blendMode ?? "normal"}
          onChange={(e) =>
            onChange({
              fidelity: {
                ...(node.fidelity ?? { size: [node.width, node.height] }),
                blendMode: e.target.value,
              },
            })
          }
        >
          {[
            "normal",
            "multiply",
            "screen",
            "overlay",
            "darken",
            "lighten",
            "color-dodge",
            "color-burn",
            "hard-light",
            "soft-light",
            "difference",
            "exclusion",
            "hue",
            "saturation",
            "color",
            "luminosity",
          ].map((m) => (
            <option key={m} value={m}>
              {t(`Blend ${m}`)}
            </option>
          ))}
        </select>
        <label>
          <input
            type="number"
            aria-label={t("Opacity")}
            min={0}
            max={100}
            value={Math.round(node.opacity * 100)}
            onChange={(e) =>
              onChange({
                opacity:
                  Math.min(100, Math.max(0, Number(e.target.value))) / 100,
              })
            }
          />
          %
        </label>
        <button
          title={t("Toggle visibility")}
          aria-label={t("Toggle layer visibility")}
          onClick={() => onChange({ visible: !node.visible })}
        >
          {node.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </section>
  );
}
export function SelectionColors({
  doc,
  node,
  selectedIds,
  onChange,
  onError,
}: {
  doc: Document;
  node: Node;
  selectedIds?: string[];
  onChange: (d: Document) => void;
  onError: (s: string) => void;
}) {
  const { t } = useI18n();
  const entries = selectionColors(doc, selectedIds ?? [node.id]);
  if (!entries.size) return null;
  return (
    <section className="selection-colors">
      <div className="section-heading">{t("Selection colors")}</div>
      {[...entries].map(([color, targets]) => (
        <label className="color-row" key={color}>
          <input
            type="color"
            aria-label={t("Replace selection color") + " " + color}
            value={color.slice(0, 7)}
            onChange={(e) => {
              try {
                onChange(replaceSelectionColor(doc, targets, e.target.value));
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          />
          <span>{color.slice(1)}</span>
        </label>
      ))}
    </section>
  );
}
