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
function drawingCursor(path: string, hotspot: [number, number]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="${path}" fill="white" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="white" stroke="#202020" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot[0]} ${hotspot[1]}, crosshair`;
}
const pen = drawingCursor(
  "M2 25 L5 11 L16 3 L25 12 L17 23 Z M2 25 L11 16 M16 3 L25 12 M10 14 A2 2 0 1 0 14 14 A2 2 0 1 0 10 14",
  [2, 25],
);
const pencil = drawingCursor(
  "M2 25 L4 17 L19 2 Q21 0 23 2 L26 5 Q28 7 26 9 L11 24 Z M4 17 L11 24 M17 4 L24 11 M2 25 L6 24",
  [2, 25],
);
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
