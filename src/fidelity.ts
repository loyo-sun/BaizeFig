import { decodeGlyphCache } from "./glyphCache";
import { validFontSettings, type FontSettings } from "./fontSettings";
import { baselineTrail, type PathText, type SavedGlyph } from "./textPath";
import type { TextLine } from "./textLayout";
import type { ImportedPaint, ImportedEffect } from "./appearance";
import { validateNetwork, type VectorNetwork } from "./vectorNetwork";
// Imported design data shared by the canvas, exports and native file round trips.
export type Matrix = [number, number, number, number, number, number];
export interface VectorPath {
  d: string;
  rule: "nonzero" | "evenodd";
  strokeOutline?: boolean;
  color?: string;
  paints?: ImportedPaint[];
  region?: number;
}
export interface Fidelity {
  // A non-rendering Figma slice; exports the page through this region.
  exportRegion?: boolean;
  booleanOperation?: "union" | "subtract" | "intersect" | "exclude";
  pointCount?: number;
  innerRatio?: number;
  paints?: ImportedPaint[];
  effects?: ImportedEffect[];
  blendMode?: string;
  mask?: "alpha" | "luminance";
  size: [number, number];
  linear?: [number, number, number, number];
  paths?: VectorPath[];
  network?: VectorNetwork;
  image?: {
    mode: "fill" | "fit" | "crop" | "tile";
    transform: Matrix;
    width: number;
    height: number;
    scale: number;
    opacity: number;
  };
  textPath?: PathText;
  text?: {
    glyphs?: SavedGlyph[];
    glyphCache?: string;
    glyphLimit?: number;
    decorations?: {
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
    }[];
    characters: string;
    lines: TextLine[];
    letterSpacing: number;
    spans?: {
      start: number;
      end: number;
      fill?: string;
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: number;
      fontSettings?: FontSettings;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      href?: string;
    }[];
  };
  clipsContent?: boolean;
  corners?: [number, number, number, number];
  strokeOpacity?: number;
  hiddenStrokeOpacity?: number;
  strokeAlign?: "center" | "inside" | "outside";
  strokeMiterLimit?: number;
  strokeDash?: number[];
  strokeDashOffset?: number;
  strokeCap?: "round" | "square" | "butt";
  strokeJoin?: "round" | "bevel" | "miter";
  sourceId?: string;
  componentSourceId?: string;
}
export const identity: Matrix = [1, 0, 0, 1, 0, 0];
export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
export const transformPoint = (m: Matrix, x: number, y: number) => ({
  x: m[0] * x + m[2] * y + m[4],
  y: m[1] * x + m[3] * y + m[5],
});
export function inverse(m: Matrix): Matrix {
  const d = m[0] * m[3] - m[1] * m[2];
  if (!Number.isFinite(d) || Math.abs(d) < 1e-12)
    throw Error("Singular transform");
  return [
    m[3] / d,
    -m[1] / d,
    -m[2] / d,
    m[0] / d,
    (m[2] * m[5] - m[3] * m[4]) / d,
    (m[1] * m[4] - m[0] * m[5]) / d,
  ];
}
export function commandsPath(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0,
    started = false;
  const out: string[] = [];
  while (p < bytes.length) {
    const op = bytes[p++],
      count =
        op === 1 || op === 2
          ? 2
          : op === 3
            ? 4
            : op === 4
              ? 6
              : op === 0
                ? 0
                : -1;
    if (count < 0 || p + count * 4 > bytes.length)
      throw Error("Invalid vector geometry");
    if (op === 0) {
      if (started) out.push("Z");
      continue;
    }
    if (!started && op !== 1) throw Error("Invalid vector geometry");
    started = true;
    const values = [];
    for (let i = 0; i < count; i++, p += 4) {
      const v = view.getFloat32(p, true);
      if (!Number.isFinite(v)) throw Error("Invalid vector geometry");
      values.push(v);
    }
    out.push(["Z", "M", "L", "Q", "C"][op] + values.join(" "));
  }
  return out.join(" ");
}
export function networkPaths(
  bytes: Uint8Array,
  width: number,
  height: number,
  normalized: { x: number; y: number },
  receive?: (network: VectorNetwork, styles: number[]) => void,
): VectorPath[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0;
  const u = () => {
    if (p + 4 > bytes.length) throw Error("Invalid vector network");
    const n = v.getUint32(p, true);
    p += 4;
    return n;
  };
  const f = () => {
    if (p + 4 > bytes.length) throw Error("Invalid vector network");
    const n = v.getFloat32(p, true);
    p += 4;
    if (!Number.isFinite(n)) throw Error("Invalid vector network");
    return n;
  };
  const nv = u(),
    ns = u(),
    nr = u();
  if (
    nv > 20000 ||
    ns > 40000 ||
    nr > 20000 ||
    12 + nv * 12 + ns * 28 > bytes.length
  )
    throw Error("Invalid vector network");
  const vertices = Array.from({ length: nv }, () => {
    u();
    return { x: f(), y: f() };
  });
  const segments = Array.from({ length: ns }, () => {
    u();
    const a = u(),
      ax = f(),
      ay = f(),
      b = u(),
      bx = f(),
      by = f();
    if (a >= nv || b >= nv) throw Error("Invalid vector network");
    return { a, b, ax, ay, bx, by };
  });
  const sx = normalized.x ? width / normalized.x : 1,
    sy = normalized.y ? height / normalized.y : 1;
  const xy = (x: number, y: number) => `${x * sx} ${y * sy}`;
  const network: VectorNetwork = {
    vertices: vertices.map((v) => ({ x: v.x * sx, y: v.y * sy })),
    segments: segments.map((s) => ({
      a: s.a,
      b: s.b,
      ha: { x: s.ax * sx, y: s.ay * sy },
      hb: { x: s.bx * sx, y: s.by * sy },
    })),
    regions: [],
  };
  const styles: number[] = [];
  let trail: { segment: number; reverse: boolean }[] = [];
  const emit = (indices: number[], closed: boolean) => {
    trail = [];
    let current = -1;
    let path = "";
    if (closed) {
      // Region contours may be open: fill closes them implicitly, while the
      // missing edge must not acquire a stroke. Traverse every edge occurrence
      // so side cycles cannot strand a valid contour at a greedy dead end.
      const adjacency = new Map<number, number[]>();
      indices.forEach((index, occurrence) => {
        const segment = segments[index];
        if (!segment) throw Error("Invalid vector network");
        for (const vertex of [segment.a, segment.b]) {
          if (!adjacency.has(vertex)) adjacency.set(vertex, []);
          adjacency.get(vertex)!.push(occurrence);
        }
      });
      const odd = [...adjacency]
        .filter(([, edges]) => edges.length % 2)
        .map(([vertex]) => vertex);
      if (odd.length !== 0 && odd.length !== 2)
        throw Error("Invalid vector network");
      const first = segments[indices[0]];
      if (first) {
        const start = odd.length
          ? odd.includes(first.a)
            ? first.a
            : odd[0]
          : first.a;
        const stack: {
          vertex: number;
          incoming?: { segment: number; reverse: boolean };
        }[] = [{ vertex: start }];
        const used = new Set<number>(),
          cursor = new Map<number, number>(),
          reversed: typeof trail = [];
        while (stack.length) {
          const top = stack[stack.length - 1],
            edges = adjacency.get(top.vertex) ?? [];
          let at = cursor.get(top.vertex) ?? 0;
          while (at < edges.length && used.has(edges[at])) at++;
          cursor.set(top.vertex, at + 1);
          if (at >= edges.length) {
            const done = stack.pop()!;
            if (done.incoming) reversed.push(done.incoming);
            continue;
          }
          const occurrence = edges[at],
            index = indices[occurrence],
            segment = segments[index];
          used.add(occurrence);
          const reverse = segment.b === top.vertex && segment.a !== top.vertex;
          stack.push({
            vertex: reverse ? segment.a : segment.b,
            incoming: { segment: index, reverse },
          });
        }
        if (used.size !== indices.length) throw Error("Invalid vector network");
        trail = reversed.reverse();
        for (const entry of trail) {
          const segment = segments[entry.segment],
            reverse = entry.reverse;
          const a = vertices[reverse ? segment.b : segment.a],
            b = vertices[reverse ? segment.a : segment.b];
          if (!path) path = `M${xy(a.x, a.y)} `;
          path +=
            segment.ax === 0 &&
            segment.ay === 0 &&
            segment.bx === 0 &&
            segment.by === 0
              ? `L${xy(b.x, b.y)} `
              : `C${xy(a.x + (reverse ? segment.bx : segment.ax), a.y + (reverse ? segment.by : segment.ay))} ${xy(b.x + (reverse ? segment.ax : segment.bx), b.y + (reverse ? segment.ay : segment.by))} ${xy(b.x, b.y)} `;
        }
      }
    } else {
      const remaining = new Set(indices);
      while (remaining.size) {
        let chosen = -1,
          reverse = false;
        for (const i of remaining) {
          const s = segments[i];
          if (!s) throw Error("Invalid vector network");
          if (current < 0 || s.a === current || s.b === current) {
            chosen = i;
            reverse = s.b === current;
            break;
          }
        }
        if (chosen < 0) {
          if (closed) throw Error("Invalid vector network");
          current = -1;
          continue;
        }
        const s = segments[chosen];
        remaining.delete(chosen);
        trail.push({ segment: chosen, reverse });
        const a = vertices[reverse ? s.b : s.a],
          b = vertices[reverse ? s.a : s.b];
        if (current < 0) path += `M${xy(a.x, a.y)} `;
        path +=
          s.ax === 0 && s.ay === 0 && s.bx === 0 && s.by === 0
            ? `L${xy(b.x, b.y)} `
            : `C${xy(a.x + (reverse ? s.bx : s.ax), a.y + (reverse ? s.by : s.ay))} ${xy(b.x + (reverse ? s.ax : s.bx), b.y + (reverse ? s.ay : s.by))} ${xy(b.x, b.y)} `;
        current = reverse ? s.a : s.b;
      }
    }
    return path + (closed ? "Z" : "");
  };
  const result: VectorPath[] = [];
  for (let i = 0; i < nr; i++) {
    const packed = u(),
      loops = u();
    if (loops > ns) throw Error("Invalid vector network");
    let d = "";
    const regionLoops: VectorNetwork["regions"][number]["loops"] = [];
    for (let j = 0; j < loops; j++) {
      const count = u();
      if (count > ns) throw Error("Invalid vector network");
      const ids = Array.from({ length: count }, u);
      d += emit(ids, true) + " ";
      regionLoops.push([...trail]);
    }
    result.push({ d, rule: packed & 1 ? "nonzero" : "evenodd" });
    network.regions.push({
      loops: regionLoops,
      rule: packed & 1 ? "nonzero" : "evenodd",
    });
    styles.push(packed >>> 1);
  }
  if (!nr && ns)
    result.push({
      d: emit(
        segments.map((_, i) => i),
        false,
      ),
      rule: "nonzero",
    });
  if (p !== bytes.length) throw Error("Invalid vector network");
  validateNetwork(network);
  receive?.(network, styles);
  return result;
}
export function validateFidelity(f: Fidelity) {
  if (f.exportRegion !== undefined && typeof f.exportRegion !== "boolean")
    throw Error("Invalid export region");
  if (
    (f.strokeAlign &&
      !["center", "inside", "outside"].includes(f.strokeAlign)) ||
    (f.strokeMiterLimit !== undefined &&
      (!Number.isFinite(f.strokeMiterLimit) || f.strokeMiterLimit < 1)) ||
    (f.strokeDashOffset !== undefined &&
      !Number.isFinite(f.strokeDashOffset)) ||
    (f.strokeDash &&
      (!Array.isArray(f.strokeDash) ||
        f.strokeDash.length > 100 ||
        f.strokeDash.some((v) => !Number.isFinite(v) || v <= 0)))
  )
    throw Error("Invalid vector stroke");
  if (f.network) {
    validateNetwork(f.network);
    for (const r of f.network.regions)
      validateFidelity({
        size: f.size,
        paints: r.paints,
        paths: r.color ? [{ d: "", rule: r.rule, color: r.color }] : undefined,
      });
  }
  for (const p of f.paths ?? [])
    if (p.paints) validateFidelity({ size: f.size, paints: p.paints });
  if (
    f.booleanOperation !== undefined &&
    !["union", "subtract", "intersect", "exclude"].includes(f.booleanOperation)
  )
    throw Error("Invalid boolean operation");
  if (
    (f.pointCount !== undefined &&
      (!Number.isInteger(f.pointCount) ||
        f.pointCount < 3 ||
        f.pointCount > 1000)) ||
    (f.innerRatio !== undefined &&
      (!Number.isFinite(f.innerRatio) || f.innerRatio < 0 || f.innerRatio > 1))
  )
    throw Error("Invalid polygon parameters");
  const finite = (a: unknown, n: number) =>
    Array.isArray(a) &&
    a.length === n &&
    a.every((x) => typeof x === "number" && Number.isFinite(x));
  if (
    !f ||
    !finite(f.size, 2) ||
    f.size.some((x) => x < 0) ||
    (f.linear && !finite(f.linear, 4)) ||
    (f.corners && (!finite(f.corners, 4) || f.corners.some((x) => x < 0))) ||
    (f.hiddenStrokeOpacity !== undefined &&
      (!Number.isFinite(f.hiddenStrokeOpacity) ||
        f.hiddenStrokeOpacity < 0 ||
        f.hiddenStrokeOpacity > 1)) ||
    (f.strokeOpacity !== undefined &&
      (!Number.isFinite(f.strokeOpacity) ||
        f.strokeOpacity < 0 ||
        f.strokeOpacity > 1))
  )
    throw Error("Invalid imported design data");
  if (
    f.paths &&
    (!Array.isArray(f.paths) ||
      f.paths.length > 20000 ||
      f.paths.some(
        (p) =>
          typeof p.d !== "string" ||
          p.d.length > 2000000 ||
          !/^[MLHVQCSTAZmlhvqcstaz\d\s.,+eE-]*$/.test(p.d) ||
          !["evenodd", "nonzero"].includes(p.rule) ||
          (p.color !== undefined &&
            !/^#[\da-f]{3,8}$/i.test(p.color) &&
            p.color !== "none"),
      ))
  )
    throw Error("Invalid vector geometry");
  if (f.textPath) {
    validateNetwork(f.textPath.network);
    baselineTrail(f.textPath.network);
    if (
      !Number.isFinite(f.textPath.offset) ||
      f.textPath.offset < 0 ||
      f.textPath.offset > 1 ||
      typeof f.textPath.reverse !== "boolean"
    )
      throw Error("Invalid text baseline");
  }
  if (
    f.text?.decorations !== undefined &&
    (!Array.isArray(f.text.decorations) ||
      f.text.decorations.length > 20000 ||
      f.text.decorations.some(
        (r) =>
          ![r.x, r.y, r.width, r.height].every(Number.isFinite) ||
          r.width < 0 ||
          r.height < 0 ||
          (r.fill !== undefined &&
            r.fill !== "none" &&
            !/^#[\da-f]{3,8}$/i.test(r.fill)),
      ))
  )
    throw Error("Invalid saved text decorations");
  if (f.text?.glyphLimit !== undefined && f.text.glyphCache === undefined)
    throw Error("Invalid glyph truncation");
  if (f.text?.glyphCache !== undefined) {
    if (typeof f.text.characters !== "string")
      throw Error("Invalid saved glyph cache");
    const glyphs = decodeGlyphCache(
      f.text.glyphCache,
      f.text.characters.length,
    );
    if (
      f.text.glyphLimit !== undefined &&
      (!Number.isInteger(f.text.glyphLimit) ||
        f.text.glyphLimit < 0 ||
        f.text.glyphLimit > glyphs.length)
    )
      throw Error("Invalid glyph truncation");
  }
  if (
    f.text?.glyphs &&
    (!Array.isArray(f.text.glyphs) ||
      f.text.glyphs.length > 20000 ||
      f.text.glyphs.some(
        (g) =>
          typeof g.d !== "string" ||
          g.d.length > 2000000 ||
          !/^[MLHVQCSTAZmlhvqcstaz\d\s.,+eE-]*$/.test(g.d) ||
          ![g.x, g.y, g.size, g.rotation].every(Number.isFinite) ||
          g.size <= 0 ||
          !Number.isInteger(g.start) ||
          g.start < 0 ||
          g.start >= f.text!.characters.length,
      ))
  )
    throw Error("Invalid saved glyph");
  if (
    f.image &&
    (!finite(f.image.transform, 6) ||
      !["fill", "fit", "crop", "tile"].includes(f.image.mode) ||
      ![f.image.width, f.image.height, f.image.scale, f.image.opacity].every(
        Number.isFinite,
      ) ||
      f.image.width <= 0 ||
      f.image.height <= 0 ||
      f.image.scale <= 0 ||
      f.image.opacity < 0 ||
      f.image.opacity > 1)
  )
    throw Error("Invalid image transform");
  if (
    f.text &&
    (typeof f.text.characters !== "string" ||
      !Number.isFinite(f.text.letterSpacing) ||
      !Array.isArray(f.text.lines) ||
      f.text.lines.length > 20000 ||
      f.text.lines.some(
        (l) =>
          (l.ellipsis !== undefined && typeof l.ellipsis !== "boolean") ||
          ![l.start, l.end, l.x, l.y].every(Number.isFinite) ||
          !Number.isInteger(l.start) ||
          !Number.isInteger(l.end) ||
          l.start < 0 ||
          l.end < l.start ||
          l.end > f.text!.characters.length,
      ))
  )
    throw Error("Invalid text layout");
  if (
    f.text?.spans &&
    (!Array.isArray(f.text.spans) ||
      f.text.spans.length > 20000 ||
      f.text.spans.some(
        (s) =>
          !validFontSettings(s.fontSettings) ||
          !Number.isInteger(s.start) ||
          !Number.isInteger(s.end) ||
          s.start < 0 ||
          s.end < s.start ||
          s.end > f.text!.characters.length ||
          (s.href !== undefined &&
            (typeof s.href !== "string" ||
              !/^(https?:|mailto:)/i.test(s.href))) ||
          ["italic", "underline", "strikethrough"].some(
            (k) =>
              (s as unknown as Record<string, unknown>)[k] !== undefined &&
              typeof (s as unknown as Record<string, unknown>)[k] !== "boolean",
          ) ||
          (s.fill !== undefined && !/^#[\da-f]{3,8}$/i.test(s.fill)) ||
          (s.fontFamily !== undefined && typeof s.fontFamily !== "string") ||
          (s.fontSize !== undefined &&
            (!Number.isFinite(s.fontSize) || s.fontSize <= 0)) ||
          (s.fontWeight !== undefined && !Number.isFinite(s.fontWeight)),
      ))
  )
    throw Error("Invalid text layout");
  if (
    f.paints &&
    (!Array.isArray(f.paints) ||
      f.paints.length > 100 ||
      f.paints.some(
        (p) =>
          (p.space !== undefined && p.space !== "user") ||
          (p.geometry !== undefined &&
            (!finite(p.geometry.matrix, 6) ||
              ![p.geometry.width, p.geometry.height].every(
                (v) => Number.isFinite(v) && v > 0,
              ))) ||
          !["solid", "linear", "radial", "diamond", "image"].includes(p.type) ||
          (p.hiddenOpacity !== undefined &&
            (!Number.isFinite(p.hiddenOpacity) ||
              p.hiddenOpacity < 0 ||
              p.hiddenOpacity > 1)) ||
          !Number.isFinite(p.opacity) ||
          p.opacity < 0 ||
          p.opacity > 1 ||
          (p.color !== undefined && !/^#[\da-f]{3,8}$/i.test(p.color)) ||
          (p.stops &&
            (!Array.isArray(p.stops) ||
              p.stops.length > 1000 ||
              p.stops.some(
                (s) =>
                  !Number.isFinite(s.position) ||
                  s.position < 0 ||
                  s.position > 1 ||
                  !/^#[\da-f]{3,8}$/i.test(s.color),
              ))) ||
          (p.transform && !finite(p.transform, 6)) ||
          (p.image !== undefined &&
            !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
              p.image,
            )),
      ))
  )
    throw Error("Invalid imported paints");
  for (const paint of f.paints ?? [])
    if (paint.imageOptions)
      validateFidelity({ size: f.size, image: paint.imageOptions });
  if (
    f.effects &&
    (!Array.isArray(f.effects) ||
      f.effects.length > 100 ||
      f.effects.some(
        (e) =>
          !["drop-shadow", "inner-shadow", "blur", "background-blur"].includes(
            e.type,
          ) ||
          !/^#[\da-f]{3,8}$/i.test(e.color) ||
          ![e.radius, e.spread, e.x, e.y].every(Number.isFinite) ||
          e.radius < 0 ||
          typeof e.visible !== "boolean",
      ))
  )
    throw Error("Invalid imported effects");
  if (f.mask !== undefined && !["alpha", "luminance"].includes(f.mask))
    throw Error("Invalid mask");
  if (
    f.blendMode !== undefined &&
    ![
      "normal",
      "multiply",
      "screen",
      "overlay",
      "darken",
      "lighten",
      "color-dodge",
      "color-burn",
      "hard-light",
      "soft-light",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
      "luminosity",
    ].includes(f.blendMode)
  )
    throw Error("Invalid blend mode");
  if (f.clipsContent !== undefined && typeof f.clipsContent !== "boolean")
    throw Error("Invalid imported design data");
  if (
    (f.strokeCap && !["round", "square", "butt"].includes(f.strokeCap)) ||
    (f.strokeJoin && !["round", "bevel", "miter"].includes(f.strokeJoin))
  )
    throw Error("Invalid imported design data");
}
