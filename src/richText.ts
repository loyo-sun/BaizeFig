import type { TextRun } from "./textLayout";
export type TextStyle = Omit<TextRun, "start" | "end">;
export function safeTextLink(value: string): string | undefined {
  const link = value.trim();
  if (!link) return undefined;
  try {
    const url = new URL(link);
    if (["https:", "http:", "mailto:"].includes(url.protocol)) return url.href;
  } catch {
    /* invalid links are rejected */
  }
  throw Error("Use an http, https or mailto link");
}
export function styleTextRange(
  text: string,
  runs: TextRun[],
  start: number,
  end: number,
  patch: TextStyle,
): TextRun[] {
  const graphemes = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
  );
  const boundaries = [...graphemes.map((g) => g.index), text.length];
  start = Math.max(0, Math.min(start, text.length));
  end = Math.max(start, Math.min(end, text.length));
  if (start === end) return structuredClone(runs);
  start = boundaries.filter((i) => i <= start).at(-1) ?? 0;
  end = boundaries.find((i) => i >= end) ?? text.length;
  if (patch.href !== undefined)
    patch = { ...patch, href: safeTextLink(patch.href) };
  const cuts = [
      ...new Set([
        0,
        text.length,
        start,
        end,
        ...runs.flatMap((r) => [r.start, r.end]),
      ]),
    ]
      .filter((i) => i >= 0 && i <= text.length)
      .sort((a, b) => a - b),
    result: TextRun[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i],
      b = cuts[i + 1],
      source = runs.find((r) => r.start <= a && r.end >= b),
      style: TextStyle = source
        ? (({ start: _s, end: _e, ...rest }) => rest)(source)
        : {};
    if (a >= start && b <= end) Object.assign(style, patch);
    for (const k of Object.keys(style))
      if (style[k as keyof TextStyle] === undefined)
        delete style[k as keyof TextStyle];
    if (!Object.keys(style).length) continue;
    const previous = result.at(-1);
    if (
      previous &&
      previous.end === a &&
      JSON.stringify((({ start: _s, end: _e, ...rest }) => rest)(previous)) ===
        JSON.stringify(style)
    )
      previous.end = b;
    else result.push({ ...style, start: a, end: b });
  }
  return result;
}
