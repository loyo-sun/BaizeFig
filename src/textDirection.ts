import { bidiRanges } from "./bidiData";
export function paragraphBidiClass(codePoint: number): number {
  let lo = 0,
    hi = bidiRanges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1,
      [start, end, value] = bidiRanges[mid];
    if (codePoint < start) hi = mid - 1;
    else if (codePoint > end) lo = mid + 1;
    else return value;
  }
  return 0;
}
// UAX #9 P2/P3: isolated contents do not choose the outer paragraph level.
// The browser performs the subsequent bidi reordering and glyph shaping.
export function paragraphDirection(
  text: string,
  preference: "auto" | "ltr" | "rtl" = "auto",
): "ltr" | "rtl" {
  if (preference !== "auto") return preference;
  let isolates = 0;
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (paragraphBidiClass(cp) === 3) break;
    if (cp >= 0x2066 && cp <= 0x2068) {
      isolates++;
      continue;
    }
    if (cp === 0x2069) {
      isolates = Math.max(0, isolates - 1);
      continue;
    }
    if (isolates) continue;
    const strong = paragraphBidiClass(cp);
    if (strong === 1) return "ltr";
    if (strong === 2) return "rtl";
  }
  return "ltr";
}
