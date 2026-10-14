import ClipperLib from "clipper-lib";
import type { Vec } from "./vectorNetwork";
export function dashContours(
  points: Vec[],
  closed: boolean,
  pattern?: number[],
  offset = 0,
): { points: Vec[]; closed: boolean }[] {
  if (!pattern?.length) return [{ points, closed }];
  const d = pattern.length % 2 ? [...pattern, ...pattern] : pattern,
    total = d.reduce((a, b) => a + b, 0);
  let phase = ((offset % total) + total) % total,
    index = 0;
  while (phase >= d[index]) {
    phase -= d[index];
    index = (index + 1) % d.length;
  }
  let left = d[index] - phase,
    current: Vec[] = [],
    out: { points: Vec[]; closed: boolean }[] = [];
  const source = closed ? [...points, points[0]] : points;
  for (let i = 1; i < source.length; i++) {
    const a = source[i - 1],
      b = source[i],
      length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 1e-10) continue;
    let distance = 0;
    while (distance < length - 1e-9) {
      const step = Math.min(left, length - distance),
        start = {
          x: a.x + ((b.x - a.x) * distance) / length,
          y: a.y + ((b.y - a.y) * distance) / length,
        };
      distance += step;
      const end = {
        x: a.x + ((b.x - a.x) * distance) / length,
        y: a.y + ((b.y - a.y) * distance) / length,
      };
      if (index % 2 === 0) {
        if (!current.length) current.push(start);
        current.push(end);
      }
      left -= step;
      if (left < 1e-9) {
        if (current.length) {
          out.push({ points: current, closed: false });
          current = [];
        }
        index = (index + 1) % d.length;
        left = d[index];
      }
      if (out.length > 50000) throw Error("Too many stroke dashes");
    }
  }
  if (current.length) out.push({ points: current, closed: false });
  if (closed && out.length > 1) {
    const first = out[0].points,
      last = out[out.length - 1].points;
    if (
      Math.hypot(
        first[0].x - last[last.length - 1].x,
        first[0].y - last[last.length - 1].y,
      ) < 1e-8
    ) {
      out[0].points = [...last, ...first.slice(1)];
      out.pop();
    }
  }
  return out;
}
export function bevelStroke(
  points: Vec[],
  closed: boolean,
  radius: number,
  cap: "round" | "square" | "butt",
  scale: number,
): ClipperLib.Paths {
  const output: ClipperLib.Paths = [];
  const add = (p: Vec[]) => {
    const poly = p.map((v) => ({
      X: Math.round(v.x * scale),
      Y: Math.round(v.y * scale),
    }));
    if (ClipperLib.Clipper.Area(poly) < 0) poly.reverse();
    output.push(poly);
  };
  const normals: Vec[] = [],
    directions: Vec[] = [],
    count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      l = Math.hypot(b.x - a.x, b.y - a.y) || 1,
      t = { x: (b.x - a.x) / l, y: (b.y - a.y) / l },
      n = { x: -t.y * radius, y: t.x * radius };
    normals.push(n);
    directions.push(t);
    add([
      { x: a.x + n.x, y: a.y + n.y },
      { x: b.x + n.x, y: b.y + n.y },
      { x: b.x - n.x, y: b.y - n.y },
      { x: a.x - n.x, y: a.y - n.y },
    ]);
  }
  for (
    let i = closed ? 0 : 1;
    i < (closed ? points.length : points.length - 1);
    i++
  ) {
    const p = points[i],
      a = normals[(i - 1 + count) % count],
      b = normals[i % count];
    for (const sign of [-1, 1])
      add([
        p,
        { x: p.x + a.x * sign, y: p.y + a.y * sign },
        { x: p.x + b.x * sign, y: p.y + b.y * sign },
      ]);
  }
  if (!closed && points.length > 1)
    for (const end of [0, 1]) {
      const p = end ? points[points.length - 1] : points[0],
        i = end ? count - 1 : 0,
        n = normals[i],
        t = directions[i],
        sign = end ? 1 : -1;
      if (cap === "square")
        add([
          { x: p.x + n.x, y: p.y + n.y },
          { x: p.x - n.x, y: p.y - n.y },
          {
            x: p.x - n.x + t.x * radius * sign,
            y: p.y - n.y + t.y * radius * sign,
          },
          {
            x: p.x + n.x + t.x * radius * sign,
            y: p.y + n.y + t.y * radius * sign,
          },
        ]);
      if (cap === "round") {
        const steps = Math.max(
          12,
          Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - 0.01 / radius))),
        );
        add(
          Array.from({ length: steps }, (_, i) => ({
            x: p.x + radius * Math.cos((i * Math.PI * 2) / steps),
            y: p.y + radius * Math.sin((i * Math.PI * 2) / steps),
          })),
        );
      }
    }
  return output;
}
