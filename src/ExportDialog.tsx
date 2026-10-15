import { renderFontFamily } from "./fontFamily";
import { useEffect, useRef, useState } from "react";
import type { Document } from "./core";
import { raster } from "./Canvas";
import {
  exportPlan,
  frameCandidates,
  taskSvg,
  validateExportPlan,
  exportFilename,
  type ExportScope,
  type ExportFormat,
  type ExportTask,
} from "./exportPlan";
import { imagePdf } from "./pdfExport";
import { download } from "./storage";
import { useI18n } from "./LanguageContext";
export function ExportDialog({
  doc,
  pageId,
  selected,
  initialFormat,
  initialScope,
  initialScale = 1,
}: {
  doc: Document;
  pageId: string;
  selected: string[];
  initialFormat: ExportFormat;
  initialScope: ExportScope;
  initialScale?: number;
}) {
  const { t } = useI18n(),
    [format, setFormat] = useState<ExportFormat>(initialFormat),
    [scope, setScope] = useState<ExportScope>(initialScope),
    [scale, setScale] = useState(initialFormat === "PDF" ? 2 : initialScale),
    [background, setBackground] = useState<"transparent" | "page" | "white">(
      "transparent",
    ),
    [allPages, setAllPages] = useState(false),
    [order, setOrder] = useState(frameCandidates(doc, pageId).map((n) => n.id)),
    [enabled, setEnabled] = useState<Set<string>>(
      () => new Set(frameCandidates(doc, pageId).map((n) => n.id)),
    ),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState(""),
    controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const candidates = frameCandidates(doc, pageId, allPages),
    tasks = exportPlan(
      doc,
      pageId,
      selected,
      scope,
      order.filter(
        (id) => enabled.has(id) && candidates.some((n) => n.id === id),
      ),
    ),
    resolution = ["SVG", "HTML"].includes(format) ? 1 : scale;
  let problem = "";
  try {
    validateExportPlan(tasks, format, resolution);
  } catch (e) {
    problem = (e as Error).message;
  }
  const dimension = (value: number) =>
    ["PNG", "JPG"].includes(format)
      ? Math.ceil(value * resolution)
      : Number(value.toFixed(2));
  function reorder(id: string, direction: number) {
    const index = order.indexOf(id),
      next = [...order],
      at = index + direction;
    if (at < 0 || at >= next.length) return;
    [next[at], next[index]] = [next[index], next[at]];
    setOrder(next);
  }
  async function start() {
    if (busy || problem) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setProgress("");
    try {
      await document.fonts.ready;
      const selectedPages = new Set(tasks.map((t) => t.pageId));
      await Promise.allSettled(
        doc.nodes
          .filter(
            (n) =>
              n.type === "text" && selectedPages.has(n.pageId) && n.visible,
          )
          .map((n) =>
            document.fonts.load(
              `${n.fontWeight} ${n.fontSize}px ${renderFontFamily(n.fontFamily)}`,
              n.text,
            ),
          ),
      );
      if (abort.signal.aborted) throw Error("Export cancelled");
      const render = async (task: ExportTask, index: number) => {
        setProgress(
          t("Exporting {current} of {total}", {
            current: index + 1,
            total: tasks.length,
          }),
        );
        const svg = await taskSvg(doc, task, background);
        return new Uint8Array(
          await (await raster(svg, resolution, "image/png")).arrayBuffer(),
        );
      };
      if (format === "PDF") {
        const bytes = await imagePdf(tasks, render, abort.signal);
        if (abort.signal.aborted) throw Error("Export cancelled");
        download(
          new Blob([bytes as BlobPart], { type: "application/pdf" }),
          exportFilename(doc.name) + ".pdf",
        );
      } else {
        const files: Record<string, Uint8Array> = {};
        let total = 0;
        for (let i = 0; i < tasks.length; i++) {
          if (abort.signal.aborted) throw Error("Export cancelled");
          const task = tasks[i];
          setProgress(
            t("Exporting {current} of {total}", {
              current: i + 1,
              total: tasks.length,
            }),
          );
          const svg = await taskSvg(doc, task, background);
          let blob: Blob;
          if (format === "SVG")
            blob = new Blob([svg], { type: "image/svg+xml" });
          else if (format === "HTML")
            blob = new Blob(
              [
                `<!doctype html><html lang="${document.documentElement.lang}"><meta charset="utf-8"><title>BaizeFig export</title><body style="margin:0">${svg.replace(/^<\?xml[^>]*>/, "")}</body></html>`,
              ],
              { type: "text/html" },
            );
          else
            blob = await raster(
              svg,
              resolution,
              format === "JPG" ? "image/jpeg" : "image/png",
            );
          const bytes = new Uint8Array(await blob.arrayBuffer());
          total += bytes.byteLength;
          if (total > 200 * 1024 * 1024)
            throw Error("Export files exceed 200 MiB");
          const name =
            (tasks.length > 1 ? String(i + 1).padStart(3, "0") + "-" : "") +
            exportFilename(task.name) +
            "." +
            format.toLowerCase();
          files[name] = bytes;
          if (abort.signal.aborted) throw Error("Export cancelled");
          if (tasks.length === 1) download(blob, name);
        }
        if (tasks.length > 1) {
          const { zipSync } = await import("fflate");
          const zip = zipSync(files, {
            level: ["PNG", "JPG"].includes(format) ? 0 : 6,
          });
          if (abort.signal.aborted) throw Error("Export cancelled");
          download(
            new Blob([zip as BlobPart], { type: "application/zip" }),
            exportFilename(doc.name) + "-assets.zip",
          );
        }
      }
      setProgress(t("Export complete"));
    } catch (e) {
      setError((e as Error).message);
      setProgress("");
    } finally {
      controller.current = null;
      setBusy(false);
    }
  }
  return (
    <section className="export-dialog text-properties">
      <label>
        {t("Export scope")}
        <select
          aria-label={t("Export scope")}
          value={scope}
          disabled={busy}
          onChange={(e) => setScope(e.target.value as ExportScope)}
        >
          <option value="selection" disabled={!selected.length}>
            {t("Current selection")}
          </option>
          <option value="page">{t("Current page")}</option>
          <option value="frames">{t("Multiple frames")}</option>
        </select>
      </label>
      <label>
        {t("Export format")}
        <select
          aria-label={t("Export dialog format")}
          value={format}
          disabled={busy}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
        >
          {(["PNG", "JPG", "SVG", "HTML", "PDF"] as const).map((v) => (
            <option key={v} value={v}>
              {v === "PDF" ? t("PDF (visual images)") : v}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t(format === "PDF" ? "PDF image resolution" : "Export scale")}
        <select
          aria-label={t("Export dialog scale")}
          value={scale}
          disabled={busy || ["SVG", "HTML"].includes(format)}
          onChange={(e) => setScale(Number(e.target.value))}
        >
          {[0.5, 1, 2, 3, 4].map((v) => (
            <option key={v} value={v}>
              {v}x{format === "PDF" ? ` · ${72 * v} dpi` : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Export background")}
        <select
          aria-label={t("Export background")}
          value={background}
          disabled={busy}
          onChange={(e) => setBackground(e.target.value as typeof background)}
        >
          <option value="transparent">{t("Transparent")}</option>
          <option value="page">{t("Page background")}</option>
          <option value="white">{t("White")}</option>
        </select>
      </label>
      {format === "JPG" && (
        <p className="muted">{t("JPG uses white behind transparent areas.")}</p>
      )}
      {format === "PDF" && (
        <p className="notice">
          {t(
            "PDF preserves the current appearance as page images. Text is not selectable and paths are not editable in the PDF. Image resolution changes clarity, not page size: 1 design unit equals 1 pt.",
          )}
        </p>
      )}
      {["SVG", "HTML"].includes(format) && (
        <p className="muted">
          {t(
            "SVG and HTML preserve vectors and embed the built-in Inter fallback. Other fonts must be installed on the receiving device.",
          )}
        </p>
      )}
      {scope === "frames" && (
        <>
          <label>
            <input
              type="checkbox"
              checked={allPages}
              disabled={busy}
              onChange={(e) => {
                const all = e.target.checked;
                setAllPages(all);
                const items = frameCandidates(doc, pageId, all);
                setOrder(items.map((n) => n.id));
                setEnabled(new Set(items.map((n) => n.id)));
              }}
            />
            {t("Include all pages")}
          </label>
          <p className="muted">
            {t(
              "Frames start in page and layer order. Reorder below to set PDF page order. Each frame is cropped to its transformed canvas bounds.",
            )}
          </p>
          <div className="export-frame-list">
            {order.map((id, index) => {
              const n = candidates.find((n) => n.id === id);
              if (!n) return null;
              return (
                <div className="setting-row" key={id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={enabled.has(id)}
                      disabled={busy}
                      onChange={(e) => {
                        const next = new Set(enabled);
                        if (e.target.checked) next.add(id);
                        else next.delete(id);
                        setEnabled(next);
                      }}
                    />
                    {n.name}
                  </label>
                  <button
                    disabled={busy || index === 0}
                    aria-label={t("Move export frame up {name}", {
                      name: n.name,
                    })}
                    onClick={() => reorder(id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    disabled={busy || index === order.length - 1}
                    aria-label={t("Move export frame down {name}", {
                      name: n.name,
                    })}
                    onClick={() => reorder(id, 1)}
                  >
                    ↓
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      <ol>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.name} · {dimension(task.viewport.width)} ×{" "}
            {dimension(task.viewport.height)} {format === "PDF" ? "pt" : "px"}
          </li>
        ))}
      </ol>
      {problem && <p role="alert">{t(problem)}</p>}
      {error && <p role="alert">{t(error)}</p>}
      {progress && <p role="status">{progress}</p>}
      <div className="segmented">
        <button
          className="primary"
          disabled={busy || !!problem}
          onClick={() => void start()}
        >
          {t(
            format === "PDF"
              ? "Download PDF"
              : tasks.length > 1
                ? "Download ZIP"
                : "Download export",
          )}
        </button>
        {busy && (
          <button onClick={() => controller.current?.abort()}>
            {t("Cancel export")}
          </button>
        )}
      </div>
    </section>
  );
}
