import {
  ColorSwatch,
  type StyleGesture,
  type PaletteColor,
} from "./ColorSwatch";
import { InspectorPopover } from "./InspectorPopover";
import { Crop, Eye, EyeOff, Plus, Minus, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ImportedPaint } from "./appearance";
import type { Node } from "./core";
import { RegionPaintEditor } from "./RegionPaintEditor";
import { useI18n } from "./LanguageContext";
import { CommitNumberInput } from "./CommitNumberInput";
export function editableFills(node: Node): ImportedPaint[] {
  if (node.fidelity?.paints) return node.fidelity.paints;
  if (node.image)
    return [
      {
        type: "image",
        image: node.image,
        imageOptions: node.fidelity?.image,
        opacity: 1,
      },
    ];
  return node.fill === "none"
    ? []
    : [{ type: "solid", color: node.fill, opacity: 1 }];
}
export function fillStackPatch(
  node: Node,
  paints: ImportedPaint[],
): Partial<Node> {
  return {
    fidelity: {
      ...(node.fidelity ?? { size: [node.width, node.height] }),
      paints,
    },
    ...(paints.length ? {} : { fill: "none", image: undefined }),
  };
}
export function FillProperties({
  node,
  onChange,
  onCrop,
  onGesture,
  palette,
}: {
  node: Node;
  palette?: PaletteColor[];
  onGesture?: StyleGesture;
  onChange: (patch: Partial<Node>) => void;
  onCrop?: (index?: number) => void;
}) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const paints = editableFills(node);
  const save = (next: ImportedPaint[]) => onChange(fillStackPatch(node, next));
  const update = (index: number, patch: Partial<ImportedPaint>) => {
    if (
      paints.length === 1 &&
      paints[0].type === "solid" &&
      !node.fidelity?.paints &&
      Object.keys(patch).length === 1 &&
      patch.color
    ) {
      onChange({ fill: patch.color });
      return;
    }
    save(
      paints.map((paint, i) => (i === index ? { ...paint, ...patch } : paint)),
    );
  };
  return (
    <section className={`fill-properties${collapsed ? " is-collapsed" : ""}`}>
      <div className="section-heading">
        <button
          type="button"
          className="property-section-toggle"
          aria-label={t("Fill")}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
        >
          <ChevronDown
            size={10}
            style={{ transform: collapsed ? "rotate(-90deg)" : undefined }}
          />
          {t("Fill")}
        </button>
        <button
          title={t("Add fill")}
          aria-label={t("Add fill")}
          onClick={() => {
            setCollapsed(false);
            return paints.length
              ? save([
                  ...paints,
                  { type: "solid", color: "#d9d9d9", opacity: 1 },
                ])
              : onChange({ fill: "#d9d9d9" });
          }}
        >
          <Plus size={14} />
        </button>
      </div>
      {!collapsed && (
        <>
          {paints.map((paint, index) => (
            <div className="paint-row" key={index}>
              {paint.type !== "image" && (
                <ColorSwatch
                  palette={palette}
                  label={t("Fill color")}
                  value={
                    paint.type === "solid"
                      ? (paint.color ?? "#d9d9d9")
                      : (paint.stops?.[0]?.color ?? "#000000")
                  }
                  onChange={(color) =>
                    paint.type === "solid"
                      ? update(index, { color })
                      : update(index, {
                          stops: paint.stops?.map((stop, i) =>
                            i === 0 ? { ...stop, color } : stop,
                          ),
                        })
                  }
                  onGesture={onGesture}
                  paintType={paint.type}
                  onPaintType={(type) =>
                    update(index, {
                      type: type as ImportedPaint["type"],
                      stops: paint.stops ?? [
                        { position: 0, color: paint.color ?? "#000000" },
                        { position: 1, color: "#ffffff" },
                      ],
                    })
                  }
                >
                  {paint.type !== "solid" && (
                    <RegionPaintEditor
                      paints={[paint]}
                      onChange={(next) =>
                        save(paints.map((p, i) => (i === index ? next[0] : p)))
                      }
                    />
                  )}
                </ColorSwatch>
              )}
              {paint.type === "solid" ? (
                <>
                  <input
                    className="paint-hex"
                    aria-label={t("Fill color") + " HEX"}
                    key={paint.color}
                    defaultValue={(paint.color ?? "#d9d9d9")
                      .replace("#", "")
                      .toUpperCase()}
                    maxLength={9}
                    onBlur={(e) => {
                      const value = e.target.value.replace(/^#/, "");
                      if (/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))
                        update(index, { color: "#" + value });
                      else
                        e.target.value = (paint.color ?? "#d9d9d9")
                          .slice(1)
                          .toUpperCase();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                </>
              ) : (
                <span className="paint-type">
                  {t(
                    paint.type === "image"
                      ? "Image"
                      : paint.type === "linear"
                        ? "Linear gradient"
                        : paint.type === "radial"
                          ? "Radial gradient"
                          : "Diamond gradient",
                  )}
                </span>
              )}
              <label className="paint-opacity">
                <CommitNumberInput
                  aria-label={t("Fill opacity {number}", { number: index + 1 })}
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(
                    (paint.hiddenOpacity ?? paint.opacity) * 100,
                  )}
                  onValueChange={(v) => {
                    update(
                      index,
                      paint.hiddenOpacity === undefined
                        ? { opacity: Math.max(0, Math.min(100, v)) / 100 }
                        : {
                            hiddenOpacity: Math.max(0, Math.min(100, v)) / 100,
                          },
                    );
                  }}
                />
                <span>%</span>
              </label>
              <button
                title={t("Toggle visibility")}
                aria-label={t("Toggle visibility") + " " + (index + 1)}
                onClick={() =>
                  update(
                    index,
                    paint.hiddenOpacity === undefined
                      ? { hiddenOpacity: paint.opacity, opacity: 0 }
                      : {
                          opacity: paint.hiddenOpacity,
                          hiddenOpacity: undefined,
                        },
                  )
                }
              >
                {paint.hiddenOpacity === undefined ? (
                  <Eye size={14} />
                ) : (
                  <EyeOff size={14} />
                )}
              </button>
              <button
                title={t("Remove fill")}
                aria-label={t("Remove fill") + " " + (index + 1)}
                onClick={() =>
                  paints.length === 1
                    ? onChange({ fill: "none", image: undefined })
                    : save(paints.filter((_, i) => i !== index))
                }
              >
                <Minus size={14} />
              </button>
            </div>
          ))}
          {paints.length > 0 && (
            <InspectorPopover title={t("Fill layers and image crop")}>
              {node.image && onCrop && (
                <button
                  title={t("Crop image visually")}
                  aria-label={t("Crop image visually")}
                  onClick={() => onCrop()}
                >
                  <Crop size={14} />
                </button>
              )}
              <RegionPaintEditor
                paints={paints}
                onChange={save}
                onCrop={
                  onCrop
                    ? (index) =>
                        onCrop(node.fidelity?.paints ? index : undefined)
                    : undefined
                }
              />
            </InspectorPopover>
          )}
        </>
      )}
    </section>
  );
}
