type Raw = Record<string, any>;
const typographyFields = [
  "fontSize",
  "fontName",
  "lineHeight",
  "letterSpacing",
  "paragraphSpacing",
  "textDecoration",
  "fontVariations",
  "fontVariantCommonLigatures",
  "fontVariantContextualLigatures",
  "fontVariantDiscretionaryLigatures",
  "fontVariantHistoricalLigatures",
  "fontVariantOrdinal",
  "fontVariantSlashedZero",
  "fontVariantNumericFigure",
  "fontVariantNumericSpacing",
  "fontVariantNumericFraction",
  "fontVariantCaps",
  "fontVariantPosition",
];
export function figFontWeight(
  style: string,
  metadata: Raw[] = [],
  family?: string,
) {
  const saved = metadata.find(
    (m) => m.key?.style === style && (!family || m.key?.family === family),
  )?.fontWeight;
  if (Number.isFinite(saved) && saved >= 1 && saved <= 1000)
    return saved as number;
  const name = style.toLowerCase().replace(/[\s_-]/g, "");
  return /black|heavy/.test(name)
    ? 900
    : /extrabold|ultrabold/.test(name)
      ? 800
      : /semibold|demibold/.test(name)
        ? 600
        : /bold/.test(name)
          ? 700
          : /medium/.test(name)
            ? 500
            : /extralight|ultralight/.test(name)
              ? 200
              : /light/.test(name)
                ? 300
                : /thin|hairline/.test(name)
                  ? 100
                  : 400;
}
export function resolveFigTypography(
  node: Raw,
  find: (ref: Raw) => Raw | undefined,
  warnings: Set<string>,
  explicitFields = new Set<string>(),
): Raw {
  const reference = node.styleIdForText;
  if (!reference) return node;
  const style = find(reference),
    result = { ...node };
  if (style?.styleType === "TEXT") {
    for (const field of typographyFields)
      if (style[field] !== undefined && !explicitFields.has(field))
        result[field] = style[field];
  } else {
    warnings.add(
      "Some text styles are unavailable; saved font metrics are used where possible.",
    );
    const fonts = node.derivedTextData?.fontMetaData ?? [];
    if (fonts.length === 1 && fonts[0].key && !explicitFields.has("fontName"))
      result.fontName = fonts[0].key;
    const sizes = [
      ...new Set(
        (node.derivedTextData?.glyphs ?? []).map((g: Raw) => g.fontSize),
      ),
    ];
    if (
      sizes.length === 1 &&
      Number.isFinite(sizes[0]) &&
      !explicitFields.has("fontSize")
    )
      result.fontSize = sizes[0];
  }
  return result;
}
export function figTextDecorations(text: string, node: Raw, spans: Raw[]) {
  const base = {
    ...(/italic|oblique/i.test(node.fontName?.style ?? "")
      ? { italic: true }
      : {}),
    ...(node.textDecoration === "UNDERLINE" ? { underline: true } : {}),
    ...(node.textDecoration === "STRIKETHROUGH" ? { strikethrough: true } : {}),
  };
  if (!text.length || !Object.keys(base).length) return spans;
  const cuts = [
    ...new Set([0, text.length, ...spans.flatMap((s) => [s.start, s.end])]),
  ].sort((a, b) => a - b);
  return cuts.slice(0, -1).map((start, i) => ({
    ...base,
    ...spans.find((s) => s.start <= start && s.end >= cuts[i + 1]),
    start,
    end: cuts[i + 1],
  }));
}
