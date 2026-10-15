import type { Document, Node } from "./core";
export interface DocumentIndex {
  byId: Map<string, Node>;
  children: Map<string | null, Node[]>;
}
const cache = new WeakMap<
  Document,
  { nodes: Node[]; length: number; index: DocumentIndex }
>();
/** Render snapshots are immutable. Share a linear index across scene/thumbnail renders of one snapshot. */
export function documentIndex(doc: Document): DocumentIndex {
  const found = cache.get(doc);
  if (found?.nodes === doc.nodes && found.length === doc.nodes.length)
    return found.index;
  const byId = new Map<string, Node>(),
    children = new Map<string | null, Node[]>();
  for (const n of doc.nodes) {
    byId.set(n.id, n);
    const list = children.get(n.parentId) ?? [];
    list.push(n);
    children.set(n.parentId, list);
  }
  const index = { byId, children };
  cache.set(doc, { nodes: doc.nodes, length: doc.nodes.length, index });
  return index;
}
