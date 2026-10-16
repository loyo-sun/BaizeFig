import { ArrowUp, Crop, Plus, Trash2 } from "lucide-react";
import type { ImportedPaint } from "./appearance";
import { useI18n } from "./LanguageContext";
export function RegionPaintEditor({
  paints,
  onChange,
  onCrop,
}: {
  paints: ImportedPaint[];
  onChange: (paints: ImportedPaint[]) => void;
  onCrop?: (index: number) => void;
}) {
  const { t } = useI18n();
  function patch(index: number, patch: Partial<ImportedPaint>) {
    onChange(paints.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  return (
    <div className="region-paints">
      {paints.map((p, i) => (
        <div key={i} className="region-paint">
          <select
            aria-label={t("Fill type {number}", { number: i + 1 })}
            value={p.type}
            onChange={(e) => {
              const type = e.target.value as ImportedPaint["type"];
              patch(i, {
                type,
                color: p.color ?? "#0d99ff",
                stops: p.stops ?? [
                  { position: 0, color: "#0d99ff" },
                  { position: 1, color: "#a5d8ff" },
                ],
                transform: p.transform ?? [1, 0, 0, 1, 0, 0],
              });
            }}
          >
            {(["solid", "linear", "radial", "diamond", "image"] as const).map(
              (type) => (
                <option key={type} value={type}>
                  {t(
                    {
                      solid: "Solid",
                      linear: "Linear gradient",
                      radial: "Radial gradient",
                      diamond: "Diamond gradient",
                      image: "Image",
                    }[type],
                  )}
                </option>
              ),
            )}
          </select>
          {p.type === "solid" && (
            <input
              aria-label={t("Fill color")}
              type="color"
              value={p.color?.slice(0, 7) ?? "#0d99ff"}
              onChange={(e) => patch(i, { color: e.target.value })}
            />
          )}
          <label>
            {t("Opacity")}
            <input
              aria-label={t("Fill opacity {number}", { number: i + 1 })}
              type="number"
              min={0}
              max={100}
              value={Math.round(p.opacity * 100)}
              onChange={(e) =>
                patch(i, {
                  opacity: Math.min(
                    1,
                    Math.max(0, Number(e.target.value) / 100),
                  ),
                })
              }
            />
            %
          </label>
          <button
            title={t("Move fill up")}
            aria-label={t("Move fill up")}
            disabled={i === 0}
            onClick={() => {
              const n = [...paints];
              [n[i - 1], n[i]] = [n[i], n[i - 1]];
              onChange(n);
            }}
          >
            <ArrowUp size={14} />
          </button>
          <button
            title={t("Remove fill")}
            aria-label={t("Remove fill")}
            onClick={() => onChange(paints.filter((_, j) => i !== j))}
          >
            <Trash2 size={14} />
          </button>
          {["linear", "radial", "diamond"].includes(p.type) && (
            <div className="gradient-stops">
              {p.stops?.map((stop, j) => (
                <label key={j}>
                  <input
                    aria-label={t("Gradient stop color {number}", {
                      number: j + 1,
                    })}
                    type="color"
                    value={stop.color.slice(0, 7)}
                    onChange={(e) =>
                      patch(i, {
                        stops: p.stops!.map((s, k) =>
                          j === k ? { ...s, color: e.target.value } : s,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={t("Gradient stop position {number}", {
                      number: j + 1,
                    })}
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(stop.position * 100)}
                    onChange={(e) =>
                      patch(i, {
                        stops: p
                          .stops!.map((s, k) =>
                            j === k
                              ? {
                                  ...s,
                                  position: Math.max(
                                    0,
                                    Math.min(1, Number(e.target.value) / 100),
                                  ),
                                }
                              : s,
                          )
                          .sort((a, b) => a.position - b.position),
                      })
                    }
                  />
                  <button
                    title={t("Remove gradient stop")}
                    aria-label={t("Remove gradient stop")}
                    disabled={(p.stops?.length ?? 0) <= 2}
                    onClick={() =>
                      patch(i, { stops: p.stops!.filter((_, k) => k !== j) })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </label>
              ))}
              <button
                title={t("Add stop")}
                aria-label={t("Add stop")}
                onClick={() =>
                  patch(i, {
                    stops: [
                      ...(p.stops ?? []),
                      { position: 0.5, color: "#ffffff" },
                    ].sort((a, b) => a.position - b.position),
                  })
                }
              >
                <Plus size={14} />
              </button>
              <label>
                {t("Paint transform")}
                {(p.transform ?? [1, 0, 0, 1, 0, 0]).map((value, j) => (
                  <input
                    key={j}
                    type="number"
                    step={0.1}
                    aria-label={`${t("Paint transform")} ${j + 1}`}
                    value={value}
                    onChange={(e) => {
                      const transform = [
                        ...(p.transform ?? [1, 0, 0, 1, 0, 0]),
                      ] as NonNullable<ImportedPaint["transform"]>;
                      transform[j] = Number(e.target.value);
                      patch(i, { transform });
                    }}
                  />
                ))}
              </label>
            </div>
          )}
          {p.type === "image" && (
            <>
              {onCrop && p.image && (
                <button
                  title={t("Crop image visually")}
                  aria-label={t("Crop image visually")}
                  onClick={() => onCrop(i)}
                >
                  <Crop size={14} />
                </button>
              )}
              <label>
                {t("Choose image")}
                <input
                  aria-label={t("Choose image")}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const image = String(reader.result);
                      if (
                        /^data:image\/(png|jpeg|webp|gif);base64,/.test(image)
                      ) {
                        const decoded = new Image();
                        decoded.onload = () =>
                          patch(i, {
                            image,
                            imageOptions: {
                              mode: "fill",
                              transform: [1, 0, 0, 1, 0, 0],
                              width: decoded.naturalWidth,
                              height: decoded.naturalHeight,
                              scale: 1,
                              opacity: 1,
                            },
                          });
                        decoded.src = image;
                      }
                    };
                    reader.readAsDataURL(f);
                  }}
                />
              </label>
              <select
                aria-label={t("Image mode")}
                value={p.imageOptions?.mode ?? "fill"}
                onChange={(e) =>
                  patch(i, {
                    imageOptions: {
                      mode: e.target.value as "fill" | "fit" | "crop" | "tile",
                      transform: p.imageOptions?.transform ?? [
                        1, 0, 0, 1, 0, 0,
                      ],
                      width: p.imageOptions?.width ?? 1,
                      height: p.imageOptions?.height ?? 1,
                      scale: p.imageOptions?.scale ?? 1,
                      opacity: 1,
                    },
                  })
                }
              >
                {["fill", "fit", "crop", "tile"].map((mode) => (
                  <option key={mode} value={mode}>
                    {t(
                      {
                        fill: "Fill image",
                        fit: "Fit image",
                        crop: "Crop image",
                        tile: "Tile image",
                      }[mode]!,
                    )}
                  </option>
                ))}
              </select>
              {p.imageOptions?.mode === "crop" && (
                <label>
                  {t("Image crop transform")}
                  {p.imageOptions.transform.map((v, j) => (
                    <input
                      key={j}
                      aria-label={`${t("Image crop transform")} ${j + 1}`}
                      type="number"
                      step={0.1}
                      value={v}
                      onChange={(e) => {
                        const transform = [
                          ...p.imageOptions!.transform,
                        ] as NonNullable<typeof p.imageOptions>["transform"];
                        transform[j] = Number(e.target.value);
                        patch(i, {
                          imageOptions: { ...p.imageOptions!, transform },
                        });
                      }}
                    />
                  ))}
                </label>
              )}
              {p.imageOptions?.mode === "tile" && (
                <input
                  aria-label={t("Image tile scale")}
                  type="number"
                  min={0.001}
                  step={0.1}
                  value={p.imageOptions.scale}
                  onChange={(e) =>
                    patch(i, {
                      imageOptions: {
                        ...p.imageOptions!,
                        scale: Math.max(0.001, Number(e.target.value)),
                      },
                    })
                  }
                />
              )}
            </>
          )}
        </div>
      ))}
      <button
        title={t("Add fill")}
        aria-label={t("Add fill")}
        onClick={() =>
          onChange([{ type: "solid", opacity: 1, color: "#0d99ff" }, ...paints])
        }
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
