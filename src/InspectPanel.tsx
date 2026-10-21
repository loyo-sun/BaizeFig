import { useEffect, useState } from "react";
import { Copy, Code, Info } from "lucide-react";
import { worldTransform, type Document, type Node } from "./core";
import { copyCss } from "./copyCss";
import { svgString } from "./Canvas";
import { editableFills } from "./FillProperties";
import { useI18n } from "./LanguageContext";
export function InspectPanel({ doc, nodes }: { doc: Document; nodes: Node[] }) {
  const { t } = useI18n(),
    [tab, setTab] = useState<"info" | "code">("info"),
    [format, setFormat] = useState("CSS"),
    [svg, setSvg] = useState(""),
    [message, setMessage] = useState("");
  const css = nodes.length
    ? copyCss(
        doc,
        nodes.map((n) => n.id),
      )
    : "";
  useEffect(() => {
    let active = true;
    setSvg("");
    if (format === "SVG" && nodes.length)
      void svgString(
        doc,
        nodes[0].pageId,
        nodes.map((n) => n.id),
        {},
      )
        .then((value) => {
          if (active) setSvg(value);
        })
        .catch((e) => {
          if (active) setMessage((e as Error).message);
        });
    return () => {
      active = false;
    };
  }, [doc, nodes.map((n) => n.id).join(","), format]);
  const code = format === "CSS" ? css : svg;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(t("Copied"));
    } catch {
      setMessage(t("Copy failed. Select and copy the displayed text."));
    }
  }
  return (
    <div className="inspect-panel">
      <div
        className="inspect-tabs"
        role="tablist"
        aria-label={t("Inspect sections")}
      >
        <button
          role="tab"
          aria-selected={tab === "info"}
          onClick={() => setTab("info")}
        >
          <Info size={14} />
          {t("Info")}
        </button>
        <button
          role="tab"
          aria-selected={tab === "code"}
          onClick={() => setTab("code")}
        >
          <Code size={14} />
          {t("Code")}
        </button>
      </div>
      {!nodes.length ? (
        <section>
          <p className="muted">
            {t("Select a layer to inspect its properties.")}
          </p>
        </section>
      ) : tab === "code" ? (
        <section>
          <div className="section-heading">
            <select
              aria-label={t("Inspect code format")}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option>CSS</option>
              <option>SVG</option>
            </select>
            <button
              className="tiny"
              aria-label={t("Copy code")}
              disabled={!code}
              onClick={() => void copy(code)}
            >
              <Copy size={16} />
            </button>
          </div>
          <pre tabIndex={0} aria-label={t("Layer code")}>
            {code}
          </pre>
        </section>
      ) : (
        nodes.map((node) => {
          const matrix = worldTransform(doc, node),
            fills = editableFills(node);
          return (
            <div key={node.id}>
              <section>
                <div className="section-heading">{node.name}</div>
                <dl>
                  <dt>{t("Width")}</dt>
                  <dd>{node.width} px</dd>
                  <dt>{t("Height")}</dt>
                  <dd>{node.height} px</dd>
                  <dt>X</dt>
                  <dd>{Number(matrix[4].toFixed(2))} px</dd>
                  <dt>Y</dt>
                  <dd>{Number(matrix[5].toFixed(2))} px</dd>
                  <dt>{t("Rotation")}</dt>
                  <dd>{node.rotation}°</dd>
                  <dt>{t("Opacity")}</dt>
                  <dd>{Math.round(node.opacity * 100)}%</dd>
                  <dt>{t("Corner radius")}</dt>
                  <dd>{node.radius} px</dd>
                </dl>
              </section>
              {node.type === "text" && (
                <section>
                  <div className="section-heading">{t("Typography")}</div>
                  <p className="inspect-text-content">{node.text}</p>
                  <dl>
                    <dt>{t("Font family")}</dt>
                    <dd>{node.fontFamily.replaceAll('"', "")}</dd>
                    <dt>{t("Font size")}</dt>
                    <dd>{node.fontSize} px</dd>
                    <dt>{t("Font weight")}</dt>
                    <dd>{node.fontWeight}</dd>
                    <dt>{t("Line height")}</dt>
                    <dd>{node.lineHeight}</dd>
                    <dt>{t("Letter spacing")}</dt>
                    <dd>{node.textFlow?.letterSpacing ?? 0} px</dd>
                  </dl>
                </section>
              )}
              {!!fills.length && (
                <section>
                  <div className="section-heading">{t("Fill")}</div>
                  {fills.map((fill, i) => (
                    <button
                      className="inspect-color-row"
                      key={i}
                      onClick={() =>
                        void copy(fill.color ?? JSON.stringify(fill))
                      }
                    >
                      <span
                        style={{ background: fill.color ?? "transparent" }}
                      />
                      {fill.color?.toUpperCase() ?? t(fill.type)}
                      <small>{Math.round(fill.opacity * 100)}%</small>
                      <Copy size={12} />
                    </button>
                  ))}
                </section>
              )}
              {node.strokeWidth > 0 && (
                <section>
                  <div className="section-heading">{t("Stroke")}</div>
                  <dl>
                    <dt>{t("Color")}</dt>
                    <dd>{node.stroke}</dd>
                    <dt>{t("Width")}</dt>
                    <dd>{node.strokeWidth} px</dd>
                    <dt>{t("Stroke alignment")}</dt>
                    <dd>{t(node.fidelity?.strokeAlign ?? "center")}</dd>
                  </dl>
                </section>
              )}
              {!!node.fidelity?.effects?.length && (
                <section>
                  <div className="section-heading">{t("Effects")}</div>
                  {node.fidelity.effects.map((effect, i) => (
                    <dl key={i}>
                      <dt>{t(effect.type)}</dt>
                      <dd>
                        {effect.x} / {effect.y} / {effect.radius} /{" "}
                        {effect.spread}
                      </dd>
                    </dl>
                  ))}
                </section>
              )}
              {node.image && (
                <section>
                  <div className="section-heading">{t("Image")}</div>
                  <dl>
                    <dt>{t("Image mode")}</dt>
                    <dd>{t(node.fidelity?.image?.mode ?? "fill")}</dd>
                    <dt>{t("Size")}</dt>
                    <dd>
                      {node.fidelity?.image?.width ?? node.width}×
                      {node.fidelity?.image?.height ?? node.height}
                    </dd>
                  </dl>
                </section>
              )}
              <section>
                <div className="section-heading">
                  CSS
                  <button
                    className="tiny"
                    aria-label={t("Copy CSS")}
                    onClick={() => void copy(copyCss(doc, [node.id]))}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <pre tabIndex={0}>{copyCss(doc, [node.id])}</pre>
              </section>
            </div>
          );
        })
      )}
      <span role="status">{message}</span>
    </div>
  );
}
