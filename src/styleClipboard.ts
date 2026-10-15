import {
  ancestors,
  execute,
  makeNode,
  validateDocument,
  emptyDocument,
  type Document,
  type Node,
  type Kind,
} from "./core";
const fields = [
  "fill",
  "stroke",
  "strokeWidth",
  "radius",
  "opacity",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "textAlign",
  "lineHeight",
] as const;
const fidelityFields = [
  "paints",
  "effects",
  "blendMode",
  "corners",
  "strokeAlign",
  "strokeMiterLimit",
  "strokeDash",
  "strokeDashOffset",
  "strokeCap",
  "strokeJoin",
] as const;
export interface StyleProperties {
  values: Partial<Node>;
  fidelity: Partial<NonNullable<Node["fidelity"]>>;
  text: boolean;
  letterSpacing?: number;
}
export function copyProperties(node: Node): StyleProperties {
  const values: Partial<Node> = {};
  for (const k of fields) Object.assign(values, { [k]: node[k] });
  const fidelity: StyleProperties["fidelity"] = {};
  for (const k of fidelityFields)
    if (node.fidelity?.[k] !== undefined)
      Object.assign(fidelity, { [k]: structuredClone(node.fidelity[k]) });
  return {
    values,
    fidelity,
    text: node.type === "text",
    letterSpacing: node.textFlow?.letterSpacing,
  };
}
export function propertyPatch(
  node: Node,
  style: StyleProperties,
): Partial<Node> {
  const patch: Partial<Node> = {};
  for (const key of fields)
    if (
      (style.text && node.type === "text") ||
      ![
        "fontSize",
        "fontFamily",
        "fontWeight",
        "textAlign",
        "lineHeight",
      ].includes(key)
    )
      if (style.values[key] !== undefined)
        Object.assign(patch, { [key]: style.values[key] });
  const fidelity: NonNullable<Node["fidelity"]> = {
    size: [Math.max(1, node.width), Math.max(1, node.height)],
    ...node.fidelity,
  };
  for (const k of fidelityFields) delete fidelity[k];
  Object.assign(fidelity, structuredClone(style.fidelity));
  // Retain paint values when the update engine clears color-variable bindings.
  patch.fidelity = fidelity;
  patch.variableId = undefined;
  patch.bindings = { ...node.bindings };
  for (const key of Object.keys(patch.bindings))
    if (key in patch) delete patch.bindings[key as keyof typeof patch.bindings];
  if (style.text && node.type === "text" && style.letterSpacing !== undefined)
    patch.textFlow = {
      ...(node.textFlow ?? { autoResize: "height", verticalAlign: "top" }),
      letterSpacing: style.letterSpacing,
      runs: undefined,
    };
  return patch;
}
export function pasteProperties(
  doc: Document,
  ids: string[],
  style: StyleProperties,
): Document {
  let next = doc;
  for (const id of ids) {
    const n = next.nodes.find((n) => n.id === id);
    if (!n || n.locked || ancestors(next, n).some((p) => p.locked)) continue;
    next = execute(next, {
      type: "update",
      ids: [id],
      patch: propertyPatch(n, style),
    }).doc;
  }
  return next;
}
export const DEFAULT_STYLES_KEY = "baizefig.tool-default-styles.v1";
export function readDefaultStyles(): Partial<Record<Kind, StyleProperties>> {
  try {
    const stored = JSON.parse(localStorage.getItem(DEFAULT_STYLES_KEY) ?? "{}"),
      result: Partial<Record<Kind, StyleProperties>> = {};
    for (const [kind, value] of Object.entries(stored)) {
      if (
        ![
          "rectangle",
          "ellipse",
          "frame",
          "text",
          "line",
          "path",
          "star",
          "polygon",
        ].includes(kind)
      )
        continue;
      const d = emptyDocument(),
        n = makeNode(kind as Kind, d.pages[0].id);
      const style = value as StyleProperties;
      if (
        !style ||
        !style.values ||
        !style.fidelity ||
        (style.values.fontSize !== undefined && style.values.fontSize <= 0) ||
        (style.values.lineHeight !== undefined && style.values.lineHeight <= 0)
      )
        throw Error("Invalid default style");
      const patch = propertyPatch(n, style);
      d.nodes.push({ ...n, ...patch });
      validateDocument(d);
      result[kind as Kind] = copyProperties(d.nodes[0]);
    }
    return result;
  } catch {
    return {};
  }
}
