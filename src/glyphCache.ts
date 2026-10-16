import type { Node } from "./core";
import { deflateSync, Inflate, strFromU8, strToU8 } from "fflate";
import type { SavedGlyph } from "./textPath";
const MAX_RAW = 4 * 1024 * 1024,
  MAX_ENCODED = 2 * 1024 * 1024,
  MAX_CACHE = 32 * 1024 * 1024;
const cache = new Map<
  string,
  { glyphs: SavedGlyph[]; length: number; cost: number }
>();
let cacheCost = 0;
const invalid = () => Error("Invalid saved glyph cache");
function remember(
  key: string,
  glyphs: SavedGlyph[],
  length: number,
  cost: number,
) {
  while (cache.size && (cacheCost + cost > MAX_CACHE || cache.size >= 1024)) {
    const first = cache.keys().next().value!;
    cacheCost -= cache.get(first)!.cost;
    cache.delete(first);
  }
  cache.set(key, { glyphs, length, cost });
  cacheCost += cost;
  return glyphs;
}
function validContour(d: unknown): d is string {
  if (typeof d !== "string" || d.length > 2000000) return false;
  if (!d.trim()) return true;
  const tokens =
    d.match(/[MLQCZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  if (tokens.join("") !== d.replace(/[\s,]/g, "") || tokens[0] !== "M")
    return false;
  const counts: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  for (let at = 0; at < tokens.length;) {
    const count = counts[tokens[at++]];
    if (count === undefined || at + count > tokens.length) return false;
    for (let i = 0; i < count; i++)
      if (!Number.isFinite(Number(tokens[at++]))) return false;
  }
  return true;
}
export function encodeGlyphCache(
  glyphs: SavedGlyph[],
  textLength: number,
): string {
  const contours: string[] = [],
    index = new Map<string, number>();
  const rows = glyphs.map((g) => {
    let id = index.get(g.d);
    if (id === undefined) {
      id = contours.length;
      index.set(g.d, id);
      contours.push(g.d);
    }
    return [id, g.x, g.y, g.size, g.rotation, g.start];
  });
  const raw = strToU8(JSON.stringify([textLength, contours, rows]));
  if (raw.length > MAX_RAW) throw invalid();
  const data = deflateSync(raw, { level: 6 });
  let binary = "";
  for (let i = 0; i < data.length; i += 4096)
    binary += String.fromCharCode(...data.subarray(i, i + 4096));
  const encoded = `g1:${raw.length}:${btoa(binary)}`;
  if (encoded.length > MAX_ENCODED) throw invalid();
  // Use the same checked decoder for trusted imports and native reloads.
  decodeGlyphCache(encoded, textLength);
  return encoded;
}
export function decodeGlyphCache(
  encoded: string,
  textLength: number,
): SavedGlyph[] {
  const known = cache.get(encoded);
  if (known) {
    if (known.length !== textLength) throw invalid();
    cache.delete(encoded);
    cache.set(encoded, known);
    return known.glyphs;
  }
  if (typeof encoded !== "string" || encoded.length > MAX_ENCODED)
    throw invalid();
  const match = encoded.match(/^g1:(\d{1,8}):([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw invalid();
  const expected = Number(match[1]);
  if (expected < 1 || expected > MAX_RAW) throw invalid();
  try {
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)),
      parts: Uint8Array[] = [];
    let size = 0;
    const stream = new Inflate((part) => {
      size += part.length;
      if (size > expected || size > MAX_RAW) throw invalid();
      parts.push(part.slice());
    });
    // Bounded chunks cap transient expansion before each size check.
    for (let i = 0; i < bytes.length; i += 1024)
      stream.push(bytes.subarray(i, i + 1024), i + 1024 >= bytes.length);
    if (size !== expected) throw invalid();
    const raw = new Uint8Array(size);
    let at = 0;
    for (const part of parts) {
      raw.set(part, at);
      at += part.length;
    }
    const value = JSON.parse(strFromU8(raw));
    if (
      !Array.isArray(value) ||
      value.length !== 3 ||
      value[0] !== textLength ||
      !Array.isArray(value[1]) ||
      !Array.isArray(value[2]) ||
      value[1].length > 20000 ||
      value[2].length > 20000
    )
      throw invalid();
    const contours = value[1] as unknown[],
      rows = value[2] as unknown[];
    if (contours.some((d) => !validContour(d))) throw invalid();
    const glyphs = rows.map((row) => {
      if (
        !Array.isArray(row) ||
        row.length !== 6 ||
        !row.every(Number.isFinite) ||
        !Number.isInteger(row[0]) ||
        row[0] < 0 ||
        row[0] >= contours.length ||
        row[3] <= 0 ||
        !Number.isInteger(row[5]) ||
        row[5] < -1 ||
        row[5] >= textLength
      )
        throw invalid();
      return {
        d: contours[row[0]] as string,
        x: row[1],
        y: row[2],
        size: row[3],
        rotation: row[4],
        start: row[5],
      };
    });
    return remember(
      encoded,
      glyphs,
      textLength,
      raw.length * 2 + glyphs.length * 64 + encoded.length * 2,
    );
  } catch {
    throw invalid();
  }
}
const truncatedGlyphs = new WeakMap<SavedGlyph[], Map<number, SavedGlyph[]>>();
export function savedTextGlyphs(text?: {
  characters: string;
  glyphs?: SavedGlyph[];
  glyphCache?: string;
  glyphLimit?: number;
}) {
  const glyphs =
    text?.glyphs ??
    (text?.glyphCache
      ? decodeGlyphCache(text.glyphCache, text.characters.length)
      : undefined);
  if (!glyphs || text?.glyphLimit === undefined) return glyphs;
  let limits = truncatedGlyphs.get(glyphs);
  if (!limits) truncatedGlyphs.set(glyphs, (limits = new Map()));
  if (!limits.has(text.glyphLimit))
    limits.set(text.glyphLimit, glyphs.slice(0, text.glyphLimit));
  return limits.get(text.glyphLimit)!;
}

export function hasSavedTextOutlines(n: Node) {
  const text = n.fidelity?.text;
  return (
    n.type === "text" &&
    text?.characters === n.text &&
    !!text.glyphCache &&
    (!!text.decorations?.length ||
      !(n.textFlow?.runs ?? text.spans)?.some(
        (s) => s.underline || s.strikethrough,
      ))
  );
}
