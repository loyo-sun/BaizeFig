import type { PDFDict } from "pdf-lib";
import type { ExportTask } from "./exportPlan";
export async function imagePdf(
  tasks: ExportTask[],
  render: (task: ExportTask, index: number) => Promise<Uint8Array>,
  signal?: AbortSignal,
) {
  const { PDFDocument, PDFName, PDFNumber, PDFHexString } =
    await import("pdf-lib");
  if (!tasks.length) throw Error("Choose content to export");
  const pdf = await PDFDocument.create();
  pdf.setTitle("BaizeFig design export");
  pdf.setCreator("BaizeFig");
  pdf.setSubject(
    "Visual image PDF. Text and vector content are embedded as images.",
  );
  const labels: (number | PDFDict)[] = [];
  let bytes = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (signal?.aborted) throw Error("Export cancelled");
    const task = tasks[i],
      png = await render(task, i);
    if (signal?.aborted) throw Error("Export cancelled");
    bytes += png.byteLength;
    if (bytes > 200 * 1024 * 1024) throw Error("Export files exceed 200 MiB");
    const image = await pdf.embedPng(png),
      unit = Math.max(
        1,
        Math.max(task.viewport.width, task.viewport.height) / 14400,
      ),
      width = task.viewport.width / unit,
      height = task.viewport.height / unit,
      page = pdf.addPage([width, height]);
    if (unit > 1) page.node.set(PDFName.of("UserUnit"), PDFNumber.of(unit));
    page.drawImage(image, { x: 0, y: 0, width, height });
    labels.push(i, pdf.context.obj({ P: PDFHexString.fromText(task.name) }));
  }
  pdf.catalog.set(PDFName.of("PageLabels"), pdf.context.obj({ Nums: labels }));
  if (signal?.aborted) throw Error("Export cancelled");
  return pdf.save();
}
