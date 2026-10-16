import { paragraphDirection } from "./textDirection";
import {
  fontSettingsStyle,
  mergeFontSettings,
  type FontSettings,
} from "./fontSettings";
import { renderFontFamily } from "./fontFamily";
import { listMarkers } from "./textParagraphs";
import type { Node } from "./core";
export interface TextRun {
  start: number;
  end: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontSettings?: FontSettings;
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
  ellipsis?: boolean;
  start: number;
  end: number;
  x: number;
  y: number;
  marker?: string;
  markerX?: number;
  direction?: "ltr" | "rtl";
}
export type TextMeasure = (
  text: string,
  font: {
    family: string;
    size: number;
    weight: number;
    italic?: boolean;
    settings?: FontSettings;
    direction?: "ltr" | "rtl";
  },
) => number;
let context:
  | OffscreenCanvasRenderingContext2D
  | CanvasRenderingContext2D
  | null
  | undefined;
let fontMeasureRoot: SVGSVGElement | undefined;
let fontMeasureText: SVGTextElement | undefined;
const advancedWidths = new Map<string, number>();
function measureAdvancedFont(
  text: string,
  font: Parameters<TextMeasure>[1],
): number | undefined {
  const settings = fontSettingsStyle(font.settings);
  if (
    (!settings.fontFeatureSettings && !settings.fontVariationSettings) ||
    typeof document === "undefined" ||
    !document.body
  )
    return undefined;
  if (!fontMeasureRoot) {
    fontMeasureRoot = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    fontMeasureRoot.setAttribute("aria-hidden", "true");
    Object.assign(fontMeasureRoot.style, {
      position: "fixed",
      left: "-100000px",
      top: "0",
      visibility: "hidden",
      pointerEvents: "none",
      width: "1px",
      height: "1px",
      overflow: "visible",
    });
    fontMeasureText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    fontMeasureRoot.append(fontMeasureText);
    document.body.append(fontMeasureRoot);
    document.fonts?.addEventListener("loadingdone", () =>
      advancedWidths.clear(),
    );
  }
  const key = JSON.stringify([text, font, settings]),
    cached = advancedWidths.get(key);
  if (cached !== undefined) return cached;
  const el = fontMeasureText!;
  Object.assign(el.style, {
    fontFamily: renderFontFamily(font.family),
    fontSize: font.size + "px",
    fontWeight: String(font.weight),
    fontStyle: font.italic ? "italic" : "normal",
    whiteSpace: "pre",
    direction: font.direction ?? "ltr",
    unicodeBidi: "isolate",
    fontFeatureSettings: settings.fontFeatureSettings ?? "normal",
    fontVariationSettings: settings.fontVariationSettings ?? "normal",
  });
  el.textContent = text;
  if (typeof el.getComputedTextLength !== "function") return undefined;
  const width = el.getComputedTextLength();
  if (advancedWidths.size >= 4000) advancedWidths.clear();
  advancedWidths.set(key, width);
  return width;
}
export const browserMeasure: TextMeasure = (text, font) => {
  if (context === undefined) {
    if (typeof OffscreenCanvas !== "undefined")
      context = new OffscreenCanvas(1, 1).getContext("2d");
    else if (typeof document !== "undefined")
      context = document.createElement("canvas").getContext("2d");
    else context = null;
  }
  const advanced = measureAdvancedFont(text, font);
  if (advanced !== undefined) return advanced;
  if (context) {
    context.font = `${font.italic ? "italic " : ""}${font.weight} ${font.size}px ${renderFontFamily(font.family)}`;
    context.direction = font.direction ?? "ltr";
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
    runs = flow?.runs ?? [],
    markers = listMarkers(node.text, flow?.paragraphs ?? []);
  const metrics = (index: number) => {
    const run = runs.find((r) => r.start <= index && r.end > index);
    return {
      family: run?.fontFamily ?? node.fontFamily,
      size: run?.fontSize ?? node.fontSize,
      weight: run?.fontWeight ?? node.fontWeight,
      italic: run?.italic,
      settings: mergeFontSettings(flow?.fontSettings, run?.fontSettings),
      direction,
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
      indent: number;
      marker?: string;
      paragraphEnd?: boolean;
      ellipsis?: boolean;
      direction: "ltr" | "rtl";
    }[] = [];
  let indent = 0,
    marker: string | undefined,
    direction: "ltr" | "rtl" = "ltr";
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
      indent,
      marker,
      direction,
    });
    marker = undefined;
  };
  let paragraphStart = 0;
  for (const paragraph of node.text.split("\n")) {
    const p = flow?.paragraphs?.find((p) => p.start === paragraphStart);
    indent = p ? (p.level + 1) * node.fontSize * 1.5 : 0;
    marker = markers.get(paragraphStart);
    direction = paragraphDirection(paragraph, flow?.direction);
    const chars = graphemes(paragraph);
    let start = paragraphStart,
      lastBreak = -1;
    for (const g of chars) {
      const at = paragraphStart + g.index,
        end = at + g.text.length;
      while (
        wrap &&
        at > start &&
        width(start, end) > Math.max(1, limit - indent)
      ) {
        const cut = lastBreak > start ? lastBreak : at;
        add(start, cut);
        start = cut;
        lastBreak = -1;
      }
      if (/\s|[-\u200b]/u.test(g.text) || g.text.codePointAt(0)! > 0x2ff)
        lastBreak = end;
    }
    add(start, paragraphStart + paragraph.length);
    lines.at(-1)!.paragraphEnd = true;
    paragraphStart += paragraph.length + 1;
  }
  if (flow?.truncation === "ending" && flow.autoResize === "fixed") {
    let used = 0,
      visible = 0;
    for (const line of lines) {
      if (visible && used + line.height > node.height + 0.001) break;
      used +=
        line.height + (line.paragraphEnd ? (flow.paragraphSpacing ?? 0) : 0);
      visible++;
    }
    if (visible < lines.length) {
      lines.splice(visible);
      const last = lines.at(-1)!;
      direction = last.direction;
      const ends = graphemes(node.text.slice(last.start, last.end)).map(
        (g) => last.start + g.index,
      );
      let end = last.end;
      const ellipsisWidth = () =>
        measure("…", metrics(Math.max(last.start, end - 1)));
      while (
        end > last.start &&
        width(last.start, end) + spacing + ellipsisWidth() > limit - last.indent
      )
        end = ends.pop()!;
      last.end = end;
      last.width =
        width(last.start, end) +
        (end > last.start ? spacing : 0) +
        ellipsisWidth();
      last.ellipsis = true;
      last.paragraphEnd = false;
    }
  }
  const height = lines.reduce(
      (sum, l, i) =>
        sum +
        l.height +
        (l.paragraphEnd && i < lines.length - 1
          ? (flow?.paragraphSpacing ?? 0)
          : 0),
      0,
    ),
    boxHeight = flow?.autoResize === "fixed" ? node.height : height;
  let top =
    flow?.verticalAlign === "center"
      ? (boxHeight - height) / 2
      : flow?.verticalAlign === "bottom"
        ? boxHeight - height
        : 0;
  const boxWidth =
    flow?.autoResize === "both"
      ? Math.max(1, ...lines.map((l) => l.width + l.indent))
      : node.width;
  const output = lines.map((l) => {
    const x =
      node.textAlign === "center"
        ? l.indent + (boxWidth - l.indent - l.width) / 2
        : node.textAlign === "right"
          ? boxWidth - l.width
          : l.indent;
    const y = top + l.ascent;
    top += l.height + (l.paragraphEnd ? (flow?.paragraphSpacing ?? 0) : 0);
    return {
      ...(l.ellipsis ? { ellipsis: true } : {}),
      start: l.start,
      end: l.end,
      x: l.direction === "rtl" ? x + l.width : x,
      y,
      ...(l.marker
        ? {
            marker: l.marker,
            markerX:
              l.direction === "rtl"
                ? boxWidth
                : Math.max(0, l.indent - node.fontSize * 0.9),
          }
        : {}),
      ...(l.direction === "rtl" ? { direction: l.direction } : {}),
    };
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
