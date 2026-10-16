import type { Document, Node } from "./core";
import { componentTargets } from "./components";
import {
  propertyPaths,
  type ComponentProperty,
  type ComponentSet,
} from "./componentModel";
type Raw = Record<string, any>;
const guid = (g: Raw | undefined) =>
  g && Number.isInteger(g.sessionID) && Number.isInteger(g.localID)
    ? `${g.sessionID}:${g.localID}`
    : "";
export function figPropertyResolver(source: Raw[]) {
  const definitions = new Map<string, Raw>();
  for (const n of source)
    for (const p of n.componentPropDefs ?? []) definitions.set(guid(p.id), p);
  function resolved(id: string, seen = new Set<string>()): Raw | undefined {
    if (!id || seen.has(id) || seen.size > 40) return;
    const p = definitions.get(id);
    if (!p) return;
    if (!p.parentPropDefId) return { ...p, canonical: id };
    const parent = resolved(guid(p.parentPropDefId), new Set(seen).add(id));
    return parent
      ? { ...parent, ...p, canonical: parent.canonical }
      : undefined;
  }
  return resolved;
}
// Schema-decoded records are data; never compile embedded schema names into code.
export function restoreFigComponentModels(
  doc: Document,
  source: Raw[],
  warnings: Set<string>,
) {
  const index = new Map(source.map((n) => [guid(n.guid), n]));
  const resolved = figPropertyResolver(source);
  const pools = [
    ...(doc.componentLibrary ?? []).map((c) => c.nodes),
    doc.nodes,
  ];
  const reference = (n: Node) => n.fidelity?.sourceId ?? n.id;
  const value = (type: ComponentProperty["type"], n: Node) =>
    type === "text"
      ? n.text
      : type === "boolean"
        ? n.visible
        : (n.componentId ?? "");
  const nativeRefs = new Set(
    (doc.componentLibrary ?? []).map((c) => c.sourceId),
  );
  for (const pool of pools)
    for (const root of pool.filter((n) => n.type === "component")) {
      const raw = index.get(reference(root));
      if (!raw) continue;
      delete root.componentProperties;
      if ((raw.componentPropDefs ?? []).some((p: Raw) => !resolved(guid(p.id))))
        warnings.add("Some component property bindings could not be restored.");
      const accepted = new Set(
        (raw.componentPropDefs ?? [])
          .map((p: Raw) => resolved(guid(p.id))?.canonical)
          .filter(Boolean),
      );
      const targets = componentTargets(doc, reference(root));
      const properties = new Map<string, ComponentProperty>();
      for (const { path, node } of targets) {
        const original = index.get(reference(node));
        for (const ref of original?.componentPropRefs ?? []) {
          const p = resolved(guid(ref.defID));
          if (!p || !accepted.has(p.canonical)) continue;
          const type: ComponentProperty["type"] | undefined =
            p.type === "TEXT" &&
            ref.componentPropNodeField === "TEXT_DATA" &&
            node.type === "text"
              ? "text"
              : p.type === "BOOL" && ref.componentPropNodeField === "VISIBLE"
                ? "boolean"
                : p.type === "INSTANCE_SWAP" &&
                    ref.componentPropNodeField === "OVERRIDDEN_SYMBOL_ID" &&
                    node.type === "instance"
                  ? "instance"
                  : undefined;
          if (!type) {
            warnings.add(
              "Some component property bindings could not be restored.",
            );
            continue;
          }
          const id = "figprop:" + p.canonical,
            existing = properties.get(id);
          if (existing) {
            if (!propertyPaths(existing).includes(path))
              (existing.additionalTargetPaths ??= []).push(path);
            continue;
          }
          let name =
            typeof p.name === "string" && p.name.trim() ? p.name : node.name;
          if ([...properties.values()].some((v) => v.name === name))
            name += ` (${p.canonical})`;
          const preferred = (
            p.preferredValues?.instanceSwapValues ?? []
          ).flatMap((v: Raw) => {
            const target = source.find(
              (n) => n.type === "SYMBOL" && n.key === v.key,
            );
            const id = guid(target?.guid);
            if (!nativeRefs.has(id))
              warnings.add(
                "Some component property preferences or variable bindings were not restored.",
              );
            return nativeRefs.has(id) ? [id] : [];
          });
          properties.set(id, {
            id,
            name,
            type,
            targetPath: path,
            defaultValue: value(type, node),
            ...(type === "instance"
              ? { preferred: [...new Set<string>(preferred)] }
              : {}),
          });
        }
      }
      if (properties.size) root.componentProperties = [...properties.values()];
    }
  // Keep explicit assignments and inferred saved instance overrides without an initial reflow.
  for (const pool of pools)
    for (const instance of pool.filter(
      (n) => n.type === "instance" && n.componentId,
    )) {
      const def = doc.componentLibrary
        ?.find((c) => c.sourceId === instance.componentId)
        ?.nodes.find((n) => !n.parentId);
      if (!def?.componentProperties?.length) continue;
      const raw = index.get(reference(instance));
      const assignments = new Map<string, Raw>();
      for (const a of raw?.componentPropAssignments ?? []) {
        const p = resolved(guid(a.defID));
        if (p) assignments.set("figprop:" + p.canonical, a.value);
      }
      const family = new Map(
        pool
          .filter(
            (n) =>
              n.componentOwner === instance.id && n.componentPath !== undefined,
          )
          .map((n) => [n.componentPath!, n]),
      );
      for (const p of def.componentProperties) {
        const assigned = assignments.get(p.id);
        const explicit =
          p.type === "text"
            ? assigned?.textValue?.characters
            : p.type === "boolean"
              ? assigned?.boolValue
              : p.type === "instance"
                ? guid(assigned?.guidValue)
                : undefined;
        const targets = propertyPaths(p)
          .map((path) => family.get(path))
          .filter((n): n is Node => !!n);
        const boundField =
          p.type === "text"
            ? "text"
            : p.type === "boolean"
              ? "visible"
              : undefined;
        if (boundField && targets.some((n) => n.bindings?.[boundField]))
          continue;
        const current = targets.map((n) => value(p.type, n));
        const inferred =
          current.length && current.every((v) => v === current[0])
            ? current[0]
            : undefined;
        const chosen =
          explicit !== undefined && (p.type !== "instance" || explicit !== "")
            ? explicit
            : inferred;
        if (
          chosen !== undefined &&
          (explicit !== undefined || chosen !== p.defaultValue) &&
          (p.type !== "instance" || nativeRefs.has(String(chosen)))
        )
          (instance.componentValues ??= {})[p.id] = chosen;
      }
    }
  const sets: ComponentSet[] = [];
  const symbolsByParent = new Map<string, Raw[]>();
  for (const n of source)
    if (n.type === "SYMBOL") {
      const parent = guid(n.parentIndex?.guid);
      if (!symbolsByParent.has(parent)) symbolsByParent.set(parent, []);
      symbolsByParent.get(parent)!.push(n);
    }
  for (const group of source.filter((n) => n.isStateGroup)) {
    const children = symbolsByParent.get(guid(group.guid)) ?? [];
    if (!children.some((n) => nativeRefs.has(guid(n.guid)))) continue;
    const axes = (group.componentPropDefs ?? [])
      .map((p: Raw) => resolved(guid(p.id)))
      .filter((p: Raw | undefined) => p?.type === "VARIANT");
    if (!axes.length) continue;
    const variants: ComponentSet["variants"] = [];
    for (const child of children) {
      const specs = new Map<string, string>(
        (child.variantPropSpecs ?? []).map((s: Raw) => [
          resolved(guid(s.propDefId))?.canonical,
          s.value,
        ]),
      );
      const values: Record<string, string> = {};
      for (const p of axes) {
        const v = specs.has(p.canonical)
          ? specs.get(p.canonical)
          : p.initialValue?.textValue?.characters;
        if (typeof v === "string") values[p.name] = v;
      }
      if (
        Object.keys(values).length !== axes.length ||
        !nativeRefs.has(guid(child.guid))
      ) {
        warnings.add("Some component variants could not be restored.");
        continue;
      }
      variants.push({ componentId: guid(child.guid), values });
    }
    const dimensions = Object.fromEntries(
      axes.map((p: Raw) => [
        p.name,
        [...new Set(variants.map((v) => v.values[p.name]))],
      ]),
    );
    const keys = variants.map((v) =>
      JSON.stringify(
        Object.keys(dimensions)
          .sort()
          .map((k) => v.values[k]),
      ),
    );
    if (
      !variants.length ||
      new Set(keys).size !== keys.length ||
      Object.keys(dimensions).length !== axes.length
    ) {
      warnings.add("Some component variants could not be restored.");
      continue;
    }
    sets.push({
      id: "figset:" + guid(group.guid),
      name: group.name ?? "Component set",
      axes: dimensions,
      variants,
    });
  }
  if (sets.length) doc.componentSets = sets;
  else delete doc.componentSets;
}
