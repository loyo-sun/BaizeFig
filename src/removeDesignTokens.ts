import type { Document } from "./core";
import { refreshCompositeTokens } from "./compositeTokens";

const documentKeys = [
  "variables",
  "typedVariables",
  "variableCollections",
  "compositeTokens",
  "tokenThemes",
] as const;
const bindingKeys = new Set([
  "variableId",
  "variableModes",
  "bindings",
  "compositeBindings",
]);

function hasBindings(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => bindingKeys.has(key) || hasBindings(child),
  );
}

function hasNodeBindings(node: Document["nodes"][number]): boolean {
  return (
    [...bindingKeys].some((key) => key in node) ||
    hasBindings(node.componentOverrides) ||
    hasBindings(node.componentSlots)
  );
}

/** Read-only compatibility: turn retired design-token data into ordinary styles. */
export function removeDesignTokens(original: Document): Document {
  if (
    !documentKeys.some((key) => original[key] !== undefined) &&
    !original.nodes.some(hasNodeBindings) &&
    !original.componentLibrary?.some((component) =>
      component.nodes.some(hasNodeBindings),
    )
  )
    return original;
  let doc = structuredClone(original);
  try {
    doc = refreshCompositeTokens(doc);
  } catch {
    // Broken legacy references must not prevent opening a design. Keep its saved appearance.
    doc = structuredClone(original);
  }
  function strip(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(strip);
      return;
    }
    const object = value as Record<string, unknown>;
    // Bound colors used the resolved fill even when imported paint metadata was present.
    if (object.variableId && typeof object.fill === "string") {
      const fidelity = object.fidelity as
        { paints?: { type: string; color?: string }[] } | undefined;
      if (fidelity?.paints?.[0]?.type === "solid")
        fidelity.paints[0].color = object.fill;
    }
    for (const key of Object.keys(object)) {
      if (bindingKeys.has(key)) delete object[key];
      else strip(object[key]);
    }
  }
  for (const key of documentKeys) delete doc[key];
  strip(doc.nodes);
  strip(doc.componentLibrary);
  return doc;
}
