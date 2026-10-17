import {
  ancestors,
  execute,
  relayout,
  validateDocument,
  type Document,
  type Node,
} from "./core";
import {
  componentTargets,
  synchronizeInstances,
  resetComponentInstance,
} from "./components";
import { propertyPaths } from "./componentModel";

const fieldFor = (type: string) =>
  type === "text"
    ? "text"
    : type === "boolean"
      ? "visible"
      : type === "instance"
        ? "componentId"
        : undefined;
function context(doc: Document, nodeId: string) {
  const node = doc.nodes.find((n) => n.id === nodeId);
  const owner =
    node &&
    doc.nodes.find(
      (n) =>
        n.id ===
        (node.componentOwner ?? (node.type === "instance" ? node.id : "")),
    );
  if (!node || !owner?.componentId) throw Error("Select a component instance");
  return { node, owner };
}
export function listComponentOverrides(doc: Document, nodeId: string) {
  const { node, owner } = context(doc, nodeId);
  const properties =
    componentTargets(doc, owner.componentId!)[0]?.node.componentProperties ??
    [];
  const entries: { path: string; field: string; name: string }[] = [];
  const add = (path: string, field: string) => {
    if (node.id !== owner.id && path !== node.componentPath) return;
    if (entries.some((e) => e.path === path && e.field === field)) return;
    const member = doc.nodes.find(
      (n) => n.componentOwner === owner.id && n.componentPath === path,
    );
    entries.push({ path, field, name: member?.name ?? path });
  };
  for (const [path, patch] of Object.entries(owner.componentOverrides ?? {}))
    for (const field of Object.keys(patch)) add(path, field);
  for (const prop of properties)
    if (prop.id in (owner.componentValues ?? {})) {
      const field = fieldFor(prop.type);
      if (field) for (const path of propertyPaths(prop)) add(path, field);
    }
  return entries;
}
export function resetComponentOverride(
  original: Document,
  nodeId: string,
  path?: string,
  field?: string,
) {
  const doc = structuredClone(original),
    { node, owner } = context(doc, nodeId);
  if ([node, owner, ...ancestors(doc, node)].some((n) => n.locked))
    throw Error("Unlock the component before editing");
  const targets =
    path !== undefined
      ? [path]
      : node.id === owner.id
        ? Object.keys(owner.componentOverrides ?? {})
        : [node.componentPath ?? ""];
  for (const key of targets) {
    if (field) {
      delete owner.componentOverrides?.[key]?.[field as keyof Node];
      if (field === "fill" || field === "variableId")
        delete owner.componentClears?.[key];
    } else {
      delete owner.componentOverrides?.[key];
      delete owner.componentClears?.[key];
    }
  }
  for (const p of componentTargets(doc, owner.componentId!)[0]?.node
    .componentProperties ?? []) {
    if (
      ((path === undefined && node.id === owner.id) ||
        propertyPaths(p).some((p) => targets.includes(p))) &&
      (!field || fieldFor(p.type) === field)
    )
      delete owner.componentValues?.[p.id];
  }
  synchronizeInstances(doc);
  relayout(doc, new Set(doc.nodes.map((n) => n.id)));
  validateDocument(doc);
  return doc;
}
export function canPushComponentOverrides(doc: Document, nodeId: string) {
  const node = doc.nodes.find((n) => n.id === nodeId);
  if (
    !node ||
    node.type !== "instance" ||
    (node.componentOwner && node.componentOwner !== node.id)
  )
    return false;
  const main = doc.nodes.find(
    (n) => n.id === node.componentId && n.type === "component",
  );
  return (
    !!main &&
    ![node, main, ...ancestors(doc, node), ...ancestors(doc, main)].some(
      (n) => n.locked,
    ) &&
    !ancestors(doc, node).some(
      (n) => n.type === "instance" || n.type === "component",
    ) &&
    !Object.keys(node.componentSlots ?? {}).length
  );
}
export function pushComponentOverrides(original: Document, nodeId: string) {
  if (!canPushComponentOverrides(original, nodeId))
    throw Error(
      "Only unlocked local top-level instances can push changes to their main component.",
    );
  const { owner } = context(original, nodeId);
  let doc = original;
  const targets = componentTargets(original, owner.componentId!);
  for (const { node, path } of targets) {
    const patch = { ...owner.componentOverrides?.[path] };
    // A placed instance's identity and position never replace its main's identity.
    for (const key of [
      "id",
      "pageId",
      "parentId",
      "type",
      "x",
      "y",
      "rotation",
    ] as const)
      delete patch[key];
    if (path === "") {
      delete patch.componentId;
      delete patch.name;
    }
    for (const p of targets[0].node.componentProperties ?? []) {
      if (
        !propertyPaths(p).includes(path) ||
        !(p.id in (owner.componentValues ?? {}))
      )
        continue;
      const field = fieldFor(p.type);
      if (field)
        (patch as Record<string, unknown>)[field] =
          owner.componentValues![p.id];
    }
    if (Object.keys(patch).length)
      doc = execute(doc, { type: "update", ids: [node.id], patch }).doc;
  }
  return resetComponentInstance(doc, nodeId);
}
