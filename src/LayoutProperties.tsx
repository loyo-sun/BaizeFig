import { useState } from "react";
import type { Document, Node } from "./core";
import {
  dimensionMode,
  layoutConfig,
  parseTracks,
  printTracks,
  type Sizing,
} from "./layoutSizing";
import { useI18n } from "./LanguageProvider";
export function LayoutProperties({
  doc,
  node,
  onChange,
  onSizing,
}: {
  doc: Document;
  node: Node;
  onChange: (patch: Partial<Node>) => void;
  onSizing: (axis: "width" | "height", mode: Sizing) => void;
}) {
  const { t } = useI18n(),
    [error, setError] = useState("");
  const parent = doc.nodes.find((n) => n.id === node.parentId),
    config = layoutConfig(node),
    item = node.layoutItem ?? {},
    active = node.layout && node.layout !== "none";
  const update = (patch: Partial<typeof config>) =>
    onChange({ importedLayout: { ...config, ...patch } });
  const itemPatch = (patch: Partial<typeof item>) =>
    onChange({ layoutItem: { ...item, ...patch } });
  const number = (
    label: string,
    value: number | undefined,
    apply: (n: number | undefined) => void,
    optional = false,
    min = 0,
  ) => (
    <label>
      {t(label)}
      <input
        aria-label={t(label)}
        type="number"
        min={min}
        value={value ?? ""}
        placeholder={optional ? t("Automatic") : undefined}
        onChange={(e) => {
          if (e.target.value === "") {
            if (optional) apply(undefined);
          } else apply(Number(e.target.value));
        }}
      />
    </label>
  );
  const options = (
    label: string,
    value: string,
    values: string[],
    apply: (v: string) => void,
  ) => (
    <label>
      {t(label)}
      <select
        aria-label={t(label)}
        value={value}
        onChange={(e) => apply(e.target.value)}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {t(v)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="text-properties">
      <div className="section-heading">{t("Sizing and constraints")}</div>
      {(["width", "height"] as const).map((axis) => (
        <label key={axis}>
          {t(axis === "width" ? "Width sizing" : "Height sizing")}
          <select
            aria-label={t(axis === "width" ? "Width sizing" : "Height sizing")}
            value={dimensionMode(node, axis, parent)}
            onChange={(e) => onSizing(axis, e.target.value as Sizing)}
          >
            {(["fixed", "hug", "fill"] as const).map((mode) => (
              <option
                key={mode}
                value={mode}
                disabled={
                  mode === "fill" &&
                  (!parent?.layout || parent.layout === "none")
                }
              >
                {t(mode)}
              </option>
            ))}
          </select>
        </label>
      ))}
      {(["minWidth", "maxWidth", "minHeight", "maxHeight"] as const).map(
        (key) => (
          <div key={key}>
            {number(key, item[key], (v) => itemPatch({ [key]: v }), true)}
          </div>
        ),
      )}
      {parent?.layout && parent.layout !== "none" && (
        <>
          <label>
            <input
              type="checkbox"
              checked={item.absolute ?? false}
              onChange={(e) => itemPatch({ absolute: e.target.checked })}
            />
            {t("Absolute position")}
          </label>
          {options(
            "Align self",
            item.align ?? "auto",
            ["auto", "start", "center", "end", "stretch", "baseline"],
            (v) =>
              itemPatch({
                align: v === "auto" ? undefined : (v as typeof item.align),
              }),
          )}
          {number(
            "Fill weight",
            item.grow,
            (v) => itemPatch({ grow: v }),
            true,
          )}
          {parent.layout === "grid" &&
            (["column", "row", "columnSpan", "rowSpan"] as const).map((key) => (
              <div key={key}>
                {number(
                  key,
                  item[key],
                  (v) => itemPatch({ [key]: v }),
                  true,
                  key.endsWith("Span") ? 1 : 0,
                )}
              </div>
            ))}
        </>
      )}
      {node.parentId &&
        (!parent?.layout || parent.layout === "none" || item.absolute) &&
        (["horizontal", "vertical"] as const).map((axis) => (
          <div key={axis}>
            {options(
              axis === "horizontal"
                ? "Horizontal constraint"
                : "Vertical constraint",
              node.constraints?.[axis] ?? "min",
              ["min", "max", "center", "stretch", "scale"],
              (v) =>
                onChange({
                  constraints: {
                    horizontal: "min",
                    vertical: "min",
                    ...node.constraints,
                    [axis]: v,
                  },
                }),
            )}
          </div>
        ))}
      {active && (
        <>
          <div className="section-heading">{t("Layout rules")}</div>
          {config.padding.map((v, i) => (
            <div key={i}>
              {number(
                [
                  "Padding top",
                  "Padding right",
                  "Padding bottom",
                  "Padding left",
                ][i],
                v,
                (n) => {
                  const padding = [...config.padding] as typeof config.padding;
                  padding[i] = n ?? 0;
                  update({ padding });
                },
              )}
            </div>
          ))}
          {options(
            "Justify content",
            config.justify,
            [
              "start",
              "center",
              "end",
              "space-between",
              "space-around",
              "space-evenly",
            ],
            (v) => update({ justify: v as typeof config.justify }),
          )}
          {options(
            "Align items",
            config.align,
            ["start", "center", "end", "stretch", "baseline"],
            (v) => update({ align: v as typeof config.align }),
          )}
          {node.layout !== "grid" ? (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={config.wrap ?? false}
                  onChange={(e) =>
                    update({
                      wrap: e.target.checked,
                      primary: e.target.checked ? "fixed" : config.primary,
                    })
                  }
                />
                {t("Wrap layout")}
              </label>
              {number("Line gap", config.counterGap ?? node.gap ?? 0, (v) =>
                update({ counterGap: v ?? 0 }),
              )}
            </>
          ) : (
            <>
              {(["columns", "rows"] as const).map((axis) => (
                <label key={axis}>
                  {t(axis === "columns" ? "Grid columns" : "Grid rows")}
                  <input
                    aria-label={t(
                      axis === "columns" ? "Grid columns" : "Grid rows",
                    )}
                    key={node.id + axis + JSON.stringify(config.grid?.[axis])}
                    defaultValue={printTracks(config.grid?.[axis] ?? [])}
                    placeholder="1fr 80 hug"
                    onBlur={(e) => {
                      try {
                        const tracks = parseTracks(e.target.value);
                        update({
                          grid: {
                            columns: [{ kind: "fr", value: 1 }],
                            rows: [],
                            columnGap: node.gap ?? 0,
                            rowGap: node.gap ?? 0,
                            ...config.grid,
                            [axis]: tracks,
                          },
                        });
                        setError("");
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  />
                </label>
              ))}
              {(["columnGap", "rowGap"] as const).map((key) => (
                <div key={key}>
                  {number(key, config.grid?.[key] ?? node.gap ?? 0, (v) =>
                    update({
                      grid: {
                        columns: [{ kind: "fr", value: 1 }],
                        rows: [],
                        columnGap: 0,
                        rowGap: 0,
                        ...config.grid,
                        [key]: v ?? 0,
                      },
                    }),
                  )}
                </div>
              ))}
              <p className="muted">
                {t(
                  "Grid tracks: lengths, hug, or fractions (1fr). Positions start at 0.",
                )}
              </p>
            </>
          )}
        </>
      )}
      {error && <p role="alert">{t(error)}</p>}
    </section>
  );
}
