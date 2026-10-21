import { applyCompositeBindings } from "./compositeTokens";
import { equalData } from "./equalData";
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
  | "gap"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "paragraphSpacing"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "cornerTopLeft"
  | "cornerTopRight"
  | "cornerBottomRight"
  | "cornerBottomLeft"
  | "counterGap"
  | "minWidth"
  | "maxWidth"
  | "minHeight"
  | "maxHeight";
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
  fontWeight: "number",
  lineHeight: "number",
  letterSpacing: "number",
  paragraphSpacing: "number",
  paddingTop: "number",
  paddingRight: "number",
  paddingBottom: "number",
  paddingLeft: "number",
  cornerTopLeft: "number",
  cornerTopRight: "number",
  cornerBottomRight: "number",
  cornerBottomLeft: "number",
  counterGap: "number",
  minWidth: "number",
  maxWidth: "number",
  minHeight: "number",
  maxHeight: "number",
};
const paddingKeys = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];
const cornerKeys = [
  "cornerTopLeft",
  "cornerTopRight",
  "cornerBottomRight",
  "cornerBottomLeft",
];
export function bindingValue(node: Node, property: string): unknown {
  const padding = paddingKeys.indexOf(property),
    corner = cornerKeys.indexOf(property);
  if (padding >= 0)
    return node.importedLayout?.padding[padding] ?? node.padding ?? 16;
  if (corner >= 0) return node.fidelity?.corners?.[corner] ?? node.radius;
  if (property === "counterGap")
    return node.importedLayout?.counterGap ?? node.gap ?? 12;
  if (property === "letterSpacing")
    return (
      node.textFlow?.letterSpacing ?? node.fidelity?.text?.letterSpacing ?? 0
    );
  if (property === "paragraphSpacing")
    return node.textFlow?.paragraphSpacing ?? 0;
  if (["minWidth", "maxWidth", "minHeight", "maxHeight"].includes(property))
    return node.layoutItem?.[property as "minWidth"];
  return (node as unknown as Record<string, unknown>)[property];
}
function setBindingValue(node: Node, property: string, value: Scalar) {
  const padding = paddingKeys.indexOf(property),
    corner = cornerKeys.indexOf(property);
  if (padding >= 0 || property === "counterGap") {
    node.importedLayout = {
      padding: [
        node.padding ?? 16,
        node.padding ?? 16,
        node.padding ?? 16,
        node.padding ?? 16,
      ],
      primary: "fixed",
      counter: "fixed",
      justify: "start",
      align: "start",
      ...node.importedLayout,
    };
    if (padding >= 0) {
      node.importedLayout.padding = [...node.importedLayout.padding];
      node.importedLayout.padding[padding] = value as number;
    } else node.importedLayout.counterGap = value as number;
  } else if (corner >= 0) {
    node.fidelity = {
      size: [node.width, node.height],
      ...node.fidelity,
      corners: [
        ...(node.fidelity?.corners ?? [
          node.radius,
          node.radius,
          node.radius,
          node.radius,
        ]),
      ] as [number, number, number, number],
    };
    node.fidelity.corners![corner] = value as number;
  } else if (["letterSpacing", "paragraphSpacing"].includes(property)) {
    node.textFlow = {
      autoResize: "fixed",
      verticalAlign: "top",
      letterSpacing: node.fidelity?.text?.letterSpacing ?? 0,
      runs: node.fidelity?.text?.spans,
      ...node.textFlow,
      [property]: value,
    };
  } else if (
    ["minWidth", "maxWidth", "minHeight", "maxHeight"].includes(property)
  )
    node.layoutItem = { ...node.layoutItem, [property]: value };
  else (node as unknown as Record<string, unknown>)[property] = value;
}
export function releaseEditedBindings(node: Node, patch: Partial<Node>) {
  if (!node.bindings || "bindings" in patch) return;
  const changed = { ...node, ...patch };
  for (const property of Object.keys(node.bindings))
    if (
      property in patch ||
      bindingValue(node, property) !== bindingValue(changed, property) ||
      ("radius" in patch && cornerKeys.includes(property))
    )
      delete node.bindings[property as BindingProperty];
}
export function canBindProperty(node: Node, property: string): boolean {
  if (
    [
      "fontSize",
      "fontFamily",
      "fontWeight",
      "text",
      "lineHeight",
      "letterSpacing",
      "paragraphSpacing",
    ].includes(property)
  )
    return node.type === "text";
  if (
    paddingKeys.includes(property) ||
    ["gap", "counterGap"].includes(property)
  )
    return !!node.layout && node.layout !== "none";
  if (cornerKeys.includes(property))
    return ["rectangle", "frame", "component", "instance", "image"].includes(
      node.type,
    );
  return true;
}
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
            "paragraphSpacing",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
            "counterGap",
            "cornerTopLeft",
            "cornerTopRight",
            "cornerBottomRight",
            "cornerBottomLeft",
            "minWidth",
            "maxWidth",
            "minHeight",
            "maxHeight",
          ].includes(property) &&
            value < 0) ||
          (property === "opacity" && (value < 0 || value > 1)) ||
          (property === "fontWeight" && (value < 1 || value > 1000)) ||
          (property === "lineHeight" && value <= 0) ||
          (property === "paragraphSpacing" && value > 10000))
      )
        throw Error("Invalid variable binding");
      if (
        [
          "text",
          "fontSize",
          "fontFamily",
          "fontWeight",
          "lineHeight",
          "letterSpacing",
          "paragraphSpacing",
          "width",
        ].includes(property) &&
        bindingValue(node, property) !== value
      )
        textChanged = true;
      setBindingValue(node, property, value);
    }
    if (textChanged) reflowText(node);
    const item = node.layoutItem;
    if (
      item &&
      ((item.minWidth ?? 0) > (item.maxWidth ?? Infinity) ||
        (item.minHeight ?? 0) > (item.maxHeight ?? Infinity))
    )
      throw Error("Invalid variable binding");
  }
}
export function reflowVariableGeometry(before: Document, doc: Document): void {
  const affected = new Set<string>(),
    beforeById = new Map(before.nodes.map((n) => [n.id, n]));
  for (const node of doc.nodes) {
    const old = beforeById.get(node.id);
    if (
      old &&
      (["x", "y", "width", "height", "text", "visible", "gap"].some(
        (k) => (old as any)[k] !== (node as any)[k],
      ) ||
        !equalData(old.importedLayout, node.importedLayout))
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
  applyCompositeBindings(doc);
  applyTypedBindings(doc);
  reflowVariableGeometry(original, doc);
  return doc;
}
