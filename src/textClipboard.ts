import { emptyDocument, makeNode, validateDocument } from "./core";
import {
  paragraphAt,
  paragraphStarts,
  remapParagraphs,
  type TextParagraph,
} from "./textParagraphs";
import { remapTextRuns, type TextRun } from "./textLayout";
export interface TextFragment {
  text: string;
  runs: TextRun[];
  paragraphs: TextParagraph[];
}
export function validateTextFragment(
  data: unknown,
): asserts data is TextFragment {
  const value = data as TextFragment;
  if (
    !value ||
    typeof value.text !== "string" ||
    value.text.length > 1000000 ||
    !Array.isArray(value.runs) ||
    !Array.isArray(value.paragraphs)
  )
    throw Error("Invalid text clipboard");
  const d = emptyDocument();
  d.nodes.push(
    makeNode("text", d.pages[0].id, {
      text: value.text,
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        runs: value.runs,
        paragraphs: value.paragraphs,
      },
    }),
  );
  validateDocument(d);
}
export function sliceTextFragment(
  source: TextFragment,
  start: number,
  end: number,
): TextFragment {
  return {
    text: source.text.slice(start, end),
    runs: source.runs
      .filter((r) => r.start < end && r.end > start)
      .map((r) => ({
        ...r,
        start: Math.max(r.start, start) - start,
        end: Math.min(r.end, end) - start,
      })),
    paragraphs: source.paragraphs
      .filter(
        (p) => p.start >= paragraphAt(source.text, start) && p.start < end,
      )
      .map((p) => ({ ...p, start: Math.max(0, p.start - start) })),
  };
}
export function insertTextFragment(
  before: TextFragment,
  fragment: TextFragment,
  start: number,
  end: number,
): TextFragment {
  validateTextFragment(fragment);
  const text =
      before.text.slice(0, start) + fragment.text + before.text.slice(end),
    limit = start + fragment.text.length;
  const runs = remapTextRuns(before.text, text, before.runs).filter(
    (r) => r.end <= start || r.start >= limit,
  );
  runs.push(
    ...fragment.runs.map((r) => ({
      ...r,
      start: r.start + start,
      end: r.end + start,
    })),
  );
  runs.sort((a, b) => a.start - b.start);
  const starts = new Set(paragraphStarts(text)),
    paragraphs = remapParagraphs(before.text, text, before.paragraphs),
    inserted = fragment.paragraphs
      .map((p) => ({ ...p, start: p.start + start }))
      .filter((p) => starts.has(p.start)),
    replaced = new Set(inserted.map((p) => p.start));
  return {
    text,
    runs,
    paragraphs: [
      ...paragraphs.filter((p) => !replaced.has(p.start)),
      ...inserted,
    ].sort((a, b) => a.start - b.start),
  };
}
