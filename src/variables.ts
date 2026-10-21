import {
  applyCompositeBindings,
  freezeCompositeReferences,
} from "./compositeTokens";
import {
  inheritedModes,
  applyTypedBindings,
  reflowVariableGeometry,
} from "./typedVariables";
import type { Node } from "./core";
import type { Document } from "./core";
export interface VariableCollection {
  id: string;
  name: string;
  modes: { id: string; name: string }[];
  activeMode: string;
}
export interface ColorVariable {
  id: string;
  name: string;
  value: string;
  collectionId?: string;
  values?: Record<string, { color: string } | { alias: string }>;
}
export function resolveVariable(
  doc: Document,
  id: string,
  seen = new Set<string>(),
  node?: Node,
): string {
  if (seen.has(id) || seen.size > 100) throw Error("Cyclic variable alias");
  seen.add(id);
  const v = doc.variables?.find((v) => v.id === id);
  if (!v) throw Error("Missing variable alias");
  const collection = doc.variableCollections?.find(
    (c) => c.id === v.collectionId,
  );
  const entry =
    v.values?.[
      (node ? inheritedModes(doc, node)[collection?.id ?? ""] : undefined) ??
        collection?.activeMode ??
        ""
    ] ?? Object.values(v.values ?? {})[0];
  if (!entry) return v.value;
  return "alias" in entry
    ? resolveVariable(doc, entry.alias, seen, node)
    : entry.color;
}
const designNodes = (doc: Document) => [
  ...doc.nodes,
  ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
];
export function setVariableMode(
  original: Document,
  collectionId: string,
  modeId: string,
): Document {
  const doc = structuredClone(original),
    collection = doc.variableCollections?.find((c) => c.id === collectionId);
  if (!collection || !collection.modes.some((m) => m.id === modeId))
    throw Error("Invalid variable mode");
  collection.activeMode = modeId;
  for (const variable of doc.variables ?? [])
    variable.value = resolveVariable(doc, variable.id);
  for (const node of designNodes(doc))
    if (node.variableId)
      node.fill = resolveVariable(doc, node.variableId, new Set(), node);
  const previous = structuredClone(doc);
  applyCompositeBindings(doc);
  applyTypedBindings(doc);
  reflowVariableGeometry(previous, doc);
  return doc;
}
function refresh(doc: Document): Document {
  for (const v of doc.variables ?? []) v.value = resolveVariable(doc, v.id);
  for (const n of designNodes(doc))
    if (n.variableId) n.fill = resolveVariable(doc, n.variableId, new Set(), n);
  const previous = structuredClone(doc);
  applyCompositeBindings(doc);
  applyTypedBindings(doc);
  reflowVariableGeometry(previous, doc);
  return doc;
}
export function editVariableColor(
  original: Document,
  id: string,
  color: string,
): Document {
  if (!/^#[\da-f]{6}([\da-f]{2})?$/i.test(color))
    throw Error("Invalid color variable");
  const doc = structuredClone(original),
    v = doc.variables?.find((v) => v.id === id);
  if (!v) throw Error("Missing variable alias");
  const mode = doc.variableCollections?.find(
    (c) => c.id === v.collectionId,
  )?.activeMode;
  v.value = color;
  if (v.values && mode) v.values[mode] = { color };
  return refresh(doc);
}
export function removeVariable(original: Document, id: string): Document {
  const doc = structuredClone(original),
    v = doc.variables?.find((v) => v.id === id);
  if (!v) return doc;
  freezeCompositeReferences(doc, id);
  for (const dependent of doc.variables ?? [])
    for (const [mode, value] of Object.entries(dependent.values ?? {}))
      if ("alias" in value && value.alias === id) {
        const collection = doc.variableCollections?.find(
          (c) => c.id === dependent.collectionId,
        );
        const previous = collection?.activeMode;
        if (collection && collection.modes.some((m) => m.id === mode))
          collection.activeMode = mode;
        try {
          dependent.values![mode] = { color: resolveVariable(doc, id) };
        } finally {
          if (collection && previous) collection.activeMode = previous;
        }
      }
  doc.variables = doc.variables?.filter((v) => v.id !== id);
  for (const n of designNodes(doc))
    if (n.variableId === id) delete n.variableId;
  return refresh(doc);
}
