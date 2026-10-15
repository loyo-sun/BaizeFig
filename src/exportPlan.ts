import { ancestors, roots, bounds, type Document } from "./core";
import { exportBounds, svgString, type ExportViewport } from "./Canvas";
export type ExportScope = "selection" | "page" | "frames";
export type ExportFormat = "PNG" | "JPG" | "SVG" | "HTML" | "PDF";
export interface ExportTask {
  id: string;
  name: string;
  pageId: string;
  ids: string[];
  viewport: ExportViewport;
  frame: boolean;
}
export function frameCandidates(
  doc: Document,
  pageId: string,
  allPages = false,
) {
  return doc.pages
    .filter((p) => allPages || p.id === pageId)
    .flatMap((p) =>
      doc.nodes.filter(
        (n) =>
          n.pageId === p.id && !n.parentId && n.type === "frame" && n.visible,
      ),
    );
}
export function exportPlan(
  doc: Document,
  pageId: string,
  ids: string[],
  scope: ExportScope,
  frameIds: string[] = [],
): ExportTask[] {
  if (scope === "frames") {
    const frames = frameIds.map((id) =>
      doc.nodes.find(
        (n) => n.id === id && n.type === "frame" && !n.parentId && n.visible,
      ),
    );
    if (frames.some((n) => !n))
      throw Error("A selected export frame is missing");
    return frames.map((n) => ({
      id: n!.id,
      name: n!.name,
      pageId: n!.pageId,
      ids: [n!.id],
      frame: true,
      viewport: bounds(doc, [n!]),
    }));
  }
  const nodes =
    scope === "selection"
      ? roots(doc, ids).filter(
          (n) =>
            n.pageId === pageId &&
            n.visible &&
            !ancestors(doc, n).some((p) => !p.visible),
        )
      : doc.nodes.filter(
          (n) => n.pageId === pageId && !n.parentId && n.visible,
        );
  if (!nodes.length) return [];
  return [
    {
      id: scope,
      name:
        scope === "selection" && nodes.length === 1 ? nodes[0].name : doc.name,
      pageId,
      ids: scope === "selection" ? nodes.map((n) => n.id) : [],
      frame: false,
      viewport: exportBounds(
        doc,
        pageId,
        nodes.map((n) => n.id),
      ),
    },
  ];
}
export function validateExportPlan(
  tasks: ExportTask[],
  format: ExportFormat,
  scale: number,
) {
  if (!tasks.length) throw Error("Choose content to export");
  if (tasks.length > 100) throw Error("Export at most 100 frames at once");
  if (!Number.isFinite(scale) || scale <= 0 || scale > 32)
    throw Error("Invalid export scale");
  let total = 0;
  for (const task of tasks) {
    const { width, height } = task.viewport;
    if (![width, height].every((v) => Number.isFinite(v) && v > 0))
      throw Error("Cannot export zero-size content");
    if (["PNG", "JPG", "PDF"].includes(format)) {
      const w = Math.ceil(width * scale),
        h = Math.ceil(height * scale);
      if (w > 16384 || h > 16384)
        throw Error("Export exceeds 16384 pixels per side. Reduce scale.");
      if (w * h > 40000000)
        throw Error("Export is too large. Reduce selection or scale.");
      total += w * h;
    }
  }
  if (total > 200000000)
    throw Error("Batch export exceeds 200 megapixels. Export fewer frames.");
}
export async function taskSvg(
  doc: Document,
  task: ExportTask,
  background: "transparent" | "page" | "white",
) {
  return svgString(doc, task.pageId, task.ids, {
    viewport: task.viewport,
    background:
      background === "page"
        ? doc.background
        : background === "white"
          ? "#ffffff"
          : undefined,
  });
}
export function exportFilename(name: string) {
  let value =
    name
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/[. ]+$/, "")
      .trim()
      .slice(0, 120) || "BaizeFig";
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(value)) value = "_" + value;
  return value;
}
