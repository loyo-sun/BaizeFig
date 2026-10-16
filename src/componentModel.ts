import type { Node, Document } from "./core";
export interface ComponentProperty {
  id: string;
  name: string;
  type: "text" | "boolean" | "instance" | "slot";
  targetPath: string;
  additionalTargetPaths?: string[];
  defaultValue: string | boolean;
  preferred?: string[];
}
export const propertyPaths = (p: ComponentProperty) => [
  p.targetPath,
  ...(p.additionalTargetPaths ?? []),
];
export interface ComponentSet {
  id: string;
  name: string;
  axes: Record<string, string[]>;
  variants: { componentId: string; values: Record<string, string> }[];
}
export function validateComponentModels(doc: Document) {
  if (doc.componentSets) {
    if (
      !Array.isArray(doc.componentSets) ||
      doc.componentSets.length > 2000 ||
      new Set(doc.componentSets.map((s) => s.id)).size !==
        doc.componentSets.length
    )
      throw Error("Invalid component sets");
    for (const set of doc.componentSets) {
      if (
        !set ||
        typeof set.id !== "string" ||
        typeof set.name !== "string" ||
        !set.axes ||
        typeof set.axes !== "object" ||
        Array.isArray(set.axes) ||
        Object.keys(set.axes).length > 32 ||
        !Array.isArray(set.variants) ||
        !set.variants.length ||
        set.variants.length > 2000
      )
        throw Error("Invalid component set");
      for (const [axis, values] of Object.entries(set.axes))
        if (
          !axis ||
          !Array.isArray(values) ||
          !values.length ||
          values.length > 2000 ||
          values.some((v) => typeof v !== "string") ||
          new Set(values).size !== values.length
        )
          throw Error("Invalid variant axis");
      const combinations = new Set<string>();
      const refs = new Set<string>();
      for (const variant of set.variants) {
        if (
          typeof variant.componentId !== "string" ||
          refs.has(variant.componentId) ||
          !variant.values ||
          Object.keys(variant.values).length !== Object.keys(set.axes).length ||
          Object.entries(set.axes).some(
            ([key, values]) => !values.includes(variant.values[key]),
          )
        )
          throw Error("Invalid component variant");
        refs.add(variant.componentId);
        const combination = JSON.stringify(
          Object.keys(set.axes)
            .sort()
            .map((k) => variant.values[k]),
        );
        if (combinations.has(combination))
          throw Error("Duplicate variant combination");
        combinations.add(combination);
      }
    }
  }
  for (const n of doc.nodes) {
    if (
      n.componentSlotKey !== undefined &&
      typeof n.componentSlotKey !== "string"
    )
      throw Error("Invalid component slot key");
    if (n.componentSlot !== undefined && typeof n.componentSlot !== "boolean")
      throw Error("Invalid component slot");
    const properties = n.componentProperties;
    if (properties) {
      if (
        !Array.isArray(properties) ||
        properties.length > 256 ||
        new Set(properties.map((p) => p.id)).size !== properties.length ||
        new Set(properties.map((p) => p.name)).size !== properties.length
      )
        throw Error("Invalid component properties");
      for (const p of properties)
        if (
          !p ||
          typeof p.id !== "string" ||
          !p.id ||
          typeof p.name !== "string" ||
          !p.name.trim() ||
          !["text", "boolean", "instance", "slot"].includes(p.type) ||
          typeof p.targetPath !== "string" ||
          p.targetPath.length > 10000 ||
          (p.additionalTargetPaths !== undefined &&
            (!Array.isArray(p.additionalTargetPaths) ||
              p.additionalTargetPaths.length > 1000 ||
              p.additionalTargetPaths.some(
                (v) => typeof v !== "string" || v.length > 10000,
              ) ||
              new Set(propertyPaths(p)).size !== propertyPaths(p).length)) ||
          (p.type === "boolean"
            ? typeof p.defaultValue !== "boolean"
            : typeof p.defaultValue !== "string") ||
          (p.preferred &&
            (!Array.isArray(p.preferred) ||
              p.preferred.length > 2000 ||
              p.preferred.some((v) => typeof v !== "string")))
        )
          throw Error("Invalid component property");
    }
    if (
      n.componentValues &&
      (!n.componentValues ||
        typeof n.componentValues !== "object" ||
        Array.isArray(n.componentValues) ||
        Object.keys(n.componentValues).length > 256 ||
        Object.values(n.componentValues).some(
          (v) => !["string", "boolean"].includes(typeof v),
        ))
    )
      throw Error("Invalid component values");
    if (n.componentSlots) {
      if (
        typeof n.componentSlots !== "object" ||
        Array.isArray(n.componentSlots) ||
        Object.keys(n.componentSlots).length > 256
      )
        throw Error("Invalid component slot content");
      for (const value of Object.values(n.componentSlots)) {
        if (!Array.isArray(value) || value.length > 10000)
          throw Error("Invalid component slot content");
      }
    }
  }
}
