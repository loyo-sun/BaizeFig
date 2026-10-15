import { commandsPath } from "./fidelity";
import { encodeGlyphCache } from "./glyphCache";
export function readFigGlyphCache(
  text: string,
  source: Record<string, any>[],
  blob: (index: number) => Uint8Array | undefined,
  contours = new Map<number, string>(),
) {
  if (source.length > 20000) throw Error("Invalid saved glyph cache");
  const glyphs = source.map((g) => {
    const bytes = blob(g.commandsBlob);
    if (!bytes) throw Error("Invalid saved glyph cache");
    let d = contours.get(g.commandsBlob);
    if (d === undefined) {
      d = commandsPath(bytes);
      contours.set(g.commandsBlob, d);
    }
    return {
      d,
      x: g.position?.x,
      y: g.position?.y,
      size: g.fontSize,
      rotation: g.rotation ?? 0,
      start: g.firstCharacter,
    };
  });
  return encodeGlyphCache(glyphs, text.length);
}
