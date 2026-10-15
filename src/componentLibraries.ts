import { inheritedModes } from "./typedVariables";
import {
  emptyDocument,
  validateDocument,
  descendants,
  id,
  relayout,
  type Document,
  type Node,
} from "./core";
import {
  componentDefinitions,
  componentTargets,
  synchronizeInstances,
} from "./components";
import { remapComponentMetadata } from "./componentRemap";
import type { ComponentSet } from "./componentModel";
export interface LibraryPackage {
  format: "baizefig-library";
  version: 1;
  id: string;
  name: string;
  revision: number;
  publishedAt: number;
  sourceDocumentId: string;
  components: { sourceId: string; name: string; nodes: Node[] }[];
  componentSets?: ComponentSet[];
  variables?: Document["variables"];
  variableCollections?: Document["variableCollections"];
  typedVariables?: Document["typedVariables"];
}
export interface LibrarySubscription {
  id: string;
  name: string;
  revision: number;
  enabled: boolean;
}
export function validateLibraryPackage(
  value: unknown,
): asserts value is LibraryPackage {
  const p = value as LibraryPackage;
  if (
    !p ||
    p.format !== "baizefig-library" ||
    p.version !== 1 ||
    typeof p.id !== "string" ||
    !p.id ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    typeof p.sourceDocumentId !== "string" ||
    !Number.isInteger(p.revision) ||
    p.revision < 1 ||
    !Number.isFinite(p.publishedAt) ||
    !Array.isArray(p.components) ||
    !p.components.length ||
    p.components.length > 2000 ||
    new Set(p.components.map((c) => c.sourceId)).size !== p.components.length
  )
    throw Error("Invalid BaizeFig component library");
  if (
    p.components.reduce(
      (sum, c) => sum + (Array.isArray(c.nodes) ? c.nodes.length : 0),
      0,
    ) > 50000
  )
    throw Error("Component library exceeds 50000 layers");
  const refs = new Set(p.components.map((c) => c.sourceId));
  for (const entry of p.components) {
    if (
      typeof entry.sourceId !== "string" ||
      typeof entry.name !== "string" ||
      !Array.isArray(entry.nodes) ||
      entry.nodes.filter((n) => !n.parentId).length !== 1
    )
      throw Error("Invalid component library definition");
    const d = emptyDocument();
    d.pages = [{ id: "library", name: "Library" }];
    d.nodes = entry.nodes;
    d.componentSets = p.componentSets;
    d.variables = p.variables;
    d.variableCollections = p.variableCollections;
    d.typedVariables = p.typedVariables;
    validateDocument(d);
    for (const n of entry.nodes)
      if (n.type === "instance" && n.componentId && !refs.has(n.componentId))
        throw Error("Library is missing a nested component dependency");
  }
  const graph = new Map(
    p.components.map((c) => [
      c.sourceId,
      new Set(
        c.nodes.flatMap((n) => [
          ...(n.componentId ? [n.componentId] : []),
          ...(n.componentProperties ?? [])
            .filter((p) => p.type === "instance")
            .map((p) => String(p.defaultValue)),
        ]),
      ),
    ]),
  );
  const visited = new Set<string>();
  function visit(ref: string, stack = new Set<string>()) {
    if (stack.has(ref) || stack.size > 40)
      throw Error("Cyclic component library dependency");
    if (visited.has(ref)) return;
    const children = graph.get(ref);
    if (!children)
      throw Error("Library is missing a nested component dependency");
    for (const child of children) visit(child, new Set(stack).add(ref));
    visited.add(ref);
  }
  for (const ref of graph.keys()) visit(ref);
  if (
    p.componentSets?.some((set) =>
      set.variants.some((v) => !refs.has(v.componentId)),
    )
  )
    throw Error("Library is missing a variant dependency");
}
export function publishLibrary(
  doc: Document,
  previous?: LibraryPackage,
  name = doc.name,
): LibraryPackage {
  validateDocument(doc);
  if (previous && previous.sourceDocumentId !== doc.id)
    throw Error("Publish this document as a new library");
  const definitions = componentDefinitions(doc);
  if (!definitions.length)
    throw Error("Create a component before publishing a library");
  const components = definitions.map((def) => ({
    sourceId: def.reference,
    name: def.name,
    nodes: componentTargets(doc, def.reference).map(({ node }) => {
      const n = structuredClone(node);
      n.pageId = "library";
      n.parentId = node.id === def.root.id ? null : n.parentId;
      if (node.id === def.root.id)
        n.variableModes = inheritedModes(doc, def.root);
      n.fidelity = {
        ...n.fidelity,
        size: n.fidelity?.size ?? [n.width, n.height],
        sourceId: n.fidelity?.sourceId ?? n.id,
      };
      delete n.componentOwner;
      delete n.componentPath;
      remapComponentMetadata(
        n,
        (p) => p,
        (ref) => ref,
        "library",
        new Map(),
      );
      return n;
    }),
  }));
  const pack: LibraryPackage = {
    format: "baizefig-library",
    version: 1,
    id: previous?.id ?? id(),
    name: name.trim(),
    revision: (previous?.revision ?? 0) + 1,
    publishedAt: Date.now(),
    sourceDocumentId: doc.id,
    components,
    componentSets: structuredClone(doc.componentSets),
    variables: structuredClone(doc.variables),
    variableCollections: structuredClone(doc.variableCollections),
    typedVariables: structuredClone(doc.typedVariables),
  };
  validateLibraryPackage(pack);
  return pack;
}
const namespace = (libraryId: string, reference: string) =>
  `library:${libraryId}:${encodeURIComponent(reference)}`;
export function useLibrary(
  original: Document,
  pack: LibraryPackage,
  replaceLocalEdits = false,
): Document {
  validateLibraryPackage(pack);
  const doc = structuredClone(original),
    previous =
      doc.componentLibrary?.filter((c) => c.libraryId === pack.id) ?? [];
  if (previous.some((c) => c.localEdits) && !replaceLocalEdits)
    throw Error(
      "This library has local main edits. Enable replacement to apply the published version.",
    );
  const refs = new Map(
      pack.components.map((c) => [c.sourceId, namespace(pack.id, c.sourceId)]),
    ),
    reference = (value: string) => refs.get(value) ?? value;
  const varPrefix = `library:${pack.id}:variable:`,
    collectionPrefix = `library:${pack.id}:collection:`,
    varRef = (v: string) => varPrefix + encodeURIComponent(v),
    colRef = (v: string) => collectionPrefix + encodeURIComponent(v),
    modeRef = (col: string | undefined, mode: string) =>
      collectionPrefix +
      encodeURIComponent(col ?? "") +
      ":mode:" +
      encodeURIComponent(mode);
  const values = (
    value: Record<string, any> | undefined,
    col: string | undefined,
  ) =>
    value
      ? Object.fromEntries(
          Object.entries(value).map(([mode, entry]) => [
            modeRef(col, mode),
            "alias" in entry
              ? { alias: varRef(entry.alias) }
              : structuredClone(entry),
          ]),
        )
      : undefined;
  const collections = (pack.variableCollections ?? []).map((c) => ({
    ...structuredClone(c),
    id: colRef(c.id),
    activeMode: modeRef(c.id, c.activeMode),
    modes: c.modes.map((m) => ({ ...m, id: modeRef(c.id, m.id) })),
  }));
  const variables = (pack.variables ?? []).map((v) => ({
    ...structuredClone(v),
    id: varRef(v.id),
    collectionId: v.collectionId ? colRef(v.collectionId) : undefined,
    values: values(v.values, v.collectionId),
  }));
  const typed = (pack.typedVariables ?? []).map((v) => ({
    ...structuredClone(v),
    id: varRef(v.id),
    collectionId: v.collectionId ? colRef(v.collectionId) : undefined,
    values: values(v.values, v.collectionId),
  }));
  const mergeById = <T extends { id: string }>(
    old: T[] | undefined,
    next: T[],
  ) => [
    ...(old ?? []).filter((v) => !next.some((n) => n.id === v.id)),
    ...next,
  ];
  doc.variableCollections = mergeById(doc.variableCollections, collections);
  doc.variables = mergeById(doc.variables, variables);
  doc.typedVariables = mergeById(doc.typedVariables, typed);
  function remapVariables(n: Partial<Node>) {
    if (n.variableId) n.variableId = varRef(n.variableId);
    if (n.bindings)
      n.bindings = Object.fromEntries(
        Object.entries(n.bindings).map(([key, value]) => [key, varRef(value)]),
      );
    if (n.variableModes)
      n.variableModes = Object.fromEntries(
        Object.entries(n.variableModes).map(([col, mode]) => [
          colRef(col),
          modeRef(col, mode),
        ]),
      );
    for (const value of Object.values(n.componentSlots ?? {}).flat())
      remapVariables(value);
    for (const patch of Object.values(n.componentOverrides ?? {}))
      remapVariables(patch);
  }
  const entries = pack.components.map((c) => {
    const nodes = structuredClone(c.nodes).sort(
      (a, b) => Number(!!a.parentId) - Number(!!b.parentId),
    );
    for (const n of nodes) {
      n.pageId = doc.pages[0].id;
      remapVariables(n);
      if (n.componentId) n.componentId = reference(n.componentId);
      remapComponentMetadata(
        n,
        (p) => p,
        reference,
        doc.pages[0].id,
        new Map(),
      );
    }
    nodes[0].fidelity = {
      ...nodes[0].fidelity,
      size: nodes[0].fidelity?.size ?? [nodes[0].width, nodes[0].height],
      sourceId: reference(c.sourceId),
    };
    return {
      sourceId: reference(c.sourceId),
      name: c.name,
      nodes,
      libraryId: pack.id,
      libraryRevision: pack.revision,
      missing: false,
      localEdits: false,
    };
  });
  const liveRefs = new Set(entries.map((e) => e.sourceId));
  doc.componentLibrary = [
    ...(doc.componentLibrary ?? []).filter((c) => c.libraryId !== pack.id),
    ...entries,
    ...previous
      .filter((c) => !liveRefs.has(c.sourceId))
      .map((c) => ({ ...c, missing: true, libraryRevision: pack.revision })),
  ];
  doc.libraries = [
    ...(doc.libraries ?? []).filter((s) => s.id !== pack.id),
    { id: pack.id, name: pack.name, revision: pack.revision, enabled: true },
  ];
  const prefix = `library:${pack.id}:set:`;
  doc.componentSets = [
    ...(doc.componentSets ?? []).filter((s) => !s.id.startsWith(prefix)),
    ...(pack.componentSets ?? []).map((s) => ({
      ...structuredClone(s),
      id: prefix + encodeURIComponent(s.id),
      variants: s.variants.map((v) => ({
        ...v,
        componentId: reference(v.componentId),
      })),
    })),
  ];
  // Refresh editable local mains as well as their cached definitions; preserve identity and placement.
  for (const main of [...doc.nodes].filter(
    (n) =>
      n.type === "component" &&
      entries.some((e) => e.sourceId === n.fidelity?.sourceId),
  )) {
    const entry = entries.find((e) => e.sourceId === main.fidelity?.sourceId)!,
      oldIds = new Set(descendants(doc, [main.id])),
      family = doc.nodes.filter((n) => oldIds.has(n.id)),
      map = new Map(
        entry.nodes.map((n, i) => [
          n.id,
          i === 0
            ? main.id
            : (family.find(
                (old) =>
                  (old.fidelity?.sourceId ?? old.id) ===
                  (n.fidelity?.sourceId ?? n.id),
              )?.id ?? id()),
        ]),
      );
    const refreshed = entry.nodes.map((n) => {
      const clone = structuredClone(n);
      clone.id = map.get(n.id)!;
      clone.pageId = main.pageId;
      clone.parentId = n.parentId
        ? (map.get(n.parentId) ?? null)
        : main.parentId;
      if (!n.parentId) {
        clone.x = main.x;
        clone.y = main.y;
        clone.rotation = main.rotation;
        clone.name = main.name;
      }
      return clone;
    });
    const index = doc.nodes.indexOf(main);
    doc.nodes = doc.nodes.filter((n) => !oldIds.has(n.id));
    doc.nodes.splice(index, 0, ...refreshed);
  }
  synchronizeInstances(doc);
  relayout(doc, new Set(doc.nodes.map((n) => n.id)));
  validateDocument(doc);
  return doc;
}
export function toggleLibrary(
  original: Document,
  libraryId: string,
  enabled: boolean,
) {
  const doc = structuredClone(original);
  const subscription = doc.libraries?.find((s) => s.id === libraryId);
  if (!subscription) throw Error("Missing library subscription");
  subscription.enabled = enabled;
  return doc;
}
export function availableLibraryEntries(doc: Document) {
  return (doc.componentLibrary ?? []).filter(
    (c) =>
      !c.missing &&
      (!c.libraryId ||
        doc.libraries?.find((s) => s.id === c.libraryId)?.enabled !== false),
  );
}
