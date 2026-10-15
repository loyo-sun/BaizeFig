export function fontFamilies(value: string): string[] {
  return (value.match(/"[^"]*"|'[^']*'|[^,]+/g) ?? [])
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}
export function usesBundledInter(value: string) {
  return fontFamilies(value).some((f) =>
    ["inter", "inter variable"].includes(f.toLowerCase()),
  );
}
// An installed Inter stays first. The bundled family only fills a missing face.
export function renderFontFamily(value: string) {
  if (
    !fontFamilies(value).some((f) => f.toLowerCase() === "inter") ||
    fontFamilies(value).some((f) => f.toLowerCase() === "inter variable")
  )
    return value;
  return value.replace(
    /((?:^|,)\s*)("Inter"|'Inter'|Inter)(?=\s*(?:,|$))/gi,
    (_, prefix, name) => `${prefix}${name}, "Inter Variable"`,
  );
}
