import { validateDocument, type Document } from "./core";
export type MergeSide = "main" | "branch";
export interface MergeConflict {
  id: string;
  path: string[];
  base: unknown;
  main: unknown;
  branch: unknown;
}
export interface DesignComparison {
  conflicts: MergeConflict[];
  changes: { path: string[]; side: MergeSide | "both" }[];
  document: Document;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function canonical(v: unknown): string {
  return (
    JSON.stringify(v, (_, x) =>
      object(x)
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, x[k]]),
          )
        : x,
    ) ?? "undefined"
  );
}
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const keyed = (v: unknown): v is { id: string }[] =>
  Array.isArray(v) &&
  v.every((x) => object(x) && typeof x.id === "string") &&
  new Set(v.map((x) => x.id)).size === v.length;
/** Three-way field merge. Geometry arrays without stable IDs are atomic; missing keys represent deletion. */
export function compareDesign(
  base: Document,
  main: Document,
  branch: Document,
  choices: Record<string, MergeSide> = {},
): DesignComparison {
  const conflicts: MergeConflict[] = [],
    changes: DesignComparison["changes"] = [];
  function recordChanges(
    before: unknown,
    after: unknown,
    path: string[],
    side: MergeSide | "both",
  ) {
    if (equal(before, after)) return;
    if (object(before) && object(after)) {
      for (const key of new Set([
        ...Object.keys(before),
        ...Object.keys(after),
      ]))
        recordChanges(before[key], after[key], [...path, key], side);
      return;
    }
    if (keyed(before) && keyed(after)) {
      const bm = new Map(before.map((x) => [x.id, x])),
        am = new Map(after.map((x) => [x.id, x]));
      for (const id of new Set([...bm.keys(), ...am.keys()]))
        recordChanges(bm.get(id), am.get(id), [...path, id], side);
      const shared = new Set(
        before.map((x) => x.id).filter((id) => am.has(id)),
      );
      if (
        !equal(
          before.map((x) => x.id).filter((id) => shared.has(id)),
          after.map((x) => x.id).filter((id) => shared.has(id)),
        )
      )
        changes.push({ path: [...path, "$order"], side });
      return;
    }
    changes.push({ path, side });
  }
  function merge(b: unknown, m: unknown, r: unknown, path: string[]): unknown {
    if (equal(m, r)) {
      recordChanges(b, m, path, "both");
      return structuredClone(m);
    }
    if (equal(b, r)) {
      recordChanges(b, m, path, "main");
      return structuredClone(m);
    }
    if (equal(b, m)) {
      recordChanges(b, r, path, "branch");
      return structuredClone(r);
    }
    if (object(m) && object(r) && (object(b) || b === undefined)) {
      const out: Record<string, unknown> = {};
      for (const key of new Set([
        ...Object.keys(b ?? {}),
        ...Object.keys(m),
        ...Object.keys(r),
      ])) {
        const value = merge(object(b) ? b[key] : undefined, m[key], r[key], [
          ...path,
          key,
        ]);
        if (value !== undefined) out[key] = value;
      }
      return out;
    }
    if (keyed(m) && keyed(r) && (keyed(b) || b === undefined)) {
      const before = keyed(b) ? b : [],
        bm = new Map(before.map((x) => [x.id, x])),
        mm = new Map(m.map((x) => [x.id, x])),
        rm = new Map(r.map((x) => [x.id, x]));
      const values = new Map<string, unknown>();
      for (const id of new Set([...bm.keys(), ...mm.keys(), ...rm.keys()])) {
        const value = merge(bm.get(id), mm.get(id), rm.get(id), [...path, id]);
        if (value !== undefined) values.set(id, value);
      }
      const surviving = (a: { id: string }[]) =>
        a.map((x) => x.id).filter((id) => values.has(id));
      const commonBase = before
        .map((x) => x.id)
        .filter((id) => mm.has(id) && rm.has(id));
      const commonSet = new Set(commonBase);
      const mainOrder = m.map((x) => x.id).filter((id) => commonSet.has(id)),
        branchOrder = r.map((x) => x.id).filter((id) => commonSet.has(id));
      let preferred = surviving(m);
      if (!equal(branchOrder, commonBase)) {
        if (equal(mainOrder, commonBase) || equal(mainOrder, branchOrder))
          preferred = surviving(r);
        else {
          const orderPath = [...path, "$order"],
            id = JSON.stringify(orderPath);
          conflicts.push({
            id,
            path: orderPath,
            base: commonBase,
            main: mainOrder,
            branch: branchOrder,
          });
          if (choices[id] === "branch") preferred = surviving(r);
        }
      }
      // Insert additions next to their nearest predecessor, retaining each side's authored order.
      for (const sequence of [surviving(r), surviving(m)])
        for (let i = 0; i < sequence.length; i++)
          if (!preferred.includes(sequence[i])) {
            const previous = sequence
              .slice(0, i)
              .reverse()
              .find((id) => preferred.includes(id));
            const next = sequence
              .slice(i + 1)
              .find((id) => preferred.includes(id));
            preferred.splice(
              previous
                ? preferred.indexOf(previous) + 1
                : next
                  ? preferred.indexOf(next)
                  : preferred.length,
              0,
              sequence[i],
            );
          }
      return preferred.map((id) => values.get(id));
    }
    const id = JSON.stringify(path);
    conflicts.push({ id, path, base: b, main: m, branch: r });
    return structuredClone(choices[id] === "branch" ? r : m);
  }
  const normalize = (d: Document) => ({ ...d, id: base.id, name: main.name });
  const result = merge(
    normalize(base),
    normalize(main),
    normalize(branch),
    [],
  ) as Document;
  result.id = main.id;
  result.name = main.name;
  return { conflicts, changes, document: result };
}
export function resolvedDesign(
  base: Document,
  main: Document,
  branch: Document,
  choices: Record<string, MergeSide>,
): Document {
  const result = compareDesign(base, main, branch, choices);
  if (result.conflicts.some((c) => !choices[c.id]))
    throw Error("Resolve every merge conflict first");
  validateDocument(result.document);
  return result.document;
}
export function compareSnapshots(before: Document, after: Document) {
  const result = compareDesign(before, before, { ...after, name: before.name });
  if (before.name !== after.name)
    result.changes.unshift({ path: ["name"], side: "branch" });
  return result.changes;
}
