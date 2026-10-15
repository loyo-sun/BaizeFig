import { ancestors, execute, type Document } from "./core";
export interface FindOptions {
  query: string;
  field: "text" | "name" | "both";
  caseSensitive: boolean;
  pageId?: string;
}
export interface FindMatch {
  nodeId: string;
  pageId: string;
  field: "text" | "name";
  start: number;
  end: number;
}
export function findMatches(doc: Document, options: FindOptions): FindMatch[] {
  if (!options.query) return [];
  // Escaped literal matching keeps UTF-16 indices intact even with Unicode case folding.
  const pattern = new RegExp(
    options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    options.caseSensitive ? "gu" : "giu",
  );
  const result: FindMatch[] = [];
  for (const page of doc.pages) {
    if (options.pageId && page.id !== options.pageId) continue;
    for (const node of doc.nodes.filter((n) => n.pageId === page.id)) {
      for (const field of ["name", "text"] as const) {
        if (options.field !== "both" && field !== options.field) continue;
        if (field === "text" && node.type !== "text") continue;
        for (const m of node[field].matchAll(pattern))
          result.push({
            nodeId: node.id,
            pageId: page.id,
            field,
            start: m.index!,
            end: m.index! + m[0].length,
          });
      }
    }
  }
  return result;
}
export function replaceMatches(
  doc: Document,
  matches: FindMatch[],
  replacement: string,
) {
  let next = doc,
    count = 0,
    skipped = 0;
  const groups = new Map<string, FindMatch[]>();
  for (const match of matches) {
    const key = `${match.nodeId}:${match.field}`;
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  for (const group of groups.values()) {
    const n = next.nodes.find((n) => n.id === group[0].nodeId);
    if (!n) continue;
    if (n.locked || ancestors(next, n).some((p) => p.locked)) {
      skipped += group.length;
      continue;
    }
    const field = group[0].field;
    let value = n[field];
    for (const m of group.sort((a, b) => b.start - a.start)) {
      value = value.slice(0, m.start) + replacement + value.slice(m.end);
      next = execute(next, {
        type: "update",
        ids: [n.id],
        patch: { [field]: value },
      }).doc;
    }
    count += group.length;
  }
  return { doc: next, count, skipped };
}
