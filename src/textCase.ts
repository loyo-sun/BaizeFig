import { ancestors, execute, type Document } from "./core";
import type { TextRun } from "./textLayout";
export type TextCase = "upper" | "lower" | "title";
export function changeTextCase(
  text: string,
  runs: TextRun[],
  start: number,
  end: number,
  mode: TextCase,
  locale?: string,
) {
  const segments = Array.from(
    new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text),
  );
  const wordStarts = new Set(
    Array.from(
      new Intl.Segmenter(locale, { granularity: "word" }).segment(text),
      (s) => (s.isWordLike ? s.index : -1),
    ),
  );
  const offsets = new Map<number, number>(),
    output: string[] = [];
  let at = 0;
  for (const s of segments) {
    offsets.set(s.index, at);
    const within = s.index >= start && s.index < end;
    const value = !within
      ? s.segment
      : mode === "upper"
        ? s.segment.toLocaleUpperCase(locale)
        : mode === "lower"
          ? s.segment.toLocaleLowerCase(locale)
          : wordStarts.has(s.index)
            ? s.segment.toLocaleUpperCase(locale)
            : s.segment.toLocaleLowerCase(locale);
    output.push(value);
    at += value.length;
  }
  offsets.set(text.length, at);
  const nearest = (pos: number) =>
    offsets.get(pos) ??
    offsets.get(
      [...segments].reverse().find((s) => s.index <= pos)?.index ?? 0,
    ) ??
    0;
  return {
    offsets,
    text: output.join(""),
    runs: runs.map((r) => ({
      ...r,
      start: nearest(r.start),
      end: nearest(r.end),
    })),
  };
}
export function changeDocumentTextCase(
  doc: Document,
  ids: string[],
  mode: TextCase,
) {
  let next = doc;
  for (const n of doc.nodes.filter(
    (n) =>
      ids.includes(n.id) &&
      n.type === "text" &&
      !n.locked &&
      !ancestors(doc, n).some((p) => p.locked),
  )) {
    const changed = changeTextCase(
      n.text,
      n.textFlow?.runs ?? n.fidelity?.text?.spans ?? [],
      0,
      n.text.length,
      mode,
      n.textFlow?.language,
    );
    next = execute(next, {
      type: "update",
      ids: [n.id],
      patch: {
        text: changed.text,
        textFlow: {
          ...(n.textFlow ?? {
            autoResize: "fixed",
            verticalAlign: "top",
            letterSpacing: 0,
          }),
          runs: changed.runs,
          paragraphs: n.textFlow?.paragraphs?.map((p) => ({
            ...p,
            start: changed.offsets.get(p.start) ?? p.start,
          })),
        },
      },
    }).doc;
  }
  return next;
}
