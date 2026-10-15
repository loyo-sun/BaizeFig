export interface TextParagraph {
  start: number;
  list: "bullet" | "number";
  level: number;
}
export const paragraphStarts = (text: string) => [
  0,
  ...Array.from(text.matchAll(/\n/g), (m) => m.index! + 1),
];
export function paragraphAt(text: string, at: number) {
  return at <= 0 ? 0 : text.lastIndexOf("\n", at - 1) + 1;
}
export function remapParagraphs(
  before: string,
  after: string,
  paragraphs: TextParagraph[],
): TextParagraph[] {
  if (before === after) return structuredClone(paragraphs);
  let prefix = 0,
    oldEnd = before.length,
    newEnd = after.length;
  while (prefix < oldEnd && prefix < newEnd && before[prefix] === after[prefix])
    prefix++;
  while (
    oldEnd > prefix &&
    newEnd > prefix &&
    before[oldEnd - 1] === after[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }
  const delta = newEnd - oldEnd;
  return paragraphStarts(after).flatMap((start) => {
    const oldPosition =
        start <= prefix ? start : start >= newEnd ? start - delta : prefix,
      original = paragraphs.find(
        (p) => p.start === paragraphAt(before, oldPosition),
      );
    return original ? [{ ...original, start }] : [];
  });
}
export function setParagraphList(
  text: string,
  paragraphs: TextParagraph[],
  start: number,
  end: number,
  kind: "bullet" | "number" | null,
): TextParagraph[] {
  const first = paragraphAt(text, start),
    last = paragraphAt(text, end > start ? end - 1 : end),
    selected = paragraphStarts(text).filter((i) => i >= first && i <= last);
  const toggle =
    kind &&
    selected.every((i) =>
      paragraphs.some((p) => p.start === i && p.list === kind),
    );
  return [
    ...paragraphs.filter((p) => !selected.includes(p.start)),
    ...(!kind || toggle
      ? []
      : selected.map((i) => ({
          start: i,
          list: kind,
          level: paragraphs.find((p) => p.start === i)?.level ?? 0,
        }))),
  ].sort((a, b) => a.start - b.start);
}
export function listMarkers(
  text: string,
  paragraphs: TextParagraph[],
): Map<number, string> {
  const result = new Map<number, string>(),
    counts: number[] = [];
  let previous: "bullet" | "number" | undefined;
  for (const start of paragraphStarts(text)) {
    const p = paragraphs.find((p) => p.start === start);
    if (!p) {
      counts.length = 0;
      previous = undefined;
      continue;
    }
    if (p.list === "bullet") {
      result.set(start, ["•", "◦", "▪"][p.level % 3]);
      counts.length = 0;
    } else {
      if (previous !== "number") counts.length = 0;
      counts.length = p.level + 1;
      counts[p.level] = (counts[p.level] ?? 0) + 1;
      result.set(start, `${counts[p.level]}.`);
    }
    previous = p.list;
  }
  return result;
}
export function validateParagraphs(
  text: string,
  paragraphs: TextParagraph[] | undefined,
) {
  if (paragraphs === undefined) return;
  const starts = new Set(paragraphStarts(text));
  if (
    !Array.isArray(paragraphs) ||
    paragraphs.length > 20000 ||
    new Set(paragraphs.map((p) => p?.start)).size !== paragraphs.length ||
    paragraphs.some(
      (p) =>
        !p ||
        !starts.has(p.start) ||
        !["bullet", "number"].includes(p.list) ||
        !Number.isInteger(p.level) ||
        p.level < 0 ||
        p.level > 8,
    )
  )
    throw Error("Invalid text paragraphs");
}
