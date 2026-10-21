export function hexRgba(value: string) {
  let hex = value.replace(/^#/, "");
  if (hex.length === 3 || hex.length === 4)
    hex = [...hex].map((c) => c + c).join("");
  if (!/^[a-f\d]{6}([a-f\d]{2})?$/i.test(hex)) hex = "000000";
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1,
  };
}
export function rgbaHex(r: number, g: number, b: number, a = 1) {
  const component = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return (
    "#" +
    [r, g, b].map(component).join("") +
    (a < 1 ? component(Math.min(1, Math.max(0, a)) * 255) : "")
  );
}
export function rgbHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
export function hsvRgb(h: number, s: number, v: number) {
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  const p =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: (p[0] + m) * 255, g: (p[1] + m) * 255, b: (p[2] + m) * 255 };
}
