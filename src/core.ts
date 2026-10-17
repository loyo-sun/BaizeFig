import { clearVectorFillOverrides } from "./vectorFill";
import { validFontSettings, type FontSettings } from "./fontSettings";
import { equalData } from "./equalData";
import type { LibrarySubscription } from "./componentLibraries";
import { remapComponentMetadata, componentPathMapper } from "./componentRemap";
import {
  validateComponentModels,
  type ComponentProperty,
  type ComponentSet,
} from "./componentModel";
import {
  validateParagraphs,
  remapParagraphs,
  type TextParagraph,
} from "./textParagraphs";
import { validateInteractions, type PrototypeInteraction } from "./prototype";
import { nodeSelectionBounds } from "./pathBounds";
import {
  applyTypedBindings,
  bindingTypes,
  releaseEditedBindings,
  validateTypedVariables,
  type TypedVariable,
  type BindingProperty,
} from "./typedVariables";
import { resolveVariable } from "./variables";
import {
  layoutContainer,
  applyConstraints,
  type LayoutItem,
  type Track,
} from "./layout";
import { reflowText, remapTextRuns, type TextRun } from "./textLayout";
import {
  linkMainCopies,
  recordOverrides,
  synchronizeInstances,
  captureSlotContent,
  inComponentSlot,
  updatePropertyDefaults,
  updateLibraryFromMain,
} from "./components";
import { type VariableCollection, type ColorVariable } from "./variables";
import {
  type Fidelity,
  type Matrix,
  multiply,
  inverse,
  transformPoint,
  validateFidelity,
} from "./fidelity";
export type Kind =
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "text"
  | "polygon"
  | "star"
  | "path"
  | "image"
  | "group"
  | "component"
  | "instance";
export interface Node {
  id: string;
  pageId: string;
  parentId: string | null;
  type: Kind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  textFlow?: {
    fontSettings?: FontSettings;
    autoResize: "fixed" | "height" | "both";
    truncation?: "ending";
    verticalAlign: "top" | "center" | "bottom";
    letterSpacing: number;
    runs?: TextRun[];
    paragraphs?: TextParagraph[];
    direction?: "auto" | "ltr" | "rtl";
    paragraphSpacing?: number;
    spellCheck?: boolean;
    language?: string;
  };
  componentSetId?: string;
  exposedNestedInstances?: string[];
  componentDescription?: string;
  componentDocumentation?: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  fidelity?: Fidelity;
  frameGrid?: {
    axis: "columns" | "rows";
    count: number;
    gap: number;
    margin: number;
    visible: boolean;
  };
  layoutItem?: LayoutItem;
  constraints?: {
    horizontal: "min" | "center" | "max" | "stretch" | "scale";
    vertical: "min" | "center" | "max" | "stretch" | "scale";
  };
  importedLayout?: {
    padding: [number, number, number, number];
    primary: "fixed" | "hug";
    counter: "fixed" | "hug";
    justify:
      | "start"
      | "center"
      | "end"
      | "space-between"
      | "space-around"
      | "space-evenly";
    align: "start" | "center" | "end" | "baseline" | "stretch";
    wrap?: boolean;
    counterGap?: number;
    grid?: {
      columns: Track[];
      rows: Track[];
      columnGap: number;
      rowGap: number;
    };
    absolute?: boolean;
  };
  image?: string;
  points?: { x: number; y: number }[];
  layout?: "none" | "horizontal" | "vertical" | "grid";
  gap?: number;
  padding?: number;
  componentProperties?: ComponentProperty[];
  componentValues?: Record<string, string | boolean>;
  componentSlots?: Record<string, Node[]>;
  componentSlot?: boolean;
  componentSlotKey?: string;
  componentId?: string;
  componentOwner?: string;
  componentPath?: string;
  componentOverrides?: Record<string, Partial<Node>>;
  componentClears?: Record<string, string[]>;
  variableModes?: Record<string, string>;
  bindings?: Partial<Record<BindingProperty, string>>;
  interactions?: PrototypeInteraction[];
  prototypeScroll?: "none" | "horizontal" | "vertical" | "both";
  targetId?: string;
  variableId?: string;
}
export interface Page {
  id: string;
  name: string;
}
export interface Guide {
  id: string;
  pageId: string;
  axis: "x" | "y";
  position: number;
}
export interface Document {
  componentSets?: ComponentSet[];
  libraries?: LibrarySubscription[];
  guides?: Guide[];
  format: "baizefig";
  version: 1;
  id: string;
  name: string;
  pages: Page[];
  nodes: Node[];
  background: string;
  componentLibrary?: {
    sourceId: string;
    name: string;
    nodes: Node[];
    libraryId?: string;
    libraryRevision?: number;
    missing?: boolean;
    deleted?: boolean;
    localEdits?: boolean;
  }[];
  variableCollections?: VariableCollection[];
  variables?: ColorVariable[];
  typedVariables?: TypedVariable[];
}
export type Command =
  | {
      type: "reparent";
      ids: string[];
      parentId: string | null;
      targetId?: string;
      after?: boolean;
    }
  | { type: "create"; nodes: Node[] }
  | { type: "update"; ids: string[]; patch: Partial<Node> }
  | { type: "delete"; ids: string[] }
  | { type: "group"; ids: string[]; kind?: "group" | "frame" | "component" }
  | { type: "ungroup"; ids: string[] }
  | {
      type: "duplicate";
      ids: string[];
      offset?: number;
      independentMain?: boolean;
    }
  | {
      type: "order";
      ids: string[];
      direction: "front" | "back" | "forward" | "backward";
    }
  | {
      type: "align";
      ids: string[];
      axis: "left" | "center" | "right" | "top" | "middle" | "bottom";
    }
  | {
      type: "layout";
      id: string;
      direction: "none" | "horizontal" | "vertical" | "grid";
      gap?: number;
      padding?: number;
    };
export const id = () => crypto.randomUUID();
export const container = (n: Node) =>
  ["frame", "group", "component", "instance"].includes(n.type);
export function makeNode(
  type: Kind,
  pageId: string,
  patch: Partial<Node> = {},
): Node {
  return {
    id: id(),
    pageId,
    parentId: null,
    type,
    name: type[0].toUpperCase() + type.slice(1),
    x: 0,
    y: 0,
    width: 160,
    height: 100,
    rotation: 0,
    fill:
      type === "frame" ? "#ffffff" : type === "text" ? "#202a24" : "#c5c8d0",
    stroke: "#202a24",
    strokeWidth: type === "line" || type === "path" ? 2 : 0,
    radius: 0,
    opacity: 1,
    visible: true,
    locked: false,
    ...(type === "text"
      ? {
          textFlow: {
            autoResize: "height" as const,
            verticalAlign: "top" as const,
            letterSpacing: 0,
          },
        }
      : {}),
    text: "Text",
    fontSize: 24,
    fontFamily: "Inter, Arial, sans-serif",
    fontWeight: 400,
    textAlign: "left",
    lineHeight: 1.4,
    ...patch,
  };
}
export function emptyDocument(): Document {
  return {
    format: "baizefig",
    version: 1,
    id: id(),
    name: "Untitled",
    pages: [{ id: id(), name: "Page 1" }],
    nodes: [],
    background: "#f5f5f5",
  };
}
export function localTransform(n: Node): Matrix {
  const r = (n.rotation * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r),
    cx = n.width / 2,
    cy = n.height / 2;
  const rotate: Matrix = [
    c,
    s,
    -s,
    c,
    n.x + cx - c * cx + s * cy,
    n.y + cy - s * cx - c * cy,
  ];
  const linear = n.fidelity?.linear;
  return linear ? multiply(rotate, [...linear, 0, 0]) : rotate;
}
export function worldTransform(doc: Document, n: Node): Matrix {
  let m = localTransform(n),
    p = n.parentId;
  const seen = new Set([n.id]);
  while (p) {
    if (seen.has(p)) throw Error("Cyclic node tree");
    seen.add(p);
    const parent = doc.nodes.find((a) => a.id === p);
    if (!parent) break;
    m = multiply(localTransform(parent), m);
    p = parent.parentId;
  }
  return m;
}
export function absolute(doc: Document, n: Node): { x: number; y: number } {
  return transformPoint(worldTransform(doc, n), 0, 0);
}
export function setWorldTransform(doc: Document, n: Node, world: Matrix) {
  const parent = doc.nodes.find((a) => a.id === n.parentId),
    m = parent ? multiply(inverse(worldTransform(doc, parent)), world) : world;
  n.x = m[4];
  n.y = m[5];
  n.rotation = 0;
  n.fidelity = {
    ...n.fidelity,
    size: n.fidelity?.size ?? [n.width, n.height],
    linear: [m[0], m[1], m[2], m[3]],
  };
}
export function localDelta(doc: Document, n: Node, dx: number, dy: number) {
  const parent = doc.nodes.find((a) => a.id === n.parentId);
  if (!parent) return { x: dx, y: dy };
  const m = inverse(worldTransform(doc, parent));
  return { x: m[0] * dx + m[2] * dy, y: m[1] * dx + m[3] * dy };
}
export function descendants(doc: Document, ids: string[]): string[] {
  const all = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of doc.nodes)
      if (n.parentId && all.has(n.parentId) && !all.has(n.id)) {
        all.add(n.id);
        changed = true;
      }
  }
  return [...all];
}
export function roots(doc: Document, ids: string[]): Node[] {
  const set = new Set(ids);
  return doc.nodes.filter(
    (n) => set.has(n.id) && !ancestors(doc, n).some((p) => set.has(p.id)),
  );
}
export function ancestors(doc: Document, n: Node): Node[] {
  const out: Node[] = [];
  let p = n.parentId;
  while (p) {
    const parent = doc.nodes.find((a) => a.id === p);
    if (!parent || out.includes(parent)) break;
    out.push(parent);
    p = parent.parentId;
  }
  return out;
}
export function bounds(doc: Document, nodes: Node[]) {
  if (!nodes.length) return { x: 0, y: 0, width: 1, height: 1 };
  const b = nodes.map((n) => {
    const m = worldTransform(doc, n),
      box = nodeSelectionBounds(n),
      points = [
        [box.x, box.y],
        [box.x + box.width, box.y],
        [box.x, box.y + box.height],
        [box.x + box.width, box.y + box.height],
      ].map(([x, y]) => transformPoint(m, x, y));
    const x = Math.min(...points.map((p) => p.x)),
      y = Math.min(...points.map((p) => p.y));
    return {
      x,
      y,
      width: Math.max(...points.map((p) => p.x)) - x,
      height: Math.max(...points.map((p) => p.y)) - y,
    };
  });
  const x = Math.min(...b.map((n) => n.x)),
    y = Math.min(...b.map((n) => n.y));
  return {
    x,
    y,
    width: Math.max(...b.map((n) => n.x + n.width)) - x,
    height: Math.max(...b.map((n) => n.y + n.height)) - y,
  };
}
export function relayout(doc: Document, affected: Set<string>) {
  for (let pass = 0; pass < Math.min(128, doc.nodes.length + 2); pass++) {
    let changed = false;
    for (const n of [...doc.nodes].reverse()) {
      if (!n.layout || n.layout === "none") continue;
      if (!affected.has(n.id)) continue;
      if (!n.importedLayout) {
        const padding = n.padding ?? 16;
        n.gap ??= 12;
        n.importedLayout = {
          padding: [padding, padding, padding, padding],
          primary: "hug",
          counter: "hug",
          justify: "start",
          align: "start",
        };
      }
      if (n.importedLayout) {
        if (!affected.has(n.id)) continue;
        const family = [n, ...doc.nodes.filter((c) => c.parentId === n.id)],
          before = family.map((c) => [c.x, c.y, c.width, c.height]);
        layoutContainer(n, family.slice(1));
        family.forEach((c, i) => {
          if (
            [c.x, c.y, c.width, c.height].some(
              (v, k) => Math.abs(v - before[i][k]) > 1e-6,
            )
          ) {
            changed = true;
            affected.add(c.id);
          }
        });
        continue;
      }
    }
    if (!changed) break;
    if (pass === Math.min(128, doc.nodes.length + 2) - 1)
      throw Error("Auto layout could not converge; check Hug and Fill sizing");
  }
}
export function reflowAfterPointerEdit(
  original: Document,
  updated: Document,
): Document {
  const doc = structuredClone(updated),
    originalById = new Map(original.nodes.map((n) => [n.id, n])),
    affected = new Set<string>();
  for (const n of doc.nodes) {
    const previous = originalById.get(n.id);
    if (!previous) {
      affected.add(n.id);
      for (const parent of ancestors(doc, n)) affected.add(parent.id);
      continue;
    }
    if (n.width !== previous.width || n.height !== previous.height) {
      n.layoutItem = {
        ...n.layoutItem,
        ...(n.width !== previous.width
          ? { horizontalSizing: "fixed" as const }
          : {}),
        ...(n.height !== previous.height
          ? { verticalSizing: "fixed" as const }
          : {}),
      };
    }
    if (
      n.type === "text" &&
      n.textFlow &&
      (n.width !== previous.width || n.height !== previous.height)
    ) {
      n.textFlow.autoResize = n.height !== previous.height ? "fixed" : "height";
    }
    if (
      n.width !== previous.width ||
      n.height !== previous.height ||
      n.x !== previous.x ||
      n.y !== previous.y
    ) {
      if (n.type === "text" && n.width !== previous.width) {
        if (n.fidelity) delete n.fidelity.text;
        reflowText(n);
      }
      affected.add(n.id);
      for (const parent of ancestors(doc, n)) affected.add(parent.id);
    }
  }
  for (const n of doc.nodes) {
    const prev = original.nodes.find((a) => a.id === n.id);
    if (prev) {
      const patch: Partial<Node> = {};
      for (const key of ["x", "y", "width", "height", "rotation"] as const)
        if (n[key] !== prev[key]) patch[key] = n[key];
      if (
        JSON.stringify(n.fidelity?.linear) !==
          JSON.stringify(prev.fidelity?.linear) &&
        n.fidelity
      )
        patch.fidelity = { size: n.fidelity.size, linear: n.fidelity.linear };
      if (Object.keys(patch).length) recordOverrides(doc, [n.id], patch);
    }
  }
  captureSlotContent(original, doc);
  updateLibraryFromMain(doc, [...affected]);
  synchronizeInstances(doc, [...affected]);
  applyConstraints(original, doc);
  relayout(doc, affected);
  updateLibraryFromMain(doc, [...affected]);
  validateDocument(doc);
  return doc;
}
export function execute(
  original: Document,
  command: Command,
): { doc: Document; selection?: string[] } {
  const doc = structuredClone(original),
    originalById = new Map(original.nodes.map((n) => [n.id, n]));
  let selection: string[] | undefined;
  const writable = (n: Node) =>
    !n.locked && !ancestors(doc, n).some((p) => p.locked);
  if (
    [
      "create",
      "delete",
      "group",
      "ungroup",
      "duplicate",
      "order",
      "reparent",
    ].includes(command.type)
  ) {
    const ids =
      command.type === "create"
        ? command.nodes
            .map((n) => n.parentId)
            .filter((id): id is string => !!id)
        : "ids" in command
          ? command.ids
          : [];
    if (
      doc.nodes.some(
        (n) =>
          ids.includes(n.id) &&
          n.componentOwner &&
          !inComponentSlot(doc, n, command.type === "create") &&
          (command.type === "create" ||
            (n.componentOwner !== n.id && !ids.includes(n.componentOwner))),
      )
    )
      throw Error("Detach instance before changing its layer structure");
  }
  if (command.type === "update" || command.type === "align") {
    const restricted = doc.nodes.filter(
      (n) =>
        command.ids.includes(n.id) &&
        n.componentOwner &&
        n.componentOwner !== n.id &&
        !inComponentSlot(doc, n),
    );
    if (
      restricted.some(
        (n) =>
          command.type === "align" ||
          Object.keys(command.patch).some(
            (k) =>
              ["x", "y", "constraints", "layoutItem"].includes(k) ||
              (n.type === "text" && ["width", "height"].includes(k)),
          ),
      )
    )
      throw Error("Edit the main component to change instance layer geometry");
  }
  switch (command.type) {
    case "create":
      doc.nodes.push(...structuredClone(command.nodes));
      selection = command.nodes.map((n) => n.id);
      break;
    case "update":
      for (const n of doc.nodes)
        if (
          command.ids.includes(n.id) &&
          (writable(n) ||
            Object.keys(command.patch).every((k) => k === "locked"))
        ) {
          if (command.patch.type && command.patch.type !== "path")
            throw Error("Only vector path conversion is supported");
          const allowed = new Set([
            "type",
            "componentProperties",
            "exposedNestedInstances",
            "componentDescription",
            "componentDocumentation",
            "componentValues",
            "componentSlots",
            "layoutItem",
            "frameGrid",
            "constraints",
            "textFlow",
            "fidelity",
            "importedLayout",
            "name",
            "x",
            "y",
            "width",
            "height",
            "rotation",
            "fill",
            "stroke",
            "strokeWidth",
            "radius",
            "opacity",
            "visible",
            "locked",
            "text",
            "fontSize",
            "fontFamily",
            "fontWeight",
            "textAlign",
            "lineHeight",
            "image",
            "points",
            "layout",
            "gap",
            "padding",
            "targetId",
            "interactions",
            "prototypeScroll",
            "variableId",
            "variableModes",
            "bindings",
          ]);
          const patch = Object.fromEntries(
            Object.entries(command.patch).filter(([key]) => allowed.has(key)),
          );
          if (
            n.fidelity?.text &&
            [
              "text",
              "fontSize",
              "fontFamily",
              "fontWeight",
              "lineHeight",
              "textAlign",
              "width",
            ].some((key) => key in patch)
          ) {
            n.fidelity = structuredClone(n.fidelity);
            delete n.fidelity.text;
          }
          if (n.textFlow?.paragraphs && typeof patch.text === "string")
            n.textFlow.paragraphs = remapParagraphs(
              n.text,
              patch.text,
              n.textFlow.paragraphs,
            );
          if (n.textFlow?.runs) {
            if (typeof patch.text === "string")
              n.textFlow.runs = remapTextRuns(
                n.text,
                patch.text,
                n.textFlow.runs,
              );
            for (const run of n.textFlow.runs)
              for (const field of [
                "fontSize",
                "fontFamily",
                "fontWeight",
                "fill",
              ] as const)
                if (field in patch) delete run[field];
          }
          if ("fontWeight" in patch && !("textFlow" in patch)) {
            if (n.textFlow?.fontSettings?.variations)
              delete n.textFlow.fontSettings.variations.wght;
            for (const run of n.textFlow?.runs ?? [])
              if (run.fontSettings?.variations)
                delete run.fontSettings.variations.wght;
          }
          releaseEditedBindings(n, patch);
          if (
            typeof patch.radius === "number" &&
            n.fidelity?.corners &&
            !patch.fidelity
          )
            n.fidelity = {
              ...n.fidelity,
              corners: [
                patch.radius!,
                patch.radius!,
                patch.radius!,
                patch.radius!,
              ],
            };
          const keepSavedGlyphs =
            !!n.fidelity?.text?.glyphCache &&
            !Object.keys(patch).some((k) =>
              [
                "text",
                "fontSize",
                "fontFamily",
                "fontWeight",
                "lineHeight",
                "textAlign",
                "width",
                "fidelity",
              ].includes(k),
            ) &&
            (patch.textFlow === undefined ||
              sameTextLayout(
                n.textFlow,
                patch.textFlow as Node["textFlow"],
                !!n.fidelity?.text?.decorations?.length,
              ));
          Object.assign(n, patch);
          if (keepSavedGlyphs && n.fidelity?.text && patch.textFlow) {
            n.fidelity = structuredClone(n.fidelity);
            n.fidelity.text!.spans = n.textFlow?.runs;
          }
          if (
            [
              "text",
              "fontSize",
              "fontFamily",
              "fontWeight",
              "lineHeight",
              "textAlign",
              "width",
              "textFlow",
            ].some((k) => k in patch)
          )
            if (!keepSavedGlyphs) reflowText(n);
          if ("fill" in patch && !("variableId" in patch)) {
            delete n.variableId;
            if (
              n.fidelity?.paints &&
              !(patch.fidelity as Node["fidelity"])?.paints
            )
              delete n.fidelity.paints;
            // A layer-level fill replaces per-region fills too. Explicit fidelity
            // edits remain authoritative for the advanced region paint editor.
            if (!patch.fidelity) clearVectorFillOverrides(n);
          }
        }
      break;
    case "delete": {
      const set = new Set(
        descendants(
          doc,
          roots(doc, command.ids)
            .filter(writable)
            .map((n) => n.id),
        ),
      );
      // Keep definitions as tombstones so surviving instances can restore their main.
      for (const main of doc.nodes.filter(
        (n) => n.type === "component" && set.has(n.id),
      )) {
        const familyIds = new Set(descendants(doc, [main.id]));
        const family = structuredClone(
          doc.nodes.filter((n) => familyIds.has(n.id)),
        );
        const root = family.find((n) => n.id === main.id)!;
        const matrix = worldTransform(doc, main);
        root.parentId = null;
        root.x = matrix[4];
        root.y = matrix[5];
        root.rotation = 0;
        root.fidelity = {
          ...root.fidelity,
          size: root.fidelity?.size ?? [root.width, root.height],
          linear: matrix.slice(0, 4) as [number, number, number, number],
        };
        doc.componentLibrary ??= [];
        const references = new Set([
          main.id,
          ...(main.fidelity?.sourceId ? [main.fidelity.sourceId] : []),
        ]);
        const previousEntries = doc.componentLibrary;
        doc.componentLibrary = previousEntries.filter(
          (c) => !references.has(c.sourceId),
        );
        for (const reference of references)
          doc.componentLibrary.push({
            ...previousEntries.find((c) => c.sourceId === reference),
            sourceId: reference,
            name: main.name,
            nodes: structuredClone(family),
            deleted: true,
          });
      }
      doc.nodes = doc.nodes.filter((n) => !set.has(n.id));
      for (const n of doc.nodes) {
        if (n.targetId && set.has(n.targetId)) delete n.targetId;
        if (n.interactions)
          n.interactions = n.interactions
            .map((i) => ({
              ...i,
              actions: i.actions.filter((a) =>
                a.type === "changeTo"
                  ? !set.has(a.componentId) ||
                    !!doc.componentLibrary?.some(
                      (c) => c.sourceId === a.componentId && c.deleted,
                    )
                  : !("targetId" in a) || !set.has(a.targetId),
              ),
            }))
            .filter((i) => i.actions.length);
      }
      selection = [];
      break;
    }
    case "group": {
      const nodes = roots(doc, command.ids).filter(writable);
      if (!nodes.length) break;
      if (new Set(nodes.map((n) => n.pageId)).size > 1)
        throw Error("Cannot group across pages");
      const b = bounds(doc, nodes);
      const parentId = nodes.every((n) => n.parentId === nodes[0].parentId)
        ? nodes[0].parentId
        : null;
      const parent = doc.nodes.find((n) => n.id === parentId);
      const origin = parent ? absolute(doc, parent) : { x: 0, y: 0 };
      const group = makeNode(command.kind ?? "group", nodes[0].pageId, {
        ...b,
        x: b.x - origin.x,
        y: b.y - origin.y,
        parentId,
        fill: command.kind === "frame" ? "#ffffff" : "none",
        name:
          command.kind === "component"
            ? "Component"
            : command.kind === "frame"
              ? "Frame"
              : "Group",
      });
      const index = Math.min(...nodes.map((n) => doc.nodes.indexOf(n)));
      doc.nodes.splice(index, 0, group);
      setWorldTransform(doc, group, [1, 0, 0, 1, b.x, b.y]);
      for (const n of nodes) {
        const originalNode = original.nodes.find((a) => a.id === n.id)!;
        const matrix = worldTransform(original, originalNode);
        n.parentId = group.id;
        setWorldTransform(doc, n, matrix);
      }
      selection = [group.id];
      break;
    }
    case "ungroup": {
      const selected: string[] = [];
      for (const n of roots(doc, command.ids).filter(writable)) {
        if (!container(n)) continue;
        for (const c of doc.nodes.filter((c) => c.parentId === n.id)) {
          const matrix = worldTransform(doc, c);
          c.parentId = n.parentId;
          setWorldTransform(doc, c, matrix);
          selected.push(c.id);
        }
        doc.nodes = doc.nodes.filter((c) => c.id !== n.id);
      }
      selection = selected;
      break;
    }
    case "duplicate": {
      const selected = roots(doc, command.ids);
      const variantCopies = new Map(
        selected.flatMap((n) => {
          const set = doc.componentSets?.find((s) =>
            s.variants.some((v) => v.componentId === n.id),
          );
          return !command.independentMain &&
            n.type === "component" &&
            set &&
            doc.nodes.find((p) => p.id === n.parentId)?.componentSetId ===
              set.id
            ? [[n.id, set] as const]
            : [];
        }),
      );
      const all = descendants(
        doc,
        selected.map((n) => n.id),
      );
      const map = new Map(all.map((a) => [a, id()]));
      const copiedSets = (doc.componentSets ?? []).filter(
        (s) =>
          selected.some((n) => n.componentSetId === s.id) &&
          s.variants.every((v) => map.has(v.componentId)),
      );
      const setIds = new Map(copiedSets.map((s) => [s.id, id()]));
      const clones = doc.nodes
        .filter((n) => all.includes(n.id))
        .map((n) => ({
          ...structuredClone(n),
          id: map.get(n.id)!,
          componentSetId: n.componentSetId
            ? setIds.get(n.componentSetId)
            : undefined,
          parentId: n.parentId ? (map.get(n.parentId) ?? n.parentId) : null,
          x:
            n.x +
            (selected.some((r) => r.id === n.id) ? (command.offset ?? 20) : 0),
          y:
            n.y +
            (selected.some((r) => r.id === n.id) ? (command.offset ?? 20) : 0),
          name:
            (command.independentMain || variantCopies.size > 0) &&
            !selected.some((r) => r.id === n.id)
              ? n.name
              : n.name + " copy",
          componentSlotKey: n.componentSlotKey
            ? (map.get(n.id) ?? n.componentSlotKey)
            : undefined,
          componentOwner: n.componentOwner
            ? (map.get(n.componentOwner) ?? n.componentOwner)
            : undefined,
          componentId: n.componentId
            ? (map.get(n.componentId) ?? n.componentId)
            : undefined,
          targetId: n.targetId
            ? (map.get(n.targetId) ?? n.targetId)
            : undefined,
        }));
      const remapPath = componentPathMapper(
        original.nodes.filter((n) => all.includes(n.id)),
        map,
      );
      for (const clone of clones) {
        remapComponentMetadata(
          clone,
          remapPath,
          (ref) => map.get(ref) ?? ref,
          clone.pageId,
          map,
        );
        if (clone.targetId)
          clone.targetId = map.get(clone.targetId) ?? clone.targetId;
        if (clone.interactions)
          clone.interactions = clone.interactions.map((i) => ({
            ...i,
            actions: i.actions.map((a) =>
              "targetId" in a
                ? { ...a, targetId: map.get(a.targetId) ?? a.targetId }
                : a.type === "changeTo"
                  ? {
                      ...a,
                      componentId: map.get(a.componentId) ?? a.componentId,
                    }
                  : a,
            ),
          }));
      }
      if (!command.independentMain)
        linkMainCopies(
          original,
          clones,
          map,
          selected.filter((n) => !variantCopies.has(n.id)).map((n) => n.id),
        );
      for (const [sourceId, set] of variantCopies) {
        const originalVariant = set.variants.find(
          (v) => v.componentId === sourceId,
        )!;
        const axis = Object.keys(set.axes)[0];
        let index = 2,
          label = "Variant 2";
        while (set.axes[axis].includes(label)) label = "Variant " + ++index;
        set.axes[axis].push(label);
        set.variants.push({
          componentId: map.get(sourceId)!,
          values: { ...originalVariant.values, [axis]: label },
        });
        const clone = clones.find((n) => n.id === map.get(sourceId))!;
        clone.name = label;
        const source = doc.nodes.find((n) => n.id === sourceId)!;
        if (command.offset === undefined) {
          clone.x = source.x;
          clone.y =
            Math.max(
              ...doc.nodes
                .filter((n) => n.parentId === source.parentId)
                .map((n) => n.y + n.height),
            ) + 20;
        }
        const parent = doc.nodes.find((n) => n.id === clone.parentId);
        if (parent)
          parent.height = Math.max(parent.height, clone.y + clone.height + 20);
      }
      doc.nodes.push(...clones);
      for (const set of copiedSets)
        doc.componentSets!.push({
          ...structuredClone(set),
          id: setIds.get(set.id)!,
          defaultComponentId: set.defaultComponentId
            ? map.get(set.defaultComponentId)
            : undefined,
          variants: set.variants.map((v) => ({
            ...v,
            componentId: map.get(v.componentId)!,
          })),
        });
      synchronizeInstances(doc);
      selection = selected.map((n) => map.get(n.id)!);
      break;
    }
    case "order": {
      for (const n of roots(doc, command.ids)) {
        if (!writable(n)) continue;
        const block = doc.nodes.filter((a) =>
          descendants(doc, [n.id]).includes(a.id),
        );
        doc.nodes = doc.nodes.filter((a) => !block.includes(a));
        const siblings = doc.nodes.filter(
          (a) => a.parentId === n.parentId && a.pageId === n.pageId,
        );
        let idx =
          command.direction === "back"
            ? doc.nodes.findIndex(
                (a) => a.parentId === n.parentId && a.pageId === n.pageId,
              )
            : doc.nodes.length;
        if (
          command.direction === "forward" ||
          command.direction === "backward"
        ) {
          const old = original.nodes.indexOf(
            original.nodes.find((a) => a.id === n.id)!,
          );
          const neighbor =
            command.direction === "forward"
              ? siblings.find(
                  (s) =>
                    original.nodes.indexOf(
                      original.nodes.find((a) => a.id === s.id)!,
                    ) > old,
                )
              : [...siblings]
                  .reverse()
                  .find(
                    (s) =>
                      original.nodes.indexOf(
                        original.nodes.find((a) => a.id === s.id)!,
                      ) < old,
                  );
          if (neighbor) {
            const family = descendants(doc, [neighbor.id]);
            idx =
              command.direction === "forward"
                ? Math.max(
                    ...doc.nodes.map((a, i) =>
                      family.includes(a.id) ? i : -1,
                    ),
                  ) + 1
                : doc.nodes.indexOf(neighbor);
          } else
            idx =
              command.direction === "forward"
                ? doc.nodes.length
                : Math.max(
                    0,
                    doc.nodes.findIndex((a) => a.parentId === n.parentId),
                  );
        }
        doc.nodes.splice(Math.max(0, idx), 0, ...block);
      }
      break;
    }
    case "reparent": {
      const nodes = roots(doc, command.ids);
      if (
        !nodes.length ||
        nodes.some(
          (n) =>
            !writable(n) ||
            !n.visible ||
            ancestors(doc, n).some((a) => !a.visible),
        )
      )
        throw Error("Select unlocked visible layers");
      const parent = command.parentId
        ? doc.nodes.find((n) => n.id === command.parentId)
        : undefined;
      if (
        command.parentId &&
        (!parent || !container(parent) || !writable(parent) || !parent.visible)
      )
        throw Error("Invalid drop target");
      if (
        parent &&
        (parent.componentOwner || parent.type === "instance") &&
        !inComponentSlot(doc, parent, true)
      )
        throw Error("Detach instance before changing its layer structure");
      const ids = new Set(
        descendants(
          doc,
          nodes.map((n) => n.id),
        ),
      );
      if (parent && ids.has(parent.id))
        throw Error("Cannot move layers into their descendants");
      if (nodes.some((n) => n.pageId !== (parent?.pageId ?? nodes[0].pageId)))
        throw Error("Layers must belong to the same page");
      const target = command.targetId
        ? doc.nodes.find((n) => n.id === command.targetId)
        : undefined;
      if (
        command.targetId &&
        (!target ||
          target.parentId !== command.parentId ||
          target.pageId !== nodes[0].pageId ||
          ids.has(target.id))
      )
        throw Error("Invalid drop target");
      const transforms = nodes.map((n) => worldTransform(doc, n));
      const block = doc.nodes.filter((n) => ids.has(n.id));
      doc.nodes = doc.nodes.filter((n) => !ids.has(n.id));
      nodes.forEach((n, i) => {
        n.parentId = command.parentId;
        const oldNode = original.nodes.find((c) => c.id === n.id);
        if (
          !inComponentSlot(doc, n) &&
          oldNode &&
          inComponentSlot(original, oldNode)
        ) {
          const family = new Set(descendants({ ...doc, nodes: block }, [n.id]));
          for (const member of block.filter((c) => family.has(c.id))) {
            delete member.componentOwner;
            delete member.componentPath;
            delete member.componentSlot;
          }
        }

        setWorldTransform(doc, n, transforms[i]);
      });
      let index = doc.nodes.length;
      if (target) {
        index = doc.nodes.indexOf(target);
        if (command.after) {
          const family = new Set(descendants(doc, [target.id]));
          index =
            Math.max(...doc.nodes.map((n, i) => (family.has(n.id) ? i : -1))) +
            1;
        }
      }
      doc.nodes.splice(index, 0, ...block);
      selection = nodes.map((n) => n.id);
      break;
    }
    case "align": {
      const nodes = roots(doc, command.ids).filter(writable);
      if (nodes.length < 2) break;
      const b = bounds(doc, nodes);
      for (const n of nodes) {
        const box = bounds(doc, [n]),
          m = worldTransform(doc, n);
        switch (command.axis) {
          case "left":
            m[4] += b.x - box.x;
            break;
          case "center":
            m[4] += b.x + b.width / 2 - box.x - box.width / 2;
            break;
          case "right":
            m[4] += b.x + b.width - box.x - box.width;
            break;
          case "top":
            m[5] += b.y - box.y;
            break;
          case "middle":
            m[5] += b.y + b.height / 2 - box.y - box.height / 2;
            break;
          case "bottom":
            m[5] += b.y + b.height - box.y - box.height;
            break;
        }
        setWorldTransform(doc, n, m);
      }
      break;
    }
    case "layout": {
      const n = doc.nodes.find((n) => n.id === command.id);
      if (!n || !container(n) || !writable(n))
        throw Error("Select an unlocked frame or group");
      if (n.importedLayout && command.padding !== undefined)
        n.importedLayout.padding = [
          command.padding,
          command.padding,
          command.padding,
          command.padding,
        ];
      if (command.direction === "grid" && !n.importedLayout)
        n.importedLayout = {
          padding: [16, 16, 16, 16],
          primary: "fixed",
          counter: "hug",
          justify: "start",
          align: "stretch",
          grid: {
            columns: [
              { kind: "fr", value: 1 },
              { kind: "fr", value: 1 },
            ],
            rows: [],
            columnGap: command.gap ?? 12,
            rowGap: command.gap ?? 12,
          },
        };
      Object.assign(n, {
        layout: command.direction,
        gap: command.gap ?? n.gap ?? 12,
        padding: command.padding ?? n.padding ?? 16,
      });
      break;
    }
  }
  if (command.type === "update") {
    recordOverrides(doc, command.ids, command.patch);
    for (const node of doc.nodes.filter(
      (n) => command.ids.includes(n.id) && n.bindings,
    ))
      recordOverrides(doc, [node.id], { bindings: node.bindings });
    if (
      ["text", "fontSize", "fontFamily", "fontWeight", "fill"].some(
        (k) => k in command.patch,
      )
    )
      for (const n of doc.nodes.filter(
        (n) => command.ids.includes(n.id) && n.textFlow,
      ))
        recordOverrides(doc, [n.id], { textFlow: n.textFlow });
  }
  const modified = [
    ...(command.type === "create"
      ? command.nodes.map((n) => n.id)
      : command.type === "layout"
        ? [command.id]
        : "ids" in command
          ? command.ids
          : []),
  ];
  for (const changed of original.nodes.filter((n) => modified.includes(n.id)))
    for (const parent of ancestors(original, changed))
      if (!modified.includes(parent.id)) modified.push(parent.id);
  for (const changed of doc.nodes.filter((n) => modified.includes(n.id)))
    for (const parent of ancestors(doc, changed))
      if (!modified.includes(parent.id)) modified.push(parent.id);
  captureSlotContent(original, doc);
  if (command.type === "update" && !command.patch.componentProperties)
    updatePropertyDefaults(doc, command.ids);
  updateLibraryFromMain(doc, modified);
  synchronizeInstances(doc, modified);
  for (const n of doc.nodes) {
    if (n.variableId) {
      const variable = doc.variables?.find((v) => v.id === n.variableId);
      if (variable) n.fill = resolveVariable(doc, n.variableId, new Set(), n);
    }
  }
  applyTypedBindings(doc);
  const affected = new Set<string>();
  if (command.type === "reparent")
    for (const n of original.nodes.filter((n) => command.ids.includes(n.id)))
      for (const p of ancestors(original, n)) affected.add(p.id);
  for (const node of doc.nodes) {
    const old = originalById.get(node.id);
    if (
      old &&
      (["width", "height", "x", "y", "text", "visible", "gap"].some(
        (k) => (old as any)[k] !== (node as any)[k],
      ) ||
        !equalData(old.importedLayout, node.importedLayout) ||
        !equalData(old.layoutItem, node.layoutItem))
    ) {
      affected.add(node.id);
      ancestors(doc, node).forEach((n) => affected.add(n.id));
    }
  }
  const geometry =
    command.type !== "update" ||
    Object.keys(command.patch).some((k) =>
      [
        "x",
        "y",
        "width",
        "height",
        "text",
        "fontSize",
        "fontFamily",
        "fontWeight",
        "lineHeight",
        "layout",
        "gap",
        "padding",
        "visible",
        "importedLayout",
        "layoutItem",
        "textFlow",
        "constraints",
      ].includes(k),
    );
  if (geometry) {
    const ids =
      command.type === "layout"
        ? [command.id]
        : command.type === "create"
          ? command.nodes.map((n) => n.id)
          : "ids" in command
            ? command.ids
            : [];
    for (const id of ids) {
      const node =
        doc.nodes.find((n) => n.id === id) ??
        original.nodes.find((n) => n.id === id);
      if (node) {
        affected.add(id);
        for (const parent of ancestors(doc, node)) affected.add(parent.id);
      }
    }
  }
  applyConstraints(original, doc);
  relayout(doc, affected);
  updateLibraryFromMain(doc, [...affected, ...modified]);
  validateDocument(doc);
  return { doc, selection };
}
export function validateDocument(
  value: unknown,
  validationDepth = 0,
  prototypeContext?: Document,
): asserts value is Document {
  if (validationDepth > 40)
    throw Error("Component snapshot nesting exceeds limits");
  const d = value as Document;
  if (
    !d ||
    d.format !== "baizefig" ||
    d.version !== 1 ||
    typeof d.id !== "string" ||
    typeof d.name !== "string" ||
    !Array.isArray(d.pages) ||
    !d.pages.length ||
    !Array.isArray(d.nodes) ||
    d.nodes.length > 50000
  )
    throw Error("Invalid BaizeFig document or unsupported version");
  if (!/^#[\da-f]{3,8}$/i.test(d.background)) throw Error("Invalid background");
  if (
    d.variables &&
    (!Array.isArray(d.variables) ||
      new Set(d.variables.map((v) => v.id)).size !== d.variables.length ||
      d.variables.some(
        (v) =>
          typeof v.id !== "string" ||
          typeof v.name !== "string" ||
          !/^#[\da-f]{6}([\da-f]{2})?$/i.test(v.value),
      ))
  )
    throw Error("Invalid color variables");
  if (
    d.variableCollections &&
    (!Array.isArray(d.variableCollections) ||
      new Set(d.variableCollections.map((c) => c.id)).size !==
        d.variableCollections.length ||
      d.variableCollections.some(
        (c) =>
          typeof c.id !== "string" ||
          typeof c.name !== "string" ||
          !Array.isArray(c.modes) ||
          !c.modes.length ||
          c.modes.length > 100 ||
          new Set(c.modes.map((m) => m.id)).size !== c.modes.length ||
          c.modes.some(
            (m) => typeof m.id !== "string" || typeof m.name !== "string",
          ) ||
          !c.modes.some((m) => m.id === c.activeMode),
      ))
  )
    throw Error("Invalid variable mode");
  for (const variable of d.variables ?? []) {
    if (
      variable.collectionId &&
      !d.variableCollections?.some((c) => c.id === variable.collectionId)
    )
      throw Error("Invalid variable mode");
    if (
      variable.values &&
      (!variable.values ||
        typeof variable.values !== "object" ||
        Array.isArray(variable.values) ||
        Object.values(variable.values).some(
          (v) =>
            !v ||
            typeof v !== "object" ||
            ("color" in v
              ? !/^#[\da-f]{6}([\da-f]{2})?$/i.test(v.color)
              : !("alias" in v) ||
                typeof v.alias !== "string" ||
                !d.variables?.some((a) => a.id === v.alias)),
        ))
    )
      throw Error("Invalid variable values");
  }
  if (
    d.libraries &&
    (!Array.isArray(d.libraries) ||
      d.libraries.length > 2000 ||
      new Set(d.libraries.map((s) => s.id)).size !== d.libraries.length ||
      d.libraries.some(
        (s) =>
          !s ||
          typeof s.id !== "string" ||
          typeof s.name !== "string" ||
          !Number.isInteger(s.revision) ||
          s.revision < 1 ||
          typeof s.enabled !== "boolean",
      ))
  )
    throw Error("Invalid library subscriptions");
  if (d.componentLibrary) {
    if (
      !Array.isArray(d.componentLibrary) ||
      d.componentLibrary.length > 2000 ||
      new Set(d.componentLibrary.map((c) => c.sourceId)).size !==
        d.componentLibrary.length
    )
      throw Error("Invalid component library");
    for (const entry of d.componentLibrary) {
      if (
        (entry.libraryId !== undefined &&
          typeof entry.libraryId !== "string") ||
        (entry.libraryRevision !== undefined &&
          (!Number.isInteger(entry.libraryRevision) ||
            entry.libraryRevision < 1)) ||
        [entry.missing, entry.localEdits, entry.deleted].some(
          (v) => v !== undefined && typeof v !== "boolean",
        ) ||
        typeof entry.sourceId !== "string" ||
        typeof entry.name !== "string" ||
        !Array.isArray(entry.nodes)
      )
        throw Error("Invalid component library");
      validateDocument(
        {
          ...d,
          componentLibrary: undefined,
          nodes: entry.nodes,
        },
        validationDepth + 1,
        prototypeContext ?? d,
      );
    }
  }
  validateComponentModels(d);
  for (const n of d.nodes)
    for (const content of Object.values(n.componentSlots ?? {}))
      validateDocument(
        {
          ...d,
          componentLibrary: undefined,
          componentSets: undefined,
          nodes: content,
        },
        validationDepth + 1,
        prototypeContext ?? d,
      );
  validateTypedVariables(d);
  validateInteractions(d, prototypeContext);
  if (
    d.guides &&
    (!Array.isArray(d.guides) ||
      d.guides.length > 1000 ||
      new Set(d.guides.map((g) => g?.id)).size !== d.guides.length ||
      d.guides.some(
        (g) =>
          !g ||
          typeof g.id !== "string" ||
          !d.pages.some((p) => p.id === g.pageId) ||
          !["x", "y"].includes(g.axis) ||
          !Number.isFinite(g.position) ||
          Math.abs(g.position) > 10000000,
      ))
  )
    throw Error("Invalid guides");
  const pages = new Set(d.pages.map((p) => p.id));
  if (
    pages.size !== d.pages.length ||
    d.pages.some((p) => typeof p.id !== "string" || typeof p.name !== "string")
  )
    throw Error("Invalid pages");
  const ids = new Set<string>();
  const kinds = [
    "frame",
    "rectangle",
    "ellipse",
    "line",
    "text",
    "polygon",
    "star",
    "path",
    "image",
    "group",
    "component",
    "instance",
  ];
  for (const n of d.nodes) {
    if (
      !n ||
      typeof n.id !== "string" ||
      ids.has(n.id) ||
      !pages.has(n.pageId) ||
      !kinds.includes(n.type)
    )
      throw Error("Invalid or duplicate node");
    ids.add(n.id);
    if (n.variableId && !d.variables?.some((v) => v.id === n.variableId))
      throw Error("Invalid color variable reference");
    if (n.fidelity) validateFidelity(n.fidelity);
    if (n.textFlow) {
      const f = n.textFlow;
      validateParagraphs(n.text, f.paragraphs);
      if (!validFontSettings(f.fontSettings))
        throw Error("Invalid font settings");
      if (
        (f.truncation !== undefined && f.truncation !== "ending") ||
        (f.direction !== undefined &&
          !["auto", "ltr", "rtl"].includes(f.direction)) ||
        (f.paragraphSpacing !== undefined &&
          (!Number.isFinite(f.paragraphSpacing) ||
            f.paragraphSpacing < 0 ||
            f.paragraphSpacing > 10000)) ||
        (f.spellCheck !== undefined && typeof f.spellCheck !== "boolean") ||
        (f.language !== undefined &&
          (typeof f.language !== "string" || f.language.length > 40))
      )
        throw Error("Invalid text layout");
      if (
        !["fixed", "height", "both"].includes(f.autoResize) ||
        !["top", "center", "bottom"].includes(f.verticalAlign) ||
        !Number.isFinite(f.letterSpacing) ||
        (f.runs &&
          (!Array.isArray(f.runs) ||
            f.runs.some(
              (r) =>
                !validFontSettings(r.fontSettings) ||
                !Number.isInteger(r.start) ||
                !Number.isInteger(r.end) ||
                r.start < 0 ||
                r.end < r.start ||
                r.end > n.text.length ||
                (r.fontSize !== undefined &&
                  (!Number.isFinite(r.fontSize) || r.fontSize <= 0)) ||
                (r.fontWeight !== undefined &&
                  !Number.isFinite(r.fontWeight)) ||
                (r.href !== undefined &&
                  (typeof r.href !== "string" ||
                    !/^(https?:|mailto:)/i.test(r.href))) ||
                ["italic", "underline", "strikethrough"].some(
                  (k) =>
                    (r as unknown as Record<string, unknown>)[k] !==
                      undefined &&
                    typeof (r as unknown as Record<string, unknown>)[k] !==
                      "boolean",
                ) ||
                (r.fill !== undefined && !/^#[\da-f]{3,8}$/i.test(r.fill)),
            )))
      )
        throw Error("Invalid text layout");
    }

    if (
      (n.componentOwner !== undefined &&
        typeof n.componentOwner !== "string") ||
      (n.componentPath !== undefined && typeof n.componentPath !== "string") ||
      (n.componentId !== undefined && typeof n.componentId !== "string")
    )
      throw Error("Invalid component instance");
    if (n.componentOverrides) {
      if (
        typeof n.componentOverrides !== "object" ||
        Array.isArray(n.componentOverrides) ||
        Object.keys(n.componentOverrides).length > 50000
      )
        throw Error("Invalid component instance");
      for (const patch of Object.values(n.componentOverrides)) {
        if (
          !patch ||
          typeof patch !== "object" ||
          [
            "id",
            "parentId",
            "pageId",
            "componentOverrides",
            "componentOwner",
            "componentPath",
          ].some((key) => key in patch)
        )
          throw Error("Invalid component instance");
      }
    }
    if (
      n.componentClears &&
      (!n.componentClears ||
        typeof n.componentClears !== "object" ||
        Array.isArray(n.componentClears) ||
        Object.values(n.componentClears).some(
          (fields) =>
            !Array.isArray(fields) ||
            fields.some(
              (field) => !["variableId", "fidelity.paints"].includes(field),
            ),
        ))
    )
      throw Error("Invalid component instance");

    if (
      n.constraints &&
      (!["min", "center", "max", "stretch", "scale"].includes(
        n.constraints.horizontal,
      ) ||
        !["min", "center", "max", "stretch", "scale"].includes(
          n.constraints.vertical,
        ))
    )
      throw Error("Invalid imported layout");
    if (n.frameGrid) {
      const g = n.frameGrid;
      if (
        !["columns", "rows"].includes(g.axis) ||
        !Number.isInteger(g.count) ||
        g.count < 1 ||
        g.count > 64 ||
        ![g.gap, g.margin].every(
          (v) => Number.isFinite(v) && v >= 0 && v <= 100000,
        ) ||
        typeof g.visible !== "boolean"
      )
        throw Error("Invalid frame grid");
    }
    if (n.layoutItem) {
      const item = n.layoutItem;
      if (
        [item.horizontalSizing, item.verticalSizing].some(
          (v) => v !== undefined && !["fixed", "hug", "fill"].includes(v),
        )
      )
        throw Error("Invalid layout sizing");
      if (
        (item.absolute !== undefined && typeof item.absolute !== "boolean") ||
        ["row", "column", "rowSpan", "columnSpan"].some((key) => {
          const value = item[key as keyof LayoutItem];
          return (
            value !== undefined &&
            (typeof value !== "number" ||
              !Number.isInteger(value) ||
              value > 10000 ||
              value < (key.endsWith("Span") ? 1 : 0))
          );
        }) ||
        (item.minWidth !== undefined &&
          item.maxWidth !== undefined &&
          item.minWidth > item.maxWidth) ||
        (item.minHeight !== undefined &&
          item.maxHeight !== undefined &&
          item.minHeight > item.maxHeight)
      )
        throw Error("Invalid imported layout");
      if (
        Object.entries(item).some(
          ([k, v]) =>
            ![
              "align",
              "absolute",
              "horizontalSizing",
              "verticalSizing",
            ].includes(k) &&
            v !== undefined &&
            (!Number.isFinite(v) || typeof v !== "number" || v < 0),
        ) ||
        (item.align &&
          !["start", "center", "end", "stretch", "baseline"].includes(
            item.align,
          ))
      )
        throw Error("Invalid imported layout");
    }
    if (n.importedLayout) {
      const l = n.importedLayout;
      if (
        (l.wrap !== undefined && typeof l.wrap !== "boolean") ||
        (l.counterGap !== undefined &&
          (!Number.isFinite(l.counterGap) || l.counterGap < 0))
      )
        throw Error("Invalid imported layout");
      if (
        l.grid &&
        (!Array.isArray(l.grid.columns) ||
          !Array.isArray(l.grid.rows) ||
          l.grid.columns.length > 1000 ||
          l.grid.rows.length > 1000 ||
          [...l.grid.columns, ...l.grid.rows].some(
            (t) =>
              !["fixed", "fr", "hug"].includes(t.kind) ||
              !Number.isFinite(t.value) ||
              t.value < 0,
          ) ||
          ![l.grid.columnGap, l.grid.rowGap].every(
            (v) => Number.isFinite(v) && v >= 0,
          ))
      )
        throw Error("Invalid imported layout");
      if (
        !Array.isArray(l.padding) ||
        l.padding.length !== 4 ||
        l.padding.some((x) => !Number.isFinite(x) || x < 0) ||
        !["fixed", "hug"].includes(l.primary) ||
        !["fixed", "hug"].includes(l.counter) ||
        ![
          "start",
          "center",
          "end",
          "space-between",
          "space-around",
          "space-evenly",
        ].includes(l.justify) ||
        !["start", "center", "end", "baseline", "stretch"].includes(l.align)
      )
        throw Error("Invalid imported layout");
    }
    for (const field of [
      "x",
      "y",
      "width",
      "height",
      "rotation",
      "opacity",
      "strokeWidth",
      "radius",
      "fontSize",
      "fontWeight",
      "lineHeight",
    ] as const)
      if (!Number.isFinite(n[field]))
        throw Error("Invalid numeric property: " + field);
    if (n.width < 0 || n.height < 0 || n.opacity < 0 || n.opacity > 1)
      throw Error("Invalid node dimensions");
    for (const key of ["name", "text", "fill", "stroke", "fontFamily"] as const)
      if (typeof n[key] !== "string") throw Error("Invalid " + key);
    if (
      typeof n.visible !== "boolean" ||
      typeof n.locked !== "boolean" ||
      !["left", "center", "right"].includes(n.textAlign)
    )
      throw Error("Invalid node flags");
    if (
      ![n.fill, n.stroke].every(
        (c) => c === "none" || /^#[\da-f]{3,8}$/i.test(c),
      )
    )
      throw Error("Only hex colors are supported");
    if (
      n.image &&
      !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(n.image)
    )
      throw Error("Invalid image data");
    if (
      n.layout &&
      !["none", "horizontal", "vertical", "grid"].includes(n.layout)
    )
      throw Error("Invalid layout");
    if (
      n.prototypeScroll !== undefined &&
      !["none", "horizontal", "vertical", "both"].includes(n.prototypeScroll)
    )
      throw Error("Invalid prototype scrolling");
    for (const value of [n.gap, n.padding])
      if (value !== undefined && (!Number.isFinite(value) || value < 0))
        throw Error("Invalid layout spacing");
    if (
      n.points &&
      (!Array.isArray(n.points) ||
        n.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    )
      throw Error("Invalid path");
  }
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  for (const n of d.nodes) {
    if (n.parentId !== null) {
      const parent = byId.get(n.parentId);
      if (!parent || !container(parent) || parent.pageId !== n.pageId)
        throw Error("Invalid parent");
    }
    if (n.targetId) {
      const target =
        byId.get(n.targetId) ??
        prototypeContext?.nodes.find((p) => p.id === n.targetId);
      if (!target || target.type !== "frame" || target.pageId !== n.pageId)
        throw Error("Invalid prototype target");
    }
  }
  // Iterative cycle detection avoids repeated whole-document parent scans and recursion overflow.
  const complete = new Set<string>();
  for (const node of d.nodes) {
    let next: Node | undefined = node;
    const trail = new Set<string>();
    while (next && !complete.has(next.id)) {
      if (trail.has(next.id)) throw Error("Cyclic node tree");
      trail.add(next.id);
      next = next.parentId ? byId.get(next.parentId) : undefined;
    }
    for (const id of trail) complete.add(id);
  }
}
export class History {
  past: Document[] = [];
  future: Document[] = [];
  constructor(
    public maxEntries = 100,
    public maxEstimatedBytes = 32 * 1024 * 1024,
  ) {}
  private sizes = new WeakMap<Document, number>();
  private snapshot(doc: Document) {
    const snapshot = structuredClone(doc);
    this.sizes.set(snapshot, JSON.stringify(doc).length * 2);
    return snapshot;
  }
  get estimatedBytes() {
    return [...this.past, ...this.future].reduce(
      (sum, d) => sum + (this.sizes.get(d) ?? JSON.stringify(d).length * 2),
      0,
    );
  }
  private trim() {
    while (
      this.past.length + this.future.length > 1 &&
      (this.past.length + this.future.length > this.maxEntries ||
        this.estimatedBytes > this.maxEstimatedBytes)
    ) {
      if (this.past.length > 1 || !this.future.length) this.past.shift();
      else this.future.shift();
    }
  }
  push(doc: Document) {
    this.past.push(this.snapshot(doc));
    this.future = [];
    this.trim();
  }
  undo(current: Document) {
    const previous = this.past.pop();
    if (previous) this.future.push(this.snapshot(current));
    this.trim();
    return previous ?? current;
  }
  redo(current: Document) {
    const next = this.future.pop();
    if (next) this.past.push(this.snapshot(current));
    this.trim();
    return next ?? current;
  }
}
export function demoDocument(): Document {
  const d = emptyDocument();
  d.name = "白泽 · Design playground";
  const p = d.pages[0].id;
  const frame = makeNode("frame", p, {
    name: "白泽 / Welcome",
    x: 80,
    y: 80,
    width: 960,
    height: 680,
    radius: 24,
    fill: "#f8faf6",
  });
  d.nodes.push(frame);
  const add = (type: Kind, patch: Partial<Node>) =>
    d.nodes.push(makeNode(type, p, { parentId: frame.id, ...patch }));
  add("text", {
    name: "Brand",
    x: 48,
    y: 32,
    width: 240,
    height: 32,
    text: "BAIZEFIG  /  白泽",
    fontSize: 18,
    fontWeight: 700,
    fill: "#283d30",
  });
  add("text", {
    name: "Navigation",
    x: 665,
    y: 38,
    width: 260,
    height: 24,
    text: "Design     Explore     Create ↗",
    fontSize: 14,
    fill: "#637466",
  });
  add("rectangle", {
    name: "Eyebrow background",
    x: 48,
    y: 132,
    width: 187,
    height: 30,
    radius: 15,
    fill: "#e7eedd",
  });
  add("text", {
    name: "Eyebrow",
    x: 62,
    y: 137,
    width: 170,
    height: 24,
    text: "YOUR IDEAS, UNBOUND",
    fontSize: 11,
    fontWeight: 600,
    fill: "#536d3f",
  });
  add("text", {
    name: "Headline",
    x: 48,
    y: 192,
    width: 560,
    height: 172,
    text: "通万物、\n识万象。",
    fontSize: 64,
    fontWeight: 700,
    lineHeight: 1.15,
    fill: "#25382b",
  });
  add("text", {
    name: "Description",
    x: 50,
    y: 380,
    width: 470,
    height: 70,
    text: "从一个想法，到万千可能。\n在属于你的画布上，与灵感不期而遇。",
    fontSize: 18,
    fill: "#73816e",
    lineHeight: 1.8,
  });
  add("rectangle", {
    name: "Primary button",
    x: 48,
    y: 500,
    width: 168,
    height: 50,
    radius: 25,
    fill: "#2c4431",
  });
  add("text", {
    name: "Button label",
    x: 75,
    y: 514,
    width: 140,
    height: 26,
    text: "开始创造  ↗",
    fontSize: 16,
    fill: "#ffffff",
    fontWeight: 600,
  });
  add("ellipse", {
    name: "Sage orbit",
    x: 600,
    y: 184,
    width: 280,
    height: 280,
    fill: "#dce7cf",
  });
  add("star", {
    name: "Baize star",
    x: 638,
    y: 224,
    width: 204,
    height: 204,
    fill: "#9caf7f",
    rotation: 15,
  });
  add("ellipse", {
    name: "Orbit dot",
    x: 820,
    y: 160,
    width: 44,
    height: 44,
    fill: "#2c4431",
  });
  add("text", {
    name: "Footer",
    x: 48,
    y: 620,
    width: 850,
    height: 24,
    text: "LOCAL FIRST.  INFINITE POSSIBILITIES.                                                MADE FOR YOUR MIND.",
    fontSize: 10,
    fill: "#87927f",
  });
  return d;
}

// Paint and link ranges do not affect shaping. Compare coalesced shaping runs so
// splitting a range to recolor it does not discard the source outlines.
function sameTextLayout(
  a: Node["textFlow"],
  b: Node["textFlow"],
  includeFill = false,
) {
  const shaping = (flow: Node["textFlow"]) => {
    if (!flow) return flow;
    const runs: TextRun[] = [];
    for (const { fill: _fill, href: _href, ...run } of flow.runs ?? []) {
      const { start, end, ...style } = run;
      if (includeFill && _fill !== undefined)
        Object.assign(style, { fill: _fill });
      if (!Object.values(style).some((v) => v !== undefined)) continue;
      const last = runs.at(-1);
      if (last && last.end === start) {
        const { start: _start, end: _end, ...previous } = last;
        if (equalData(previous, style)) {
          last.end = end;
          continue;
        }
      }
      runs.push({ ...style, start, end });
    }
    return { ...flow, runs };
  };
  return equalData(shaping(a), shaping(b));
}
