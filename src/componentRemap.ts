import type { Node } from "./core";
export function remapComponentMetadata(
  node: Node,
  path: (value: string) => string,
  reference: (value: string) => string,
  pageId: string,
  map: Map<string, string>,
  depth = 0,
) {
  if (depth > 40) throw Error("Component snapshot nesting exceeds limits");
  if (node.componentSlotKey)
    node.componentSlotKey =
      map.get(node.componentSlotKey) ?? node.componentSlotKey;
  if (node.componentPath !== undefined)
    node.componentPath = path(node.componentPath);
  if (node.componentProperties)
    node.componentProperties = node.componentProperties.map((p) => ({
      ...p,
      targetPath: path(p.targetPath),
      defaultValue:
        p.type === "instance"
          ? reference(String(p.defaultValue))
          : p.defaultValue,
      preferred: p.preferred?.map(reference),
    }));
  if (node.componentValues)
    for (const p of node.componentProperties ?? [])
      if (
        p.type === "instance" &&
        typeof node.componentValues[p.id] === "string"
      )
        node.componentValues[p.id] = reference(
          String(node.componentValues[p.id]),
        );
  if (node.componentOverrides)
    node.componentOverrides = Object.fromEntries(
      Object.entries(node.componentOverrides).map(([key, value]) => [
        path(key),
        {
          ...value,
          ...(value.componentId
            ? { componentId: reference(value.componentId) }
            : {}),
        },
      ]),
    );
  if (node.componentClears)
    node.componentClears = Object.fromEntries(
      Object.entries(node.componentClears).map(([key, value]) => [
        path(key),
        value,
      ]),
    );
  if (node.componentSlots)
    node.componentSlots = Object.fromEntries(
      Object.entries(node.componentSlots).map(([key, content]) => [
        path(key),
        content.map((source) => {
          const n = structuredClone(source);
          n.id = map.get(n.id) ?? n.id;
          n.pageId = pageId;
          n.parentId = n.parentId ? (map.get(n.parentId) ?? n.parentId) : null;
          if (n.componentId) n.componentId = reference(n.componentId);
          if (n.componentOwner)
            n.componentOwner = map.get(n.componentOwner) ?? n.componentOwner;
          if (n.targetId) n.targetId = map.get(n.targetId) ?? n.targetId;
          remapComponentMetadata(n, path, reference, pageId, map, depth + 1);
          return n;
        }),
      ]),
    );
}
export function componentPathMapper(nodes: Node[], map: Map<string, string>) {
  const keys = new Map<string, string>();
  for (const n of nodes) {
    if (!n.fidelity?.sourceId)
      keys.set(
        encodeURIComponent(n.id),
        encodeURIComponent(map.get(n.id) ?? n.id),
      );
    if (n.componentSlotKey)
      keys.set(
        encodeURIComponent(n.componentSlotKey),
        encodeURIComponent(map.get(n.componentSlotKey) ?? n.componentSlotKey),
      );
  }
  return (path: string) =>
    path
      .split("/")
      .map((part) => {
        const marker = part.lastIndexOf("#");
        return marker < 0
          ? part
          : (keys.get(part.slice(0, marker)) ?? part.slice(0, marker)) +
              part.slice(marker);
      })
      .join("/");
}
