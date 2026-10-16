type Raw = Record<string, any>;
// Derived geometry is an optional saved calculation, not an explicit edit.
// Keep the last authoritative coordinate when that calculation is non-finite.
export function mergeFigOverride(base: Raw, override: Raw, derived: boolean, warnings: Set<string>): Raw {
  const result = {...base, ...override};
  if (!derived) return result;
  for (const [field, axes] of [["size", ["x","y"]], ["transform", ["m00","m01","m02","m10","m11","m12"]]] as const) {
    if (!override[field]) continue;
    const value = {...override[field]};
    for (const axis of axes) {
      if (typeof value[axis] === "number" && !Number.isFinite(value[axis]) && Number.isFinite(base[field]?.[axis])) {
        value[axis] = base[field][axis];
        warnings.add("Some derived component geometry was unavailable; source geometry is retained.");
      }
    }
    result[field] = value;
  }
  return result;
}
