import { commandsPath } from "./fidelity";
import { encodeGlyphCache } from "./glyphCache";
export function readFigGlyphCache(
  text: string,
  source: Record<string, any>[],
  blob: (index: number) => Uint8Array | undefined,
  contours = new Map<number, string>(),
  characterStyles: number[] = [],
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
    // Synthetic glyphs (for example ellipses) carry a style, not a text
    // character. -1 means the layer's base style; never insert text for them.
    const start = g.firstCharacter ?? (g.styleID === 0 ? -1 :
      Number.isInteger(g.styleID) ? characterStyles.indexOf(g.styleID) : undefined);
    if (start === undefined || (g.styleID !== 0 && g.firstCharacter === undefined && start === -1))
      throw Error("Invalid saved glyph cache");
    return {
      d,
      x: g.position?.x,
      y: g.position?.y,
      size: g.fontSize,
      rotation: g.rotation ?? 0,
      start,
    };
  });
  return encodeGlyphCache(glyphs, text.length);
}

// The archive stores solid decoration rectangles in text-local coordinates.
// Missing/unsupported data stays on the font-rendered path.
export function readFigDecorations(
  node: Record<string, any>,
  color: (paint: Record<string, any>) => string,
) {
  const source = node.derivedTextData?.decorations;
  if (!Array.isArray(source) || !source.length) return undefined;
  const result: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: string;
  }[] = [];
  for (const decoration of source) {
    const style =
      node.textData?.styleOverrideTable?.find(
        (s: Record<string, any>) => s.styleID === decoration.styleID,
      ) ?? {};
    const lineStyle = style.textDecorationStyle ?? node.textDecorationStyle;
    if (lineStyle && lineStyle !== "SOLID") return undefined;
    const paints =
      style.textDecorationFillPaints ??
      node.textDecorationFillPaints ??
      style.fillPaints;
    let fill: string | undefined;
    if (paints !== undefined) {
      if (!Array.isArray(paints)) return undefined;
      const visible = paints.filter(
        (p: Record<string, any>) => p.visible !== false,
      );
      if (
        visible.length > 1 ||
        visible.some((p: Record<string, any>) => p.type !== "SOLID")
      )
        return undefined;
      fill = visible.length ? color(visible[0]) : "none";
    }
    if (!Array.isArray(decoration.rects)) return undefined;
    for (const r of decoration.rects) {
      if (![r.x, r.y, r.w, r.h].every(Number.isFinite) || r.w < 0 || r.h < 0)
        return undefined;
      result.push({
        x: r.x,
        y: r.y,
        width: r.w,
        height: r.h,
        ...(fill ? { fill } : {}),
      });
      if (result.length > 20000) return undefined;
    }
  }
  return result.length ? result : undefined;
}
