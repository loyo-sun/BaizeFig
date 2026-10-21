import type { Node } from "./core";
import { useI18n } from "./LanguageContext";
import { commonNumber } from "./drawingExperience";
import { equalData } from "./equalData";
import { FillProperties, editableFills } from "./FillProperties";
import { NumberField } from "./NumberField";
import {
  ColorSwatch,
  type StyleGesture,
  type PaletteColor,
} from "./ColorSwatch";
import { EffectsProperties } from "./EffectsProperties";
import { StrokePaintRow } from "./StrokePaintRow";
export function MultiSelectionProperties({
  nodes,
  onChange,
  onGesture,
  palette,
}: {
  nodes: Node[];
  palette?: PaletteColor[];
  onChange: (patch: Partial<Node>) => void;
  onGesture: StyleGesture;
}) {
  const { t } = useI18n(),
    first = nodes[0],
    sameFill = nodes.every((n) =>
      equalData(editableFills(n), editableFills(first)),
    ),
    sameStroke = nodes.every(
      (n) => n.stroke === first.stroke && n.strokeWidth === first.strokeWidth,
    ),
    sameEffects = nodes.every((n) =>
      equalData(n.fidelity?.effects, first.fidelity?.effects),
    );
  return (
    <div className="multi-selection-properties">
      {nodes.every((n) => n.type === "text") && (
        <section>
          <div className="section-heading">{t("Typography")}</div>
          <div className="field-grid">
            <NumberField
              label="Size"
              value={commonNumber(nodes, (n) => n.fontSize)}
              min={1}
              onChange={(fontSize) => onChange({ fontSize })}
            />
            <NumberField
              label="Weight"
              value={commonNumber(nodes, (n) => n.fontWeight)}
              min={1}
              max={1000}
              onChange={(fontWeight) => onChange({ fontWeight })}
            />
          </div>
        </section>
      )}
      {sameFill ? (
        <FillProperties
          palette={palette}
          node={first}
          onChange={onChange}
          onGesture={onGesture}
        />
      ) : (
        <section>
          <div className="section-heading">{t("Fill")}</div>
          <div className="mixed-style-row">
            <span>{t("Mixed")}</span>
            <ColorSwatch
              palette={palette}
              label={t("Replace fills")}
              value="#b1b2b5"
              onGesture={onGesture}
              onChange={(fill) => onChange({ fill })}
            />
          </div>
        </section>
      )}
      <section>
        <div className="section-heading">{t("Stroke")}</div>
        {sameStroke && first.strokeWidth > 0 ? (
          <StrokePaintRow
            node={first}
            onChange={onChange}
            onGesture={onGesture}
          />
        ) : (
          <span className="muted">{sameStroke ? t("None") : t("Mixed")}</span>
        )}
        <NumberField
          label="Width"
          aria="Stroke width"
          min={0}
          value={commonNumber(nodes, (n) => n.strokeWidth)}
          onChange={(strokeWidth) => onChange({ strokeWidth })}
        />
      </section>
      {sameEffects ? (
        <>
          <EffectsProperties
            node={first}
            group="shadow"
            onChange={onChange}
            onGesture={onGesture}
          />
          <EffectsProperties
            node={first}
            group="blur"
            onChange={onChange}
            onGesture={onGesture}
          />
        </>
      ) : (
        <section>
          <div className="section-heading">{t("Effects")}</div>
          <span>{t("Mixed")}</span>
          <button
            onClick={() =>
              onChange({
                fidelity: {
                  ...first.fidelity,
                  size: first.fidelity?.size ?? [first.width, first.height],
                  effects: [],
                },
              })
            }
          >
            {t("Remove all effects")}
          </button>
        </section>
      )}
    </div>
  );
}
