// Imported design data shared by the canvas, exports and native file round trips.
export type Matrix = [number, number, number, number, number, number];
export interface VectorPath {
  d: string;
  rule: "nonzero" | "evenodd";
  strokeOutline?: boolean;
  color?: string;
}
export interface Fidelity {
  size: [number, number];
  linear?: [number, number, number, number];
  paths?: VectorPath[];
  image?: {
    mode: "fill" | "fit" | "crop" | "tile";
    transform: Matrix;
    width: number;
    height: number;
    scale: number;
    opacity: number;
  };
  text?: {
    characters: string;
    lines: { start: number; end: number; x: number; y: number }[];
    letterSpacing: number;
    spans?: {
      start: number;
      end: number;
      fill?: string;
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: number;
      italic?: boolean;
    }[];
  };
  clipsContent?: boolean;
  corners?: [number, number, number, number];
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
  const emit = (indices: number[], closed: boolean) => {
    let current = -1;
    let path = "";
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
      const a = vertices[reverse ? s.b : s.a],
        b = vertices[reverse ? s.a : s.b];
      if (current < 0) path += `M${xy(a.x, a.y)} `;
      path +=
        s.ax === 0 && s.ay === 0 && s.bx === 0 && s.by === 0
          ? `L${xy(b.x, b.y)} `
          : `C${xy(a.x + (reverse ? s.bx : s.ax), a.y + (reverse ? s.by : s.ay))} ${xy(b.x + (reverse ? s.ax : s.bx), b.y + (reverse ? s.ay : s.by))} ${xy(b.x, b.y)} `;
      current = reverse ? s.a : s.b;
    }
    return path + (closed ? "Z" : "");
  };
  const result: VectorPath[] = [];
  for (let i = 0; i < nr; i++) {
    const packed = u(),
      loops = u();
    if (loops > ns) throw Error("Invalid vector network");
    let d = "";
    for (let j = 0; j < loops; j++) {
      const count = u();
      if (count > ns) throw Error("Invalid vector network");
      const ids = Array.from({ length: count }, u);
      d += emit(ids, true) + " ";
    }
    result.push({ d, rule: packed & 1 ? "nonzero" : "evenodd" });
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
  return result;
}
export function validateFidelity(f: Fidelity) {
  const finite = (a: unknown, n: number) =>
    Array.isArray(a) &&
    a.length === n &&
    a.every((x) => typeof x === "number" && Number.isFinite(x));
  if (
    !f ||
    !finite(f.size, 2) ||
    f.size.some((x) => x < 0) ||
    (f.linear && !finite(f.linear, 4)) ||
    (f.corners && (!finite(f.corners, 4) || f.corners.some((x) => x < 0)))
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
          !/^[MLQCZmlqcz\d\s.,+eE-]*$/.test(p.d) ||
          !["evenodd", "nonzero"].includes(p.rule) ||
          (p.color !== undefined &&
            !/^#[\da-f]{3,8}$/i.test(p.color) &&
            p.color !== "none"),
      ))
  )
    throw Error("Invalid vector geometry");
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
          !Number.isInteger(s.start) ||
          !Number.isInteger(s.end) ||
          s.start < 0 ||
          s.end < s.start ||
          s.end > f.text!.characters.length ||
          (s.fill !== undefined && !/^#[\da-f]{3,8}$/i.test(s.fill)) ||
          (s.fontFamily !== undefined && typeof s.fontFamily !== "string") ||
          (s.fontSize !== undefined &&
            (!Number.isFinite(s.fontSize) || s.fontSize <= 0)) ||
          (s.fontWeight !== undefined && !Number.isFinite(s.fontWeight)),
      ))
  )
    throw Error("Invalid text layout");
  if (f.clipsContent !== undefined && typeof f.clipsContent !== "boolean")
    throw Error("Invalid imported design data");
  if (
    (f.strokeCap && !["round", "square", "butt"].includes(f.strokeCap)) ||
    (f.strokeJoin && !["round", "bevel", "miter"].includes(f.strokeJoin))
  )
    throw Error("Invalid imported design data");
}
