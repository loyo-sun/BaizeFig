import { remapComponentMetadata, componentPathMapper } from "./componentRemap";
import { inComponentSlot, linkMainCopies } from "./components";
import type { PrototypeAction } from "./prototype";
import {
  ancestors,
  bounds,
  descendants,
  execute,
  id,
  roots,
  worldTransform,
  type Document,
  type Node,
} from "./core";
import { inverse, multiply } from "./fidelity";
export interface NodeClipboard {
  nodes: Node[];
  documentId?: string;
}
export type PasteMode = "normal" | "over" | "replace";
export function pasteNodes(
  original: Document,
  pageId: string,
  data: NodeClipboard,
  selected: string[],
  mode: PasteMode = "normal",
) {
  if (!data.nodes.length) return { doc: original, selection: [] as string[] };
  if (
    data.nodes.length > 50000 ||
    new Set(data.nodes.map((n) => n.id)).size !== data.nodes.length
  )
    throw Error("Invalid clipboard data");
  const sourceIds = new Set(data.nodes.map((n) => n.id));
  const sourceRoots = data.nodes.filter(
    (n) => !n.parentId || !sourceIds.has(n.parentId),
  );
  if (!sourceRoots.length) throw Error("Invalid clipboard data");
  const targets = roots(original, selected).filter(
    (n) =>
      n.pageId === pageId &&
      !n.locked &&
      !ancestors(original, n).some((a) => a.locked),
  );
  if (mode !== "normal" && !targets.length)
    throw Error("Select an unlocked destination first");
  const groups: Node[][] =
    mode === "replace"
      ? targets.map((n) => [n])
      : mode === "over"
        ? [targets]
        : [[]];
  let next = original;
  const selection: string[] = [];
  for (const destination of groups) {
    const selectedSlot =
      mode === "normal" && targets.length === 1 && targets[0].componentSlot
        ? targets[0]
        : undefined;
    const parentId =
      selectedSlot?.id ??
      (destination.length &&
      new Set(destination.map((n) => n.parentId)).size === 1
        ? destination[0].parentId
        : null);
    if (parentId) {
      const parent = next.nodes.find((n) => n.id === parentId);
      if (
        parent &&
        (parent.type === "instance" || parent.componentOwner) &&
        !inComponentSlot(next, parent, true)
      )
        throw Error("Detach instance before changing its layer structure");
    }
    const map = new Map(data.nodes.map((n) => [n.id, id()]));
    const external = (ref: string | undefined) =>
      ref
        ? (map.get(ref) ??
          ((!data.documentId || data.documentId === original.id) &&
          next.nodes.some((n) => n.id === ref)
            ? ref
            : undefined))
        : undefined;
    const remapPath = componentPathMapper(data.nodes, map);
    const copied = data.nodes.map((n) => {
      const node = structuredClone(n);
      node.id = map.get(n.id)!;
      node.pageId = pageId;
      node.parentId = n.parentId ? (map.get(n.parentId) ?? null) : null;
      node.componentOwner = n.componentOwner
        ? map.get(n.componentOwner)
        : undefined;
      node.componentId =
        external(n.componentId) ??
        (n.componentId &&
        next.componentLibrary?.some((c) => c.sourceId === n.componentId)
          ? n.componentId
          : undefined);
      if (!node.componentOwner) {
        delete node.componentPath;
        delete node.componentClears;
        delete node.componentOverrides;
      }
      if (node.type === "instance" && !node.componentId) {
        node.type = "group";
        delete node.componentOwner;
      }
      if (node.componentPath !== undefined)
        node.componentPath = remapPath(node.componentPath);
      if (node.componentOverrides)
        node.componentOverrides = Object.fromEntries(
          Object.entries(node.componentOverrides).map(([key, patch]) => [
            remapPath(key),
            patch,
          ]),
        );
      if (node.componentClears)
        node.componentClears = Object.fromEntries(
          Object.entries(node.componentClears).map(([key, fields]) => [
            remapPath(key),
            fields,
          ]),
        );
      if (node.type === "component" && node.fidelity)
        delete node.fidelity.componentSourceId;
      node.targetId = external(n.targetId);
      if (node.interactions)
        node.interactions = node.interactions
          .map((i) => ({
            ...i,
            actions: i.actions.flatMap<PrototypeAction>((a) => {
              if ("targetId" in a) {
                const targetId = external(a.targetId);
                return targetId ? [{ ...a, targetId }] : [];
              }
              if (a.type === "changeTo") {
                const componentId =
                  external(a.componentId) ??
                  (next.componentLibrary?.some(
                    (c) => c.sourceId === a.componentId,
                  )
                    ? a.componentId
                    : undefined);
                return componentId ? [{ ...a, componentId }] : [];
              }
              return [a];
            }),
          }))
          .filter((i) => i.actions.length);
      if (
        node.variableId &&
        !next.variables?.some((v) => v.id === node.variableId)
      )
        delete node.variableId;
      if (node.bindings)
        for (const [key, ref] of Object.entries(node.bindings))
          if (!next.typedVariables?.some((v) => v.id === ref))
            delete node.bindings[key as keyof typeof node.bindings];
      if (node.variableModes)
        for (const key of Object.keys(node.variableModes))
          if (!next.variableCollections?.some((v) => v.id === key))
            delete node.variableModes[key];
      remapComponentMetadata(
        node,
        remapPath,
        (ref) => external(ref) ?? ref,
        pageId,
        map,
      );
      return node;
    });
    const detachedOwners = new Set(
      copied
        .filter(
          (n) =>
            n.type === "group" &&
            data.nodes.some(
              (s) => map.get(s.id) === n.id && s.type === "instance",
            ),
        )
        .map((n) => n.id),
    );
    for (const n of copied)
      if (n.componentOwner && detachedOwners.has(n.componentOwner)) {
        delete n.componentOwner;
        delete n.componentPath;
        delete n.componentOverrides;
        delete n.componentClears;
      }
    const sourceDoc = { ...next, nodes: copied },
      copiedRootIds = new Set<string>(sourceRoots.map((n) => map.get(n.id)!)),
      b = bounds(
        sourceDoc,
        copied.filter((n) => copiedRootIds.has(n.id)),
      );
    const target = selectedSlot
      ? bounds(original, [selectedSlot])
      : destination.length
        ? bounds(original, destination)
        : undefined;
    const dx = target ? target.x + target.width / 2 - b.x - b.width / 2 : 20,
      dy = target ? target.y + target.height / 2 - b.y - b.height / 2 : 20;
    for (const source of sourceRoots) {
      const node = copied.find((n) => n.id === map.get(source.id))!;
      node.x += dx;
      node.y += dy;
      if (parentId) {
        const parent = next.nodes.find((n) => n.id === parentId)!,
          matrix = multiply(
            inverse(worldTransform(next, parent)),
            worldTransform({ ...next, nodes: copied }, node),
          );
        node.x = matrix[4];
        node.y = matrix[5];
        node.rotation = 0;
        node.fidelity = {
          ...node.fidelity,
          size: node.fidelity?.size ?? [node.width, node.height],
          linear: matrix.slice(0, 4) as [number, number, number, number],
        };
        node.parentId = parentId;
      }
      selection.push(node.id);
    }
    if (data.documentId === original.id)
      linkMainCopies(
        original,
        copied,
        map,
        sourceRoots.map((n) => n.id),
      );
    const result = execute(next, { type: "create", nodes: copied });
    next = result.doc;
    if (mode === "replace") {
      const old = destination[0],
        replacement = map.get(sourceRoots[0].id)!,
        removed = new Set(descendants(next, [old.id]));
      // Redirect inbound prototype destinations before deleting the replaced subtree.
      next = structuredClone(next);
      for (const node of next.nodes) {
        if (removed.has(node.targetId ?? "")) node.targetId = replacement;
        if (node.interactions)
          for (const interaction of node.interactions)
            for (const action of interaction.actions)
              if ("targetId" in action && removed.has(action.targetId))
                action.targetId = replacement;
      }
      const insertion = next.nodes.findIndex((n) => n.id === old.id),
        block = next.nodes.filter((n) => copied.some((c) => c.id === n.id));
      next.nodes = next.nodes.filter((n) => !block.includes(n));
      next.nodes.splice(insertion, 0, ...block);
      next = execute(next, { type: "delete", ids: [old.id] }).doc;
    }
  }
  return { doc: next, selection };
}
