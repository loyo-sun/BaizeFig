import { createElement } from "react";
import { PenTool, Pencil } from "lucide-react";
export type CanvasTool =
  | "scale"
  | "move"
  | "hand"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "line"
  | "text"
  | "pen"
  | "pencil"
  | "star"
  | "polygon";
// Small, outlined artwork stays legible over both light and dark canvas content.
function precisionCursor(
  body: string,
  hotspot: [number, number],
  fallback: string,
) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="white" stroke-width="3">${body}</g><g stroke="#202020" stroke-width="1">${body}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot[0]} ${hotspot[1]}, ${fallback}`;
}
const moveCursor = precisionCursor(
  '<path d="M4 4L6 18L10 12L16 10Z" fill="#202020"/>',
  [4, 4],
  "default",
);
const crossCursor = precisionCursor(
  '<path d="M7 12H17M12 7V17"/>',
  [12, 12],
  "crosshair",
);
const textCursor = precisionCursor(
  '<path d="M9 5H15M12 5V19M9 19H15"/>',
  [12, 12],
  "text",
);
const scaleCursor = precisionCursor(
  '<path d="M5 11V5H11M5 5L19 19M13 19H19V13"/>',
  [12, 12],
  "nwse-resize",
);
export const rotationCursor = precisionCursor(
  '<path d="M6 17A7 7 0 1 1 18 17M18 11V17H12"/>',
  [12, 12],
  "crosshair",
);
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
  if (tool === "text") return textCursor;
  if (tool === "move") return moveCursor;
  if (tool === "scale") return scaleCursor;
  return crossCursor;
}
