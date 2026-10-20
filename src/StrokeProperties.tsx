import { InspectorPopover } from "./InspectorPopover";
import { useState } from "react";
import type { Node } from "./core";
import { useI18n } from "./LanguageContext";
export function parseStrokeDash(value: string) {
  if (!value.trim()) return [];
  const dash = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    dash.length > 32 ||
    dash.some((v) => !Number.isFinite(v) || v <= 0) ||
    !dash.some((v) => v > 0)
  )
    throw Error("Dash values must be positive");
  return dash;
}
export function StrokeProperties({
  node,
  onChange,
}: {
  node: Node;
  onChange: (patch: Partial<Node>) => void;
}) {
  const { t } = useI18n(),
    [error, setError] = useState(""),
    f = node.fidelity ?? {
      size: [node.width, node.height] as [number, number],
    },
    closed =
      node.type !== "line" &&
      !(node.fidelity?.network && !node.fidelity.network.regions.length);
  const change = (patch: Partial<typeof f>) =>
    onChange({ fidelity: { ...f, ...patch } });
  return (
    <div className="text-properties">
      <label>
        {t("Stroke alignment")}
        <select
          aria-label={t("Stroke alignment")}
          value={f.strokeAlign ?? "center"}
          onChange={(e) =>
            change({
              strokeAlign: e.target.value as "center" | "inside" | "outside",
            })
          }
        >
          {["center", "inside", "outside"].map((v) => (
            <option key={v} disabled={v !== "center" && !closed} value={v}>
              {t(
                v === "center"
                  ? "Center stroke"
                  : v === "inside"
                    ? "Inside stroke"
                    : "Outside stroke",
              )}
            </option>
          ))}
        </select>
      </label>
      <InspectorPopover title={t("Stroke")}>
        <label>
          {t("Stroke cap")}
          <select
            aria-label={t("Stroke cap")}
            value={f.strokeCap ?? "butt"}
            onChange={(e) =>
              change({
                strokeCap: e.target.value as "butt" | "round" | "square",
              })
            }
          >
            {["butt", "round", "square"].map((v) => (
              <option key={v} value={v}>
                {t(
                  v === "butt"
                    ? "Butt cap"
                    : v === "round"
                      ? "Round cap"
                      : "Square cap",
                )}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Stroke join")}
          <select
            aria-label={t("Stroke join")}
            value={f.strokeJoin ?? "miter"}
            onChange={(e) =>
              change({
                strokeJoin: e.target.value as "miter" | "round" | "bevel",
              })
            }
          >
            {["miter", "round", "bevel"].map((v) => (
              <option key={v} value={v}>
                {t(
                  v === "miter"
                    ? "Miter join"
                    : v === "round"
                      ? "Round join"
                      : "Bevel join",
                )}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Miter limit")}
          <input
            type="number"
            aria-label={t("Miter limit")}
            min={1}
            max={1000}
            value={f.strokeMiterLimit ?? 4}
            onChange={(e) => {
              if (e.target.value)
                change({
                  strokeMiterLimit: Math.max(1, Number(e.target.value)),
                });
            }}
          />
        </label>

        <label>
          {t("Dash pattern")}
          <input
            key={(f.strokeDash ?? []).join(",")}
            aria-label={t("Dash pattern")}
            defaultValue={(f.strokeDash ?? []).join(" ")}
            placeholder="8 4"
            onBlur={(e) => {
              try {
                change({ strokeDash: parseStrokeDash(e.target.value) });
                setError("");
              } catch (error) {
                setError(t((error as Error).message));
              }
            }}
          />
        </label>
        <label>
          {t("Dash offset")}
          <input
            type="number"
            aria-label={t("Dash offset")}
            value={f.strokeDashOffset ?? 0}
            onChange={(e) => {
              if (e.target.value !== "")
                change({ strokeDashOffset: Number(e.target.value) });
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
      </InspectorPopover>
    </div>
  );
}
