import { reflowText } from "./textLayout";
import type { Document, Node } from "./core";

type Patch = Partial<Node>;
const fixed = new Set([
  "id",
  "pageId",
  "parentId",
  "componentId",
  "componentOwner",
  "componentPath",
  "componentOverrides",
  "componentClears",
]);
const properties = (n: Node): Patch =>
  Object.fromEntries(
    Object.entries(n).filter(([key]) => !fixed.has(key)),
  ) as Patch;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const key = (n: Node) => encodeURIComponent(n.fidelity?.sourceId ?? n.id);
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
    const oldNode = old.get(path),
      id = path === "" ? instance.id : (oldNode?.id ?? crypto.randomUUID());
    let node = merge(
      merge(structuredClone(base), nestedOverrides[nestedPath]),
      overrides[path],
    );
    clearFields(node, path);
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
      oldNode &&
      [
        "text",
        "fontSize",
        "fontFamily",
        "fontWeight",
        "width",
        "lineHeight",
      ].some((k) => !same((oldNode as any)[k], (node as any)[k]))
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
      base.componentId
    ) {
      const target = definition(doc, base.componentId);
      if (target) {
        if (chain.has(base.componentId))
          throw Error("Cyclic component reference");
        const virtual = {
          ...base,
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
    const counts = new Map<string, number>();
    for (const child of children(source, sourceRoot.id)) {
      const k = key(child),
        index = counts.get(k) ?? 0;
      counts.set(k, index + 1);
      const suffix = "/" + k + "#" + index;
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
    owner.componentOverrides ??= {};
    const path = n.componentPath ?? "";
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
  return { doc, id };
}
export function resetComponentInstance(
  original: Document,
  id: string,
): Document {
  const doc = structuredClone(original),
    root = doc.nodes.find((n) => n.id === id && n.type === "instance");
  if (!root) throw Error("Select a component instance");
  root.componentOverrides = {};
  delete root.componentClears;
  synchronizeInstances(doc);
  return doc;
}
export function swapComponentInstance(
  original: Document,
  id: string,
  reference: string,
): Document {
  const doc = structuredClone(original),
    root = doc.nodes.find((n) => n.id === id && n.type === "instance");
  if (!root || !definition(doc, reference))
    throw Error("Missing main component");
  // Source paths retain overrides on corresponding layers; unmatched overrides remain
  // in the document so switching back to a variant does not discard user edits.
  root.componentId = reference;
  synchronizeInstances(doc);
  return doc;
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
  const previousDefinition =
      root.componentId && definition(doc, root.componentId),
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
  for (const n of doc.nodes) {
    if (n.componentOwner === id) {
      delete n.componentOwner;
      delete n.componentPath;
      delete n.componentOverrides;
      delete n.componentClears;
      if (n.id === id) {
        n.type = "group";
        delete n.componentId;
      }
    }
  }
  return doc;
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
    lib.nodes = structuredClone([...family.values()]);
    lib.nodes[0].parentId = null;
  }
}
