import type { Node } from "./core";
export interface TextRun {
  start: number;
  end: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fill?: string;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  href?: string;
}
export function remapTextRuns(
  before: string,
  after: string,
  runs: TextRun[],
): TextRun[] {
  let prefix = 0;
  const old = graphemes(before),
    next = graphemes(after);
  let first = 0;
  while (
    first < old.length &&
    first < next.length &&
    old[first].text === next[first].text
  ) {
    prefix += old[first].text.length;
    first++;
  }
  let oldEnd = before.length,
    newEnd = after.length,
    oi = old.length - 1,
    ni = next.length - 1;
  while (oi >= first && ni >= first && old[oi].text === next[ni].text) {
    oldEnd -= old[oi--].text.length;
    newEnd -= next[ni--].text.length;
  }
  const delta = newEnd - oldEnd,
    result: TextRun[] = [];
  for (const run of runs) {
    if (run.start < prefix)
      result.push({ ...run, end: Math.min(run.end, prefix) });
    if (run.end > oldEnd)
      result.push({
        ...run,
        start: Math.max(run.start, oldEnd) + delta,
        end: run.end + delta,
      });
  }
  const inherited =
    runs.find((r) => r.start <= prefix && r.end > prefix) ??
    runs.find((r) => r.end === prefix);
  if (inherited && newEnd > prefix)
    result.push({ ...inherited, start: prefix, end: newEnd });
  return result
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
}
export interface TextLine {
  start: number;
  end: number;
  x: number;
  y: number;
}
export type TextMeasure = (
  text: string,
  font: { family: string; size: number; weight: number; italic?: boolean },
) => number;
let context:
  | OffscreenCanvasRenderingContext2D
  | CanvasRenderingContext2D
  | null
  | undefined;
export const browserMeasure: TextMeasure = (text, font) => {
  if (context === undefined) {
    if (typeof OffscreenCanvas !== "undefined")
      context = new OffscreenCanvas(1, 1).getContext("2d");
    else if (typeof document !== "undefined")
      context = document.createElement("canvas").getContext("2d");
    else context = null;
  }
  if (context) {
    context.font = `${font.italic ? "italic " : ""}${font.weight} ${font.size}px ${font.family}`;
    return context.measureText(text).width;
  }
  // Non-browser tests inject metrics. This fallback is never presented as exact font shaping.
  return Array.from(text).reduce(
    (sum, c) => sum + (c.codePointAt(0)! > 0x2ff ? 1 : 0.55) * font.size,
    0,
  );
};
const graphemes = (text: string) =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    (s) => ({ text: s.segment, index: s.index }),
  );
export function layoutText(
  node: Node,
  measure: TextMeasure = browserMeasure,
): { lines: TextLine[]; width: number; height: number } {
  const flow = node.textFlow,
    spacing = flow?.letterSpacing ?? 0,
    runs = flow?.runs ?? [];
  const metrics = (index: number) => {
    const run = runs.find((r) => r.start <= index && r.end > index);
    return {
      family: run?.fontFamily ?? node.fontFamily,
      size: run?.fontSize ?? node.fontSize,
      weight: run?.fontWeight ?? node.fontWeight,
      italic: run?.italic,
    };
  };
  // Measure complete style runs so browser shaping retains kerning and ligatures.
  const width = (start: number, end: number) => {
    let total = 0,
      at = start;
    const cuts = [
      ...new Set([
        start,
        end,
        ...runs
          .flatMap((r) => [r.start, r.end])
          .filter((i) => i > start && i < end),
      ]),
    ].sort((a, b) => a - b);
    for (const cut of cuts.slice(1)) {
      total += measure(node.text.slice(at, cut), metrics(at));
      at = cut;
    }
    return Math.max(
      0,
      total +
        Math.max(0, graphemes(node.text.slice(start, end)).length - 1) *
          spacing,
    );
  };
  const wrap = flow?.autoResize !== "both",
    limit = Math.max(1, node.width),
    lines: {
      start: number;
      end: number;
      width: number;
      height: number;
      ascent: number;
    }[] = [];
  const add = (start: number, end: number) => {
    const sizes = [
      node.fontSize,
      ...runs
        .filter((r) => r.start < end && r.end > start)
        .map((r) => r.fontSize ?? node.fontSize),
    ];
    const size = Math.max(...sizes);
    lines.push({
      start,
      end,
      width: width(start, end),
      height: Math.max(1, size * node.lineHeight),
      ascent: size,
    });
  };
  let paragraphStart = 0;
  for (const paragraph of node.text.split("\n")) {
    const chars = graphemes(paragraph);
    let start = paragraphStart,
      lastBreak = -1;
    for (const g of chars) {
      const at = paragraphStart + g.index,
        end = at + g.text.length;
      while (wrap && at > start && width(start, end) > limit) {
        const cut = lastBreak > start ? lastBreak : at;
        add(start, cut);
        start = cut;
        lastBreak = -1;
      }
      if (/\s|[-\u200b]/u.test(g.text) || g.text.codePointAt(0)! > 0x2ff)
        lastBreak = end;
    }
    add(start, paragraphStart + paragraph.length);
    paragraphStart += paragraph.length + 1;
  }
  const height = lines.reduce((n, l) => n + l.height, 0),
    boxHeight = flow?.autoResize === "fixed" ? node.height : height;
  let top =
    flow?.verticalAlign === "center"
      ? (boxHeight - height) / 2
      : flow?.verticalAlign === "bottom"
        ? boxHeight - height
        : 0;
  const boxWidth =
    flow?.autoResize === "both"
      ? Math.max(1, ...lines.map((l) => l.width))
      : node.width;
  const output = lines.map((l) => {
    const x =
      node.textAlign === "center"
        ? (boxWidth - l.width) / 2
        : node.textAlign === "right"
          ? boxWidth - l.width
          : 0;
    const y = top + l.ascent;
    top += l.height;
    return { start: l.start, end: l.end, x, y };
  });
  return { lines: output, width: boxWidth, height: boxHeight };
}
export function reflowText(
  node: Node,
  measure: TextMeasure = browserMeasure,
): void {
  if (node.type !== "text" || !node.textFlow) return;
  const result = layoutText(node, measure);
  if (
    node.textFlow.autoResize === "height" ||
    node.textFlow.autoResize === "both"
  )
    node.height = Math.max(1, result.height);
  if (node.textFlow.autoResize === "both")
    node.width = Math.max(1, result.width);
  node.fidelity = {
    ...node.fidelity,
    size: node.fidelity?.size ?? [node.width, node.height],
    text: {
      characters: node.text,
      lines: result.lines,
      letterSpacing: node.textFlow.letterSpacing ?? 0,
      spans: node.textFlow.runs,
    },
  };
}
