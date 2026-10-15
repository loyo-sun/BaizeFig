import { relayout, validateDocument, ancestors } from "./core";
import { applyConstraints } from "./layout";
import { reflowText } from "./textLayout";
import type { ComponentProperty, ComponentSet } from "./componentModel";
import type { Document, Node } from "./core";

function finalized(original: Document, doc: Document) {
  const affected = new Set<string>();
  for (const n of doc.nodes) {
    const old = original.nodes.find((p) => p.id === n.id);
    if (
      !old ||
      [
        "width",
        "height",
        "text",
        "layout",
        "importedLayout",
        "layoutItem",
      ].some(
        (k) =>
          JSON.stringify((old as any)[k]) !== JSON.stringify((n as any)[k]),
      )
    ) {
      affected.add(n.id);
      for (const p of ancestors(doc, n)) affected.add(p.id);
    }
  }
  applyConstraints(original, doc);
  relayout(doc, affected);
  validateDocument(doc);
  return doc;
}
type Patch = Partial<Node>;
const fixed = new Set([
  "id",
  "pageId",
  "parentId",
  "componentOwner",
  "componentPath",
  "componentOverrides",
  "componentClears",
  "componentValues",
  "componentSlots",
  "componentSlot",
  "componentSlotKey",
  "componentProperties",
]);
const properties = (n: Node): Patch =>
  Object.fromEntries(
    Object.entries(n).filter(([key]) => !fixed.has(key)),
  ) as Patch;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const key = (n: Node) =>
  encodeURIComponent(n.componentSlotKey ?? n.fidelity?.sourceId ?? n.id);
function children(nodes: Node[], parent: string) {
  return nodes.filter((n) => n.parentId === parent);
}
function paths(nodes: Node[], root: Node) {
  const result = new Map<string, Node>();
  function walk(n: Node, path: string) {
    result.set(path, n);
    const counts = new Map<string, number>();
    for (const c of children(nodes, n.id)) {
      const k = key(c),
        index = counts.get(k) ?? 0;
      counts.set(k, index + 1);
      walk(c, path + "/" + k + "#" + index);
    }
  }
  walk(root, "");
  return result;
}
function definition(
  doc: Document,
  reference: string,
): { nodes: Node[]; root: Node } | undefined {
  const lib = doc.componentLibrary?.find((c) => c.sourceId === reference);
  if (lib) {
    const root = lib.nodes.find((n) => !n.parentId);
    if (root) return { nodes: lib.nodes, root };
  }
  const root = doc.nodes.find(
    (n) => n.id === reference && n.type === "component",
  );
  if (root) return { nodes: doc.nodes, root };
}
function diff(current: Node, base: Node): Patch {
  const patch: Patch = {};
  for (const [k, v] of Object.entries(properties(current))) {
    if (k === "type" || k === "fidelity") continue;
    if (!same(v, (base as any)[k])) (patch as any)[k] = structuredClone(v);
  }
  // Fidelity is merged by individual fields to keep new geometry from the source.
  if (current.fidelity && base.fidelity) {
    const f: any = {};
    for (const [k, v] of Object.entries(current.fidelity))
      if (
        !["sourceId", "componentSourceId"].includes(k) &&
        !same(v, (base.fidelity as any)[k])
      )
        f[k] = structuredClone(v);
    if (Object.keys(f).length) patch.fidelity = f;
  }
  return patch;
}
function merge(n: Node, patch?: Patch): Node {
  if (!patch) return n;
  const next = { ...n, ...structuredClone(patch) };
  if (patch.fidelity) next.fidelity = { ...n.fidelity!, ...patch.fidelity };
  return next;
}
function expanded(
  doc: Document,
  instance: Node,
  previous: Node[],
  stack = new Set<string>(),
): Node[] {
  const ref = instance.componentId,
    def = ref && definition(doc, ref);
  if (!def) return previous;
  if (stack.has(ref!) || stack.size > 40)
    throw Error("Cyclic component reference");
  const chain = new Set(stack).add(ref!);
  const old = paths(
      previous,
      previous.find((n) => n.id === instance.id) ?? instance,
    ),
    out: Node[] = [];
  for (const n of previous)
    if (n.componentOwner === instance.id && n.componentPath !== undefined)
      old.set(n.componentPath, n);
  const overrides = instance.componentOverrides ?? {};
  const properties = def.root.componentProperties ?? [];
  const values = instance.componentValues ?? {};
  function clearFields(node: Node, path: string) {
    for (const field of instance.componentClears?.[path] ?? []) {
      if (field === "variableId") delete node.variableId;
      if (field === "fidelity.paints" && node.fidelity)
        delete node.fidelity.paints;
    }
    return node;
  }
  function walk(
    base: Node,
    path: string,
    parentId: string | null,
    nodes: Node[],
    nestedOverrides: Record<string, Patch> = {},
    nestedPath = "",
    resolved = false,
  ) {
    const oldNode =
        old.get(path) ??
        (path.includes("/$slot/")
          ? previous.find((n) => n.id === base.id)
          : undefined),
      id = path === "" ? instance.id : (oldNode?.id ?? crypto.randomUUID());
    let node = merge(
      merge(structuredClone(base), nestedOverrides[nestedPath]),
      overrides[path],
    );
    clearFields(node, path);
    for (const property of properties.filter((p) => p.targetPath === path)) {
      const value = values[property.id] ?? property.defaultValue;
      if (Object.hasOwn(values, property.id) && node.bindings) {
        if (property.type === "text") delete node.bindings.text;
        if (property.type === "boolean") delete node.bindings.visible;
      }
      if (
        property.type === "text" &&
        node.type === "text" &&
        typeof value === "string"
      )
        node.text = value;
      if (property.type === "boolean" && typeof value === "boolean")
        node.visible = value;
      if (
        property.type === "instance" &&
        node.type === "instance" &&
        typeof value === "string"
      )
        node.componentId = value;
      if (property.type === "slot") node.componentSlot = true;
    }
    node = {
      ...node,
      id,
      pageId: instance.pageId,
      parentId,
      componentOwner: instance.id,
      componentPath: path,
    };
    if (path === "") {
      node = {
        ...node,
        fidelity:
          node.fidelity || instance.fidelity
            ? {
                ...node.fidelity!,
                sourceId:
                  instance.fidelity?.sourceId ?? node.fidelity?.sourceId,
              }
            : undefined,
        type: "instance",
        componentId: ref,
        componentOwner: instance.id,
        componentOverrides: structuredClone(overrides),
        componentValues: structuredClone(instance.componentValues),
        componentSlots: structuredClone(instance.componentSlots),
        componentClears: structuredClone(instance.componentClears),
        x: instance.x,
        y: instance.y,
        rotation: instance.rotation,
        name: instance.name,
      };
    }
    if (
      node.type === "text" &&
      node.textFlow &&
      [
        "text",
        "fontSize",
        "fontFamily",
        "fontWeight",
        "width",
        "lineHeight",
      ].some((k) => !same(((oldNode ?? base) as any)[k], (node as any)[k]))
    )
      reflowText(node);
    out.push(node);
    let source = nodes,
      sourceRoot = base,
      localOverrides = nestedOverrides,
      localPath = nestedPath;
    if (
      !resolved &&
      path !== "" &&
      base.type === "instance" &&
      node.componentId
    ) {
      const target = definition(doc, node.componentId!);
      if (target) {
        if (chain.has(node.componentId!))
          throw Error("Cyclic component reference");
        const virtual = {
          ...node,
          id: node.id,
          parentId: node.parentId,
          pageId: node.pageId,
        };
        const nested = expanded(
          doc,
          virtual,
          [virtual, ...nodes.filter((n) => n.parentId === base.id)],
          chain,
        );
        const nestedRoot = nested.find((n) => n.id === virtual.id)!;
        node = merge(
          {
            ...nestedRoot,
            visible: node.visible,
            id: node.id,
            parentId: node.parentId,
            componentOwner: instance.id,
            componentPath: path,
          },
          overrides[path],
        );
        clearFields(node, path);
        out[out.length - 1] = node;
        source = nested;
        sourceRoot = node;
        localOverrides = {};
        localPath = "";
        resolved = true;
      }
    }
    const slotContent = instance.componentSlots?.[path];
    if (node.componentSlot && slotContent) {
      source = slotContent;
      sourceRoot = { ...node, id: "__slot_root__" };
      localOverrides = {};
      localPath = "";
    }
    const counts = new Map<string, number>();
    const sourceChildren =
      node.componentSlot && slotContent
        ? source.filter((n) => !n.parentId)
        : children(source, sourceRoot.id);
    for (const child of sourceChildren) {
      const k = key(child),
        index = counts.get(k) ?? 0;
      counts.set(k, index + 1);
      const suffix =
        (node.componentSlot && slotContent ? "/$slot/" : "/") + k + "#" + index;
      walk(
        child,
        path + suffix,
        node.id,
        source,
        localOverrides,
        localPath + suffix,
        resolved,
      );
    }
  }
  walk(def.root, "", instance.parentId, def.nodes);
  return out;
}
export function linkImportedComponents(doc: Document): void {
  const pools = [
    ...(doc.componentLibrary ?? []).map((c) => c.nodes),
    doc.nodes,
  ];
  for (const pool of pools)
    for (const node of pool)
      if (
        node.fidelity?.componentSourceId &&
        definition(doc, node.fidelity.componentSourceId)
      ) {
        node.type = "instance";
        node.componentId = node.fidelity.componentSourceId;
      }
  // Infer the saved overrides before synchronizing: imported instance values must not be discarded.
  for (const pool of pools)
    for (const node of pool) {
      if (
        node.type !== "instance" ||
        !node.componentId ||
        node.componentOverrides
      )
        continue;
      const def = definition(doc, node.componentId);
      if (!def) continue;
      const snapshot = paths(pool, node),
        base = paths(def.nodes, def.root),
        overrides: Record<string, Patch> = {};
      for (const [path, current] of snapshot) {
        const template = base.get(path);
        if (template) {
          const patch = diff(current, template);
          if (Object.keys(patch).length) overrides[path] = patch;
        }
      }
      overrides[""] = {
        ...overrides[""],
        width: node.width,
        height: node.height,
      };
      node.componentOverrides = overrides;
    }
  // Assign ownership without changing imported geometry on the first import.
  for (const pool of pools) {
    const instances = pool.filter(
      (n) => n.type === "instance" && n.componentId,
    );
    const nested = new Set(
      instances
        .filter((n) => {
          let parent = n.parentId;
          while (parent) {
            const p = pool.find((a) => a.id === parent);
            if (!p) break;
            if (p.type === "instance") return true;
            parent = p.parentId;
          }
          return false;
        })
        .map((n) => n.id),
    );
    for (const root of instances.filter((n) => !nested.has(n.id)))
      for (const [path, node] of paths(pool, root)) {
        node.componentOwner = root.id;
        node.componentPath = path;
      }
  }
}
export function synchronizeInstances(doc: Document): void {
  const roots = doc.nodes.filter(
    (n) =>
      n.type === "instance" &&
      n.componentId &&
      (!n.componentOwner || n.componentOwner === n.id),
  );
  for (const root of roots) {
    const subtree = paths(doc.nodes, root),
      ids = new Set([...subtree.values()].map((n) => n.id)),
      index = doc.nodes.indexOf(root);
    const replacement = expanded(doc, root, [...subtree.values()]);
    doc.nodes = doc.nodes.filter((n) => !ids.has(n.id));
    doc.nodes.splice(index, 0, ...replacement);
  }
}
export function recordOverrides(
  doc: Document,
  ids: string[],
  patch: Patch,
): void {
  for (const n of doc.nodes.filter(
    (n) => ids.includes(n.id) && n.componentOwner,
  )) {
    const owner = doc.nodes.find((o) => o.id === n.componentOwner);
    if (!owner) continue;
    const path = n.componentPath ?? "";
    if (path.includes("/$slot/")) continue;
    const def = owner.componentId && definition(doc, owner.componentId);
    if (def)
      for (const property of def.root.componentProperties ?? []) {
        if (property.targetPath !== path) continue;
        const field =
          property.type === "text"
            ? "text"
            : property.type === "boolean"
              ? "visible"
              : property.type === "instance"
                ? "componentId"
                : undefined;
        if (field && field in patch) {
          owner.componentValues ??= {};
          owner.componentValues[property.id] = patch[field] as string | boolean;
        }
      }
    owner.componentOverrides ??= {};
    const safe = Object.fromEntries(
      Object.entries(patch).filter(([k]) => !fixed.has(k)),
    ) as Patch;
    owner.componentOverrides[path] = {
      ...owner.componentOverrides[path],
      ...structuredClone(safe),
    };
    if ("fill" in patch) {
      owner.componentClears ??= {};
      owner.componentClears[path] = [
        "fidelity.paints",
        ...(!("variableId" in patch) ? ["variableId"] : []),
      ];
    } else if ("variableId" in patch && owner.componentClears?.[path]) {
      owner.componentClears[path] = owner.componentClears[path].filter(
        (k) => k !== "variableId",
      );
    }
  }
}
export function createComponentInstance(
  original: Document,
  reference: string,
  pageId: string,
  x: number,
  y: number,
): { doc: Document; id: string } {
  const doc = structuredClone(original),
    def = definition(doc, reference);
  if (!def) throw Error("Missing main component");
  const entry = doc.componentLibrary?.find((c) => c.sourceId === reference);
  if (
    entry?.libraryId &&
    (entry.missing ||
      doc.libraries?.find((s) => s.id === entry.libraryId)?.enabled === false)
  )
    throw Error("Enable the library before inserting components");
  const id = crypto.randomUUID(),
    root = {
      ...structuredClone(def.root),
      id,
      pageId,
      parentId: null,
      type: "instance" as const,
      componentId: reference,
      componentOwner: id,
      componentPath: "",
      componentOverrides: {},
      x,
      y,
    };
  doc.nodes.push(root);
  synchronizeInstances(doc);
  return { doc: finalized(original, doc), id };
}
export function resetComponentInstance(
  original: Document,
  id: string,
): Document {
  const doc = structuredClone(original),
    root = doc.nodes.find((n) => n.id === id && n.type === "instance");
  if (!root) throw Error("Select a component instance");
  assertWritable(doc, root);
  root.componentOverrides = {};
  delete root.componentValues;
  delete root.componentSlots;
  delete root.componentClears;
  synchronizeInstances(doc);
  return finalized(original, doc);
}
export function swapComponentInstance(
  original: Document,
  id: string,
  reference: string,
): Document {
  const current = original.nodes.find((n) => n.id === id);
  if (!current) throw Error("Select a component instance");
  assertWritable(original, current);
  if (current.componentId !== reference)
    assertLibraryEnabled(original, reference);
  if (current.componentOwner && current.componentOwner !== current.id) {
    const doc = structuredClone(original);
    recordOverrides(doc, [id], { componentId: reference });
    synchronizeInstances(doc);
    return finalized(original, doc);
  }
  const doc = changePrototypeComponent(original, id, reference);
  synchronizeInstances(doc);
  return finalized(original, doc);
}
// Prototype-only replacement: keep other instances and the editor document untouched.
// Rebuild just the chosen subtree, including when it is nested inside another instance.
export function changePrototypeComponent(
  original: Document,
  id: string,
  reference: string,
): Document {
  const doc = structuredClone(original),
    root = doc.nodes.find((n) => n.id === id && n.type === "instance");
  if (!root || !definition(doc, reference))
    throw Error("Missing main component");
  const subtree = paths(doc.nodes, root),
    ids = new Set([...subtree.values()].map((n) => n.id)),
    index = doc.nodes.indexOf(root);
  const previousDefinition = root.componentId
      ? definition(doc, root.componentId)
      : undefined,
    nextDefinition = definition(doc, reference)!;
  function namedPaths(nodes: Node[], base: Node) {
    const result = new Map<string, string>(),
      lookup = paths(nodes, base);
    const pathForId = new Map([...lookup].map(([path, n]) => [n.id, path]));
    function walk(n: Node, namePath: string) {
      result.set(namePath, pathForId.get(n.id)!);
      const counts = new Map<string, number>();
      for (const c of children(nodes, n.id)) {
        const k = `${c.type}:${c.name}`,
          i = counts.get(k) ?? 0;
        counts.set(k, i + 1);
        walk(c, `${namePath}/${encodeURIComponent(k)}#${i}`);
      }
    }
    walk(base, "");
    return result;
  }
  const previous = [...subtree.values()];
  if (previousDefinition) {
    const from = namedPaths(previousDefinition.nodes, previousDefinition.root),
      to = namedPaths(nextDefinition.nodes, nextDefinition.root);
    for (const [name, oldPath] of from) {
      const newPath = to.get(name);
      if (newPath === undefined || newPath === oldPath) continue;
      if (root.componentOverrides?.[oldPath]) {
        root.componentOverrides[newPath] = structuredClone(
          root.componentOverrides[oldPath],
        );
      }
      if (root.componentClears?.[oldPath]) {
        root.componentClears[newPath] = structuredClone(
          root.componentClears[oldPath],
        );
      }
      const member =
        previous.find(
          (n) => n.componentOwner === root.id && n.componentPath === oldPath,
        ) ?? subtree.get(oldPath);
      if (member)
        previous.push({
          ...member,
          componentOwner: root.id,
          componentPath: newPath,
        });
    }
  }
  const oldProps = previousDefinition?.root.componentProperties ?? [],
    newProps = nextDefinition.root.componentProperties ?? [];
  for (const oldProp of oldProps) {
    const next = newProps.find(
      (p) => p.name === oldProp.name && p.type === oldProp.type,
    );
    if (next && root.componentValues && oldProp.id in root.componentValues)
      root.componentValues[next.id] = root.componentValues[oldProp.id];
  }
  if (root.componentSlots && previousDefinition) {
    const from = namedPaths(previousDefinition.nodes, previousDefinition.root),
      to = namedPaths(nextDefinition.nodes, nextDefinition.root);
    for (const [name, oldPath] of from) {
      const next = to.get(name);
      if (next !== undefined && root.componentSlots[oldPath])
        root.componentSlots[next] = structuredClone(
          root.componentSlots[oldPath],
        );
    }
  }
  root.componentId = reference;
  const replacement = expanded(doc, root, previous);
  doc.nodes = doc.nodes.filter((n) => !ids.has(n.id));
  doc.nodes.splice(index, 0, ...replacement);
  return doc;
}
export function detachComponentInstance(
  original: Document,
  id: string,
): Document {
  const doc = structuredClone(original);
  const root = doc.nodes.find((n) => n.id === id);
  if (root) assertWritable(doc, root);
  for (const n of doc.nodes) {
    if (n.componentOwner === id) {
      delete n.componentOwner;
      delete n.componentPath;
      delete n.componentOverrides;
      delete n.componentClears;
      delete n.componentSlot;
      if (n.id === id) {
        delete n.componentValues;
        delete n.componentSlots;
        delete n.componentProperties;
      }
      if (n.id === id) {
        n.type = "group";
        delete n.componentId;
      }
    }
  }
  return finalized(original, doc);
}
export function editLibraryComponent(
  original: Document,
  reference: string,
): { doc: Document; id: string } {
  const doc = structuredClone(original),
    def = definition(doc, reference);
  if (!def) throw Error("Missing main component");
  const existing = doc.nodes.find(
    (n) =>
      n.type === "component" &&
      (n.id === reference ||
        (!!def.root.fidelity?.sourceId &&
          n.fidelity?.sourceId === def.root.fidelity.sourceId)),
  );
  if (existing) return { doc, id: existing.id };
  const ids = new Map(def.nodes.map((n) => [n.id, crypto.randomUUID()]));
  const rootId = ids.get(def.root.id)!;
  const nodes = def.nodes.map((n) => ({
    ...structuredClone(n),
    fidelity: {
      ...structuredClone(n.fidelity),
      size: n.fidelity?.size ?? [n.width, n.height],
      sourceId: n.fidelity?.sourceId ?? n.id,
    },
    id: ids.get(n.id)!,
    pageId: doc.pages[0].id,
    parentId: n.parentId ? (ids.get(n.parentId) ?? rootId) : null,
    ...(n.id === def.root.id
      ? { type: "component" as const, x: 80, y: 80 }
      : {}),
  }));
  for (const n of nodes) {
    delete n.componentOwner;
    delete n.componentPath;
  }
  doc.nodes.push(...nodes);
  return { doc, id: rootId };
}
export function updateLibraryFromMain(doc: Document, ids: string[]): void {
  for (const main of doc.nodes.filter(
    (n) => n.type === "component" && n.fidelity?.sourceId,
  )) {
    const lib = doc.componentLibrary?.find(
      (l) => l.sourceId === main.fidelity?.sourceId,
    );
    if (!lib) continue;
    const family = paths(doc.nodes, main);
    if (![...family.values()].some((n) => ids.includes(n.id))) continue;
    if (lib.libraryId) lib.localEdits = true;
    lib.nodes = structuredClone([...family.values()]);
    lib.nodes[0].parentId = null;
  }
}

export function componentDefinitions(doc: Document) {
  return [
    ...(doc.componentLibrary ?? []).map((c) => ({
      reference: c.sourceId,
      name: c.name,
      ...definition(doc, c.sourceId)!,
    })),
    ...doc.nodes
      .filter((n) => n.type === "component")
      .map((root) => ({
        reference: root.id,
        name: root.name,
        root,
        nodes: doc.nodes,
      })),
  ];
}
export function componentTargets(doc: Document, reference: string) {
  const def = definition(doc, reference);
  return def
    ? [...paths(def.nodes, def.root)].map(([path, node]) => ({ path, node }))
    : [];
}
function assertLibraryEnabled(doc: Document, reference: string) {
  const entry = doc.componentLibrary?.find((c) => c.sourceId === reference);
  if (
    entry?.libraryId &&
    (entry.missing ||
      doc.libraries?.find((s) => s.id === entry.libraryId)?.enabled === false)
  )
    throw Error("Enable the library before inserting components");
}
function assertWritable(doc: Document, node: Node) {
  let n: Node | undefined = node;
  const seen = new Set<string>();
  while (n) {
    if (n.locked) throw Error("Unlock the component before editing");
    if (seen.has(n.id)) throw Error("Cyclic component tree");
    seen.add(n.id);
    n = doc.nodes.find((p) => p.id === n!.parentId);
  }
}
export function inComponentSlot(
  doc: Document,
  node: Node,
  includeSelf = false,
) {
  let n = includeSelf ? node : doc.nodes.find((p) => p.id === node.parentId);
  const seen = new Set<string>();
  while (n && !seen.has(n.id)) {
    if (n.componentSlot && n.componentOwner) return true;
    seen.add(n.id);
    n = doc.nodes.find((p) => p.id === n!.parentId);
  }
  return false;
}
function slotSnapshot(doc: Document, slot: Node) {
  const family = paths(doc.nodes, slot);
  return [...family.values()]
    .filter((n) => n.id !== slot.id)
    .map((n) => {
      const clone = structuredClone(n);
      clone.componentSlotKey ??= n.id;
      if (clone.parentId === slot.id) clone.parentId = null;
      delete clone.componentOwner;
      delete clone.componentPath;
      delete clone.componentSlot;
      return clone;
    });
}
export function captureSlotContent(original: Document, doc: Document) {
  for (const slot of doc.nodes.filter(
    (n) => n.componentSlot && n.componentOwner,
  )) {
    const previous = original.nodes.find((n) => n.id === slot.id);
    if (!previous) continue;
    const before = slotSnapshot(original, previous),
      after = slotSnapshot(doc, slot);
    if (!same(before, after)) {
      const owner = doc.nodes.find((n) => n.id === slot.componentOwner);
      if (owner) {
        owner.componentSlots ??= {};
        owner.componentSlots[slot.componentPath ?? ""] = after;
      }
    }
  }
}
export function setComponentProperty(
  original: Document,
  reference: string,
  property: ComponentProperty | undefined,
  removeId?: string,
): Document {
  const doc = structuredClone(original),
    def = definition(doc, reference);
  if (!def) throw Error("Missing main component");
  assertWritable(doc, def.root);
  if (property) {
    const target = paths(def.nodes, def.root).get(property.targetPath);
    if (!target) throw Error("Missing property target");
    if (
      def.root.componentProperties?.some(
        (p) =>
          p.id !== property.id &&
          p.type === property.type &&
          p.targetPath === property.targetPath,
      )
    )
      throw Error("This layer already has that property type");
    if (
      (property.type === "text" && target.type !== "text") ||
      (property.type === "instance" && target.type !== "instance") ||
      (property.type === "slot" && !["frame", "group"].includes(target.type))
    )
      throw Error("Incompatible component property target");
  }
  if (property) {
    const target = paths(def.nodes, def.root).get(property.targetPath)!;
    if (property.type === "text" && typeof property.defaultValue === "string") {
      target.text = property.defaultValue;
      reflowText(target);
    }
    if (
      property.type === "boolean" &&
      typeof property.defaultValue === "boolean"
    )
      target.visible = property.defaultValue;
    if (
      property.type === "instance" &&
      typeof property.defaultValue === "string"
    )
      target.componentId = property.defaultValue;
  }
  def.root.componentProperties = [
    ...(def.root.componentProperties ?? []).filter(
      (p) => p.id !== (property?.id ?? removeId),
    ),
    ...(property ? [structuredClone(property)] : []),
  ];
  updateLibraryFromMain(doc, [def.root.id]);
  synchronizeInstances(doc);
  return finalized(original, doc);
}
export function setComponentValue(
  original: Document,
  instanceId: string,
  propertyId: string,
  value: string | boolean,
): Document {
  const doc = structuredClone(original),
    root = doc.nodes.find((n) => n.id === instanceId && n.type === "instance"),
    def = root?.componentId && definition(doc, root.componentId);
  if (!root || !def) throw Error("Missing main component");
  assertWritable(doc, root);
  const prop = def.root.componentProperties?.find((p) => p.id === propertyId);
  if (
    !prop ||
    prop.type === "slot" ||
    (prop.type === "boolean"
      ? typeof value !== "boolean"
      : typeof value !== "string")
  )
    throw Error("Invalid component property value");
  if (prop.type === "instance") assertLibraryEnabled(doc, String(value));
  if (prop.type === "instance" && !definition(doc, String(value)))
    throw Error("Missing main component");
  root.componentValues = { ...root.componentValues, [propertyId]: value };
  synchronizeInstances(doc);
  return finalized(original, doc);
}
export function resetComponentSlot(
  original: Document,
  instanceId: string,
  path: string,
) {
  const doc = structuredClone(original),
    root = doc.nodes.find((n) => n.id === instanceId);
  if (!root) throw Error("Missing component instance");
  assertWritable(doc, root);
  delete root.componentSlots?.[path];
  synchronizeInstances(doc);
  return finalized(original, doc);
}
export function setComponentSet(
  original: Document,
  set: ComponentSet,
): Document {
  const doc = structuredClone(original);
  if (!set.name.trim() || !Object.keys(set.axes).length)
    throw Error("Variant set needs a name and an axis");
  if (
    doc.componentSets?.some(
      (other) =>
        other.id !== set.id &&
        other.variants.some((v) =>
          set.variants.some((n) => n.componentId === v.componentId),
        ),
    )
  )
    throw Error("A component already belongs to another variant set");
  for (const variant of set.variants) {
    const def = definition(doc, variant.componentId);
    if (!def) throw Error("Missing main component");
    assertWritable(doc, def.root);
  }
  doc.componentSets = [
    ...(doc.componentSets ?? []).filter((s) => s.id !== set.id),
    structuredClone(set),
  ];
  return finalized(original, doc);
}
export function switchVariant(
  original: Document,
  instanceId: string,
  axis: string,
  value: string,
) {
  const instance = original.nodes.find((n) => n.id === instanceId),
    set = original.componentSets?.find((s) =>
      s.variants.some((v) => v.componentId === instance?.componentId),
    );
  if (!instance || !set || !set.axes[axis]?.includes(value))
    throw Error("Missing component variant");
  const current = set.variants.find(
    (v) => v.componentId === instance.componentId,
  )!;
  const candidates = set.variants
    .filter((v) => v.values[axis] === value)
    .sort(
      (a, b) =>
        Object.keys(current.values).filter(
          (k) => b.values[k] === current.values[k],
        ).length -
        Object.keys(current.values).filter(
          (k) => a.values[k] === current.values[k],
        ).length,
    );
  if (!candidates.length) throw Error("Missing component variant");
  return swapComponentInstance(original, instanceId, candidates[0].componentId);
}

export function updatePropertyDefaults(doc: Document, ids: string[]) {
  for (const main of doc.nodes.filter(
    (n) => n.type === "component" && n.componentProperties?.length,
  )) {
    const targets = paths(doc.nodes, main);
    for (const p of main.componentProperties ?? []) {
      const target = targets.get(p.targetPath);
      if (!target || !ids.includes(target.id)) continue;
      if (p.type === "text") p.defaultValue = target.text;
      if (p.type === "boolean") p.defaultValue = target.visible;
      if (p.type === "instance" && target.componentId)
        p.defaultValue = target.componentId;
    }
  }
}
export function propagatePropertiesToVariants(
  original: Document,
  reference: string,
) {
  let doc = structuredClone(original);
  const set = doc.componentSets?.find((s) =>
      s.variants.some((v) => v.componentId === reference),
    ),
    source = definition(doc, reference);
  if (!set || !source) throw Error("Missing component variant");
  function named(nodes: Node[], root: Node) {
    const result = new Map<string, Node>();
    const walk = (n: Node, path: string) => {
      result.set(path, n);
      const counts = new Map<string, number>();
      for (const c of children(nodes, n.id)) {
        const label = c.type + ":" + c.name,
          index = counts.get(label) ?? 0;
        counts.set(label, index + 1);
        walk(c, path + "/" + encodeURIComponent(label) + "#" + index);
      }
    };
    walk(root, "");
    return result;
  }
  const sourceNames = named(source.nodes, source.root),
    sourcePaths = paths(source.nodes, source.root);
  for (const variant of set.variants) {
    if (variant.componentId === reference) continue;
    const target = definition(doc, variant.componentId);
    if (!target) continue;
    const names = named(target.nodes, target.root),
      targetPaths = paths(target.nodes, target.root);
    for (const property of source.root.componentProperties ?? []) {
      const sourceNode = sourcePaths.get(property.targetPath),
        name = [...sourceNames].find(([, n]) => n.id === sourceNode?.id)?.[0],
        targetNode = name !== undefined ? names.get(name) : undefined,
        targetPath = [...targetPaths].find(
          ([, n]) => n.id === targetNode?.id,
        )?.[0];
      if (!targetNode || targetPath === undefined) continue;
      const existing = target.root.componentProperties?.find(
        (p) => p.name === property.name && p.type === property.type,
      );
      doc = setComponentProperty(doc, variant.componentId, {
        ...structuredClone(property),
        id: existing?.id ?? property.id,
        targetPath,
        defaultValue:
          property.type === "text"
            ? targetNode.text
            : property.type === "boolean"
              ? targetNode.visible
              : property.type === "instance"
                ? (targetNode.componentId ?? String(property.defaultValue))
                : "",
      });
    }
  }
  return finalized(original, doc);
}
