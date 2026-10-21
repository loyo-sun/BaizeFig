import { ColorSwatch, type StyleGesture } from "./ColorSwatch";
import { Eye, EyeOff, Minus } from "lucide-react";
import type { Node } from "./core";
import { useI18n } from "./LanguageContext";
import { CommitNumberInput } from "./CommitNumberInput";
export function StrokePaintRow({
  node,
  onChange,
  onGesture,
}: {
  node: Node;
  onGesture?: StyleGesture;
  onChange: (patch: Partial<Node>) => void;
}) {
  const { t } = useI18n();
  const f = node.fidelity ?? {
    size: [node.width, node.height] as [number, number],
  };
  const opacity = f.hiddenStrokeOpacity ?? f.strokeOpacity ?? 1;
  return (
    <div className="paint-row">
      <ColorSwatch
        label={t("Stroke color")}
        value={node.stroke === "none" ? "#202a24" : node.stroke}
        onChange={(stroke) => onChange({ stroke })}
        onGesture={onGesture}
      />
      <input
        className="paint-hex"
        aria-label={t("Stroke color") + " HEX"}
        key={node.stroke}
        defaultValue={node.stroke.replace("#", "").toUpperCase()}
        maxLength={9}
        onBlur={(e) => {
          const v = e.target.value.replace(/^#/, "");
          if (/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v))
            onChange({ stroke: "#" + v });
          else e.target.value = node.stroke.replace("#", "").toUpperCase();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <label className="paint-opacity">
        <CommitNumberInput
          type="number"
          min={0}
          max={100}
          aria-label={t("Stroke opacity")}
          value={Math.round(opacity * 100)}
          onValueChange={(v) => {
            onChange({
              fidelity: {
                ...f,
                ...(f.hiddenStrokeOpacity === undefined
                  ? { strokeOpacity: Math.max(0, Math.min(100, v)) / 100 }
                  : {
                      hiddenStrokeOpacity: Math.max(0, Math.min(100, v)) / 100,
                    }),
              },
            });
          }}
        />
        <span>%</span>
      </label>
      <button
        title={t("Toggle visibility")}
        aria-label={t("Stroke") + ": " + t("Toggle visibility")}
        onClick={() =>
          onChange({
            fidelity: {
              ...f,
              ...(f.hiddenStrokeOpacity === undefined
                ? { hiddenStrokeOpacity: opacity, strokeOpacity: 0 }
                : { strokeOpacity: opacity, hiddenStrokeOpacity: undefined }),
            },
          })
        }
      >
        {f.hiddenStrokeOpacity === undefined ? (
          <Eye size={14} />
        ) : (
          <EyeOff size={14} />
        )}
      </button>
      <button
        title={t("Remove stroke")}
        aria-label={t("Remove stroke")}
        onClick={() => onChange({ strokeWidth: 0 })}
      >
        <Minus size={14} />
      </button>
    </div>
  );
}
