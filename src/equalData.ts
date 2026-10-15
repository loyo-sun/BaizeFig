/** Structural equality for serializable document data, ignoring object key order and absent undefined values. */
export function equalData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, i) => equalData(value, b[i]))
    );
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>,
    keys = Object.keys(left).filter((k) => left[k] !== undefined);
  return (
    keys.length ===
      Object.keys(right).filter((k) => right[k] !== undefined).length &&
    keys.every((k) => equalData(left[k], right[k]))
  );
}
