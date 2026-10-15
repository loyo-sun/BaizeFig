export interface FontSettings {
  features?: Record<string, number>;
  variations?: Record<string, number>;
}
export function validFontSettings(
  value: unknown,
): value is FontSettings | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const settings = value as FontSettings;
  return (["features", "variations"] as const).every((kind) => {
    const map = settings[kind];
    return (
      map === undefined ||
      (typeof map === "object" &&
        map !== null &&
        !Array.isArray(map) &&
        Object.keys(map).length <= 64 &&
        Object.entries(map).every(
          ([tag, n]) =>
            /^[A-Za-z0-9]{4}$/.test(tag) &&
            Number.isFinite(n) &&
            (kind === "features"
              ? Number.isInteger(n) && n >= 0 && n <= 65535
              : Math.abs(n) <= 65536),
        ))
    );
  });
}
export function mergeFontSettings(
  base?: FontSettings,
  run?: FontSettings,
): FontSettings {
  return {
    features: { ...base?.features, ...run?.features },
    variations: { ...base?.variations, ...run?.variations },
  };
}
export function fontSettingsStyle(settings?: FontSettings) {
  const css = (map?: Record<string, number>) =>
    map && Object.keys(map).length
      ? Object.entries(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([tag, value]) => `"${tag}" ${value}`)
          .join(", ")
      : undefined;
  return {
    fontFeatureSettings: css(settings?.features),
    fontVariationSettings: css(settings?.variations),
  };
}

// FontVariation.axisTag is the four-byte OpenType tag stored as a uint.
export function figFontSettings(
  raw: Record<string, any>,
): FontSettings | undefined {
  const features: Record<string, number> = {},
    variations: Record<string, number> = {};
  const booleans: Record<string, string> = {
    fontVariantCommonLigatures: "liga",
    fontVariantContextualLigatures: "calt",
    fontVariantDiscretionaryLigatures: "dlig",
    fontVariantHistoricalLigatures: "hlig",
    fontVariantOrdinal: "ordn",
    fontVariantSlashedZero: "zero",
  };
  for (const [field, tag] of Object.entries(booleans))
    if (typeof raw[field] === "boolean") features[tag] = Number(raw[field]);
  if (typeof raw.fontVariantCommonLigatures === "boolean")
    features.clig = Number(raw.fontVariantCommonLigatures);
  const enums: Record<string, Record<string, string[]>> = {
    fontVariantNumericFigure: {
      NORMAL: ["lnum", "onum"],
      LINING: ["lnum"],
      OLDSTYLE: ["onum"],
    },
    fontVariantNumericSpacing: {
      NORMAL: ["pnum", "tnum"],
      PROPORTIONAL: ["pnum"],
      TABULAR: ["tnum"],
    },
    fontVariantNumericFraction: {
      NORMAL: ["frac", "afrc"],
      DIAGONAL: ["frac"],
      STACKED: ["afrc"],
    },
    fontVariantCaps: {
      NORMAL: ["smcp", "c2sc", "pcap", "c2pc", "unic", "titl"],
      SMALL: ["smcp"],
      ALL_SMALL: ["smcp", "c2sc"],
      PETITE: ["pcap"],
      ALL_PETITE: ["pcap", "c2pc"],
      UNICASE: ["unic"],
      TITLING: ["titl"],
    },
    fontVariantPosition: {
      NORMAL: ["subs", "sups"],
      SUB: ["subs"],
      SUPER: ["sups"],
    },
  };
  for (const [field, values] of Object.entries(enums))
    if (values[raw[field]]) {
      for (const tag of new Set(Object.values(values).flat()))
        features[tag] = 0;
      if (raw[field] !== "NORMAL")
        for (const tag of values[raw[field]]) features[tag] = 1;
    }
  for (const axis of raw.fontVariations ?? []) {
    if (
      !Number.isInteger(axis.axisTag) ||
      axis.axisTag < 0 ||
      axis.axisTag > 0xffffffff ||
      !Number.isFinite(axis.value) ||
      Math.abs(axis.value) > 65536
    )
      continue;
    const tag = String.fromCharCode(
      ...[24, 16, 8, 0].map((shift) => (axis.axisTag >>> shift) & 255),
    );
    if (/^[A-Za-z0-9]{4}$/.test(tag)) variations[tag] = axis.value;
  }
  if (!Object.keys(features).length && !Object.keys(variations).length)
    return undefined;
  return { features, variations };
}
