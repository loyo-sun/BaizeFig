import { execute, type Document, type Node } from "./core";
import { equalData } from "./equalData";
// A sidebar patch is authored against the first object. Only its changed leaves
// are shared; unrelated per-object fidelity and layout values stay independent.
export function mergeChanged(
  source: unknown,
  patch: unknown,
  target: unknown,
): unknown {
  if (equalData(source, patch)) return structuredClone(target);
  if (
    Array.isArray(source) &&
    Array.isArray(patch) &&
    Array.isArray(target) &&
    source.length === patch.length &&
    source.length === target.length
  )
    return patch.map((value, i) => mergeChanged(source[i], value, target[i]));
  if (
    patch &&
    target &&
    typeof patch === "object" &&
    (source === undefined || typeof source === "object") &&
    typeof target === "object" &&
    !Array.isArray(patch) &&
    !Array.isArray(source) &&
    !Array.isArray(target)
  ) {
    const result = { ...(target as Record<string, unknown>) };
    for (const key of Object.keys(patch))
      result[key] = mergeChanged(
        (source as Record<string, unknown> | undefined)?.[key],
        (patch as Record<string, unknown>)[key],
        (target as Record<string, unknown>)[key],
      );
    return result;
  }
  return structuredClone(patch);
}
export function updateSelectionProperties(
  doc: Document,
  ids: string[],
  patch: Partial<Node>,
) {
  const source = doc.nodes.find((n) => ids.includes(n.id));
  if (!source) return doc;
  let next = doc;
  for (const node of doc.nodes.filter((n) => ids.includes(n.id))) {
    const local = { ...patch };
    for (const key of [
      "fidelity",
      "textFlow",
      "layoutItem",
      "importedLayout",
      "constraints",
    ] as const)
      if (key in patch)
        (local as Record<string, unknown>)[key] = mergeChanged(
          key === "fidelity"
            ? (source.fidelity ?? { size: [source.width, source.height] })
            : source[key],
          patch[key],
          key === "fidelity"
            ? (node.fidelity ?? { size: [node.width, node.height] })
            : node[key],
        );
    next = execute(next, { type: "update", ids: [node.id], patch: local }).doc;
  }
  return next;
}
