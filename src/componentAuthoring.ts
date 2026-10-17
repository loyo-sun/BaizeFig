import { ancestors, execute, roots, id, type Document } from "./core";
import { setComponentSet } from "./components";
export function createIndependentMain(doc: Document, mainId: string) {
  const main = doc.nodes.find((n) => n.id === mainId);
  if (!main || main.type !== "component" || main.componentOwner)
    throw Error("Select a main component");
  return execute(doc, {
    type: "duplicate",
    ids: [mainId],
    offset: 40,
    independentMain: true,
  });
}
export function createMultipleComponents(original: Document, ids: string[]) {
  const nodes = roots(original, ids);
  if (
    !nodes.length ||
    nodes.some(
      (n) =>
        n.type === "component" ||
        n.type === "instance" ||
        n.componentOwner ||
        [n, ...ancestors(original, n)].some((a) => a.locked),
    )
  )
    throw Error("Select editable layers outside instances");
  let doc = original;
  const selection: string[] = [];
  for (const n of nodes) {
    const next = execute(doc, {
      type: "group",
      ids: [n.id],
      kind: "component",
    });
    doc = next.doc;
    selection.push(...next.selection!);
  }
  return { doc, selection };
}
export function addComponentVariant(original: Document, mainId: string) {
  const next = createIndependentMain(original, mainId),
    newId = next.selection![0];
  const main = original.nodes.find((n) => n.id === mainId)!;
  const current = original.componentSets?.find((s) =>
    s.variants.some((v) => v.componentId === mainId),
  );
  const set = current
    ? structuredClone(current)
    : {
        id: id(),
        name: main.name,
        axes: { State: ["Default"] },
        variants: [{ componentId: mainId, values: { State: "Default" } }],
        defaultComponentId: mainId,
      };
  const axis = Object.keys(set.axes)[0];
  let name = "Variant 2",
    count = 2;
  while (set.axes[axis].includes(name)) name = "Variant " + ++count;
  set.axes[axis].push(name);
  set.variants.push({
    componentId: newId,
    values: {
      ...set.variants.find((v) => v.componentId === mainId)!.values,
      [axis]: name,
    },
  });
  const root = next.doc.nodes.find((n) => n.id === newId)!;
  root.name = name;
  return { doc: setComponentSet(next.doc, set), selection: next.selection };
}
