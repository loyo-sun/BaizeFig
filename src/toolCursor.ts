import { createElement } from "react";
import { PenTool, Pencil } from "lucide-react";
export type CanvasTool =
  | "move"
  | "hand"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "text"
  | "pen"
  | "pencil"
  | "star"
  | "polygon";
function drawingCursor(markup: string, hotspot: [number, number]) {
  const body = markup.replace(/^<svg[^>]*>/, "").replace("</svg>", "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="white" stroke-width="4">${body}</g><g stroke="#202020" stroke-width="2">${body}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot[0]} ${hotspot[1]}, crosshair`;
}
let pen = "crosshair",
  pencil = "crosshair",
  ready: Promise<void> | undefined;
export function prepareToolCursors() {
  return (ready ??= import("react-dom/server").then(
    ({ renderToStaticMarkup }) => {
      pen = drawingCursor(
        renderToStaticMarkup(createElement(PenTool, { size: 18 })),
        [2, 2],
      );
      pencil = drawingCursor(
        renderToStaticMarkup(createElement(Pencil, { size: 18 })),
        [2, 16],
      );
    },
  ));
}
export function canvasCursor(
  tool: CanvasTool,
  temporaryHand = false,
  panning = false,
): string {
  if (panning) return "grabbing";
  if (temporaryHand || tool === "hand") return "grab";
  if (tool === "pen") return pen;
  if (tool === "pencil") return pencil;
  if (tool === "text") return "text";
  return tool === "move" ? "default" : "crosshair";
}
