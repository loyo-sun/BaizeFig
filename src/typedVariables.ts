import { type Document, type Node, ancestors, relayout } from "./core";
import { applyConstraints } from "./layout";
import { reflowText } from "./textLayout";
export type Scalar = number | string | boolean;
export interface TypedVariable {
  id: string;
  name: string;
  type: "number" | "string" | "boolean";
  collectionId?: string;
  value: Scalar;
  values?: Record<string, { value: Scalar } | { alias: string }>;
}
export type BindingProperty =
  | "width"
  | "height"
  | "x"
  | "y"
  | "rotation"
  | "opacity"
  | "radius"
  | "strokeWidth"
  | "fontSize"
  | "fontFamily"
  | "text"
  | "visible"
  | "gap";
export const bindingTypes: Record<BindingProperty, TypedVariable["type"]> = {
  width: "number",
  height: "number",
  x: "number",
  y: "number",
  rotation: "number",
  opacity: "number",
  radius: "number",
  strokeWidth: "number",
  fontSize: "number",
  fontFamily: "string",
  text: "string",
  visible: "boolean",
  gap: "number",
};
export function inheritedModes(
  doc: Document,
  node: Node,
): Record<string, string> {
  const result = { ...node.variableModes },
    seen = new Set([node.id]);
  let parent = node.parentId;
  while (parent) {
    const p = [
      ...doc.nodes,
      ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
    ].find((n) => n.id === parent);
    if (!p || seen.has(p.id)) break;
    seen.add(p.id);
    for (const [set, mode] of Object.entries(p.variableModes ?? {}))
      if (!(set in result)) result[set] = mode;
    parent = p.parentId;
  }
  return result;
}
export function resolveTypedVariable(
  doc: Document,
  id: string,
  modes: Record<string, string> = {},
  seen = new Set<string>(),
): Scalar {
  if (seen.has(id) || seen.size > 100) throw Error("Cyclic variable alias");
  seen.add(id);
  const v = doc.typedVariables?.find((v) => v.id === id);
  if (!v) throw Error("Missing variable alias");
  const collection = doc.variableCollections?.find(
      (c) => c.id === v.collectionId,
    ),
    mode = modes[v.collectionId ?? ""] ?? collection?.activeMode;
  const entry = v.values?.[mode ?? ""] ?? Object.values(v.values ?? {})[0];
  const value = entry
    ? "alias" in entry
      ? resolveTypedVariable(doc, entry.alias, modes, seen)
      : entry.value
    : v.value;
  if (
    typeof value !== v.type &&
    (v.type !== "number" || typeof value !== "number")
  )
    throw Error("Invalid variable values");
  return value;
}
export function applyTypedBindings(doc: Document): void {
  for (const node of [
    ...doc.nodes,
    ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
  ]) {
    if (!Object.keys(node.bindings ?? {}).length) continue;
    const modes = inheritedModes(doc, node);
    let textChanged = false;
    for (const [property, id] of Object.entries(node.bindings ?? {})) {
      const expected = bindingTypes[property as BindingProperty];
      if (!expected) throw Error("Invalid variable binding");
      const value = resolveTypedVariable(doc, id, modes);
      if (typeof value !== expected) throw Error("Invalid variable binding");
      if (
        typeof value === "number" &&
        (!Number.isFinite(value) ||
          ([
            "width",
            "height",
            "radius",
            "strokeWidth",
            "fontSize",
            "gap",
          ].includes(property) &&
            value < 0) ||
          (property === "opacity" && (value < 0 || value > 1)))
      )
        throw Error("Invalid variable binding");
      if (
        ["text", "fontSize", "fontFamily", "width"].includes(property) &&
        (node as any)[property] !== value
      )
        textChanged = true;
      (node as any)[property] = value;
    }
    if (textChanged) reflowText(node);
  }
}
export function reflowVariableGeometry(before: Document, doc: Document): void {
  const affected = new Set<string>(),
    beforeById = new Map(before.nodes.map((n) => [n.id, n]));
  for (const node of doc.nodes) {
    const old = beforeById.get(node.id);
    if (
      old &&
      ["x", "y", "width", "height", "text", "visible"].some(
        (k) => (old as any)[k] !== (node as any)[k],
      )
    ) {
      affected.add(node.id);
      ancestors(doc, node).forEach((n) => affected.add(n.id));
    }
  }
  applyConstraints(before, doc);
  relayout(doc, affected);
}
export function validateTypedVariables(doc: Document): void {
  const vars = doc.typedVariables ?? [];
  if (
    !Array.isArray(vars) ||
    vars.length > 50000 ||
    new Set(vars.map((v) => v.id)).size !== vars.length
  )
    throw Error("Invalid variable values");
  for (const v of vars) {
    if (
      typeof v.id !== "string" ||
      typeof v.name !== "string" ||
      !["number", "string", "boolean"].includes(v.type) ||
      typeof v.value !== v.type ||
      (typeof v.value === "number" && !Number.isFinite(v.value)) ||
      (v.collectionId &&
        !doc.variableCollections?.some((c) => c.id === v.collectionId))
    )
      throw Error("Invalid variable values");
    if (v.values && (typeof v.values !== "object" || Array.isArray(v.values)))
      throw Error("Invalid variable values");
    for (const entry of Object.values(v.values ?? {}))
      if (
        !entry ||
        typeof entry !== "object" ||
        ("alias" in entry
          ? !vars.some((a) => a.id === entry.alias && a.type === v.type)
          : typeof entry.value !== v.type ||
            (typeof entry.value === "number" && !Number.isFinite(entry.value)))
      )
        throw Error("Invalid variable values");
    resolveTypedVariable(doc, v.id);
  }
  for (const n of doc.nodes) {
    if (
      n.variableModes &&
      (typeof n.variableModes !== "object" ||
        Array.isArray(n.variableModes) ||
        Object.entries(n.variableModes).some(
          ([set, mode]) =>
            !doc.variableCollections?.some(
              (c) => c.id === set && c.modes.some((m) => m.id === mode),
            ),
        ))
    )
      throw Error("Invalid variable mode");
    if (
      n.bindings &&
      (typeof n.bindings !== "object" ||
        Array.isArray(n.bindings) ||
        Object.entries(n.bindings).some(
          ([key, id]) =>
            !vars.some(
              (v) =>
                v.id === id && v.type === bindingTypes[key as BindingProperty],
            ),
        ))
    )
      throw Error("Invalid variable binding");
  }
}
export function editTypedVariable(
  original: Document,
  id: string,
  value: Scalar,
): Document {
  const doc = structuredClone(original),
    variable = doc.typedVariables?.find((v) => v.id === id);
  if (
    !variable ||
    typeof value !== variable.type ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    throw Error("Invalid variable values");
  const collection = doc.variableCollections?.find(
    (c) => c.id === variable.collectionId,
  );
  variable.value = value;
  if (variable.values && collection)
    variable.values[collection.activeMode] = { value };
  applyTypedBindings(doc);
  reflowVariableGeometry(original, doc);
  return doc;
}
