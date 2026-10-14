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
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  fidelity?: Fidelity;
  importedLayout?: {
    padding: [number, number, number, number];
    primary: "fixed" | "hug";
    counter: "fixed" | "hug";
    justify: "start" | "center" | "end" | "space-between";
    align: "start" | "center" | "end";
    absolute?: boolean;
  };
  image?: string;
  points?: { x: number; y: number }[];
  layout?: "none" | "horizontal" | "vertical";
  gap?: number;
  padding?: number;
  componentId?: string;
  targetId?: string;
  variableId?: string;
}
export interface Page {
  id: string;
  name: string;
}
export interface Document {
  format: "baizefig";
  version: 1;
  id: string;
  name: string;
  pages: Page[];
  nodes: Node[];
  background: string;
  componentLibrary?: { sourceId: string; name: string; nodes: Node[] }[];
  variableCollections?: VariableCollection[];
  variables?: ColorVariable[];
}
export type Command =
  | { type: "create"; nodes: Node[] }
  | { type: "update"; ids: string[]; patch: Partial<Node> }
  | { type: "delete"; ids: string[] }
  | { type: "group"; ids: string[]; kind?: "group" | "frame" | "component" }
  | { type: "ungroup"; ids: string[] }
  | { type: "duplicate"; ids: string[]; offset?: number }
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
      direction: "none" | "horizontal" | "vertical";
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
      points = [
        [0, 0],
        [n.width, 0],
        [0, n.height],
        [n.width, n.height],
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
function relayout(doc: Document, affected: Set<string>) {
  for (const n of [...doc.nodes].reverse()) {
    if (!n.layout || n.layout === "none") continue;
    if (n.importedLayout) {
      if (!affected.has(n.id)) continue;
      const horizontal = n.layout === "horizontal",
        config = n.importedLayout,
        [top, right, bottom, left] = config.padding;
      const children = doc.nodes.filter(
        (c) => c.parentId === n.id && c.visible && !c.importedLayout?.absolute,
      );
      const before = horizontal ? left : top,
        after = horizontal ? right : bottom,
        crossBefore = horizontal ? top : left,
        crossAfter = horizontal ? bottom : right;
      const total = children.reduce(
          (sum, c) => sum + (horizontal ? c.width : c.height),
          0,
        ),
        gap = n.gap ?? 0;
      if (config.primary === "hug")
        n[horizontal ? "width" : "height"] = Math.max(
          1,
          before + after + total + Math.max(0, children.length - 1) * gap,
        );
      if (config.counter === "hug")
        n[horizontal ? "height" : "width"] = Math.max(
          1,
          crossBefore +
            crossAfter +
            Math.max(
              0,
              ...children.map((c) => (horizontal ? c.height : c.width)),
            ),
        );
      const free =
        (horizontal ? n.width : n.height) -
        before -
        after -
        total -
        Math.max(0, children.length - 1) * gap;
      const actualGap =
        config.justify === "space-between" && children.length > 1
          ? gap + free / (children.length - 1)
          : gap;
      let pos =
        before +
        (config.justify === "center"
          ? free / 2
          : config.justify === "end"
            ? free
            : 0);
      for (const child of children) {
        const crossFree =
          (horizontal ? n.height : n.width) -
          crossBefore -
          crossAfter -
          (horizontal ? child.height : child.width);
        const cross =
          crossBefore +
          (config.align === "center"
            ? crossFree / 2
            : config.align === "end"
              ? crossFree
              : 0);
        if (horizontal) {
          child.x = pos;
          child.y = cross;
        } else {
          child.x = cross;
          child.y = pos;
        }
        pos += (horizontal ? child.width : child.height) + actualGap;
      }
      continue;
    }

    let pos = n.padding ?? 16;
    const children = doc.nodes.filter((a) => a.parentId === n.id && a.visible);
    for (const c of children) {
      if (n.layout === "horizontal") {
        c.x = pos;
        c.y = n.padding ?? 16;
        pos += c.width + (n.gap ?? 12);
      } else {
        c.x = n.padding ?? 16;
        c.y = pos;
        pos += c.height + (n.gap ?? 12);
      }
    }
    if (children.length) {
      const end = pos - (n.gap ?? 12) + (n.padding ?? 16);
      if (n.layout === "horizontal") {
        n.width = Math.max(1, end);
        n.height =
          Math.max(...children.map((c) => c.height)) + 2 * (n.padding ?? 16);
      } else {
        n.height = Math.max(1, end);
        n.width =
          Math.max(...children.map((c) => c.width)) + 2 * (n.padding ?? 16);
      }
    }
  }
}
export function reflowAfterPointerEdit(
  original: Document,
  updated: Document,
): Document {
  const doc = structuredClone(updated),
    affected = new Set<string>();
  for (const n of doc.nodes) {
    const previous = original.nodes.find((a) => a.id === n.id);
    if (!previous) continue;
    if (
      n.width !== previous.width ||
      n.height !== previous.height ||
      n.x !== previous.x ||
      n.y !== previous.y
    ) {
      if (n.type === "text" && n.width !== previous.width && n.fidelity?.text)
        delete n.fidelity.text;
      affected.add(n.id);
      for (const parent of ancestors(doc, n)) affected.add(parent.id);
    }
  }
  relayout(doc, affected);
  validateDocument(doc);
  return doc;
}
export function execute(
  original: Document,
  command: Command,
): { doc: Document; selection?: string[] } {
  const doc = structuredClone(original);
  let selection: string[] | undefined;
  const writable = (n: Node) =>
    !n.locked && !ancestors(doc, n).some((p) => p.locked);
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
          const allowed = new Set([
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
            "variableId",
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
          Object.assign(n, patch);
          if ("fill" in patch && !("variableId" in patch)) delete n.variableId;
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
      doc.nodes = doc.nodes.filter((n) => !set.has(n.id));
      for (const n of doc.nodes)
        if (n.targetId && set.has(n.targetId)) delete n.targetId;
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
      const all = descendants(
        doc,
        selected.map((n) => n.id),
      );
      const map = new Map(all.map((a) => [a, id()]));
      const clones = doc.nodes
        .filter((n) => all.includes(n.id))
        .map((n) => ({
          ...structuredClone(n),
          id: map.get(n.id)!,
          parentId: n.parentId ? (map.get(n.parentId) ?? n.parentId) : null,
          x:
            n.x +
            (selected.some((r) => r.id === n.id) ? (command.offset ?? 20) : 0),
          y:
            n.y +
            (selected.some((r) => r.id === n.id) ? (command.offset ?? 20) : 0),
          name: n.name + " copy",
          targetId: n.targetId
            ? (map.get(n.targetId) ?? n.targetId)
            : undefined,
        }));
      doc.nodes.push(...clones);
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
      Object.assign(n, {
        layout: command.direction,
        gap: command.gap ?? n.gap ?? 12,
        padding: command.padding ?? n.padding ?? 16,
      });
      break;
    }
  }
  for (const n of doc.nodes) {
    if (n.variableId) {
      const variable = doc.variables?.find((v) => v.id === n.variableId);
      if (variable) n.fill = variable.value;
    }
  }
  const affected = new Set<string>();
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
  relayout(doc, affected);
  validateDocument(doc);
  return { doc, selection };
}
export function validateDocument(value: unknown): asserts value is Document {
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
          !/^#[\da-f]{6}$/i.test(v.value),
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
              ? !/^#[\da-f]{6}$/i.test(v.color)
              : !("alias" in v) ||
                typeof v.alias !== "string" ||
                !d.variables?.some((a) => a.id === v.alias)),
        ))
    )
      throw Error("Invalid variable values");
  }
  if (d.componentLibrary) {
    if (!Array.isArray(d.componentLibrary) || d.componentLibrary.length > 2000)
      throw Error("Invalid component library");
    for (const entry of d.componentLibrary) {
      if (
        typeof entry.sourceId !== "string" ||
        typeof entry.name !== "string" ||
        !Array.isArray(entry.nodes)
      )
        throw Error("Invalid component library");
      validateDocument({
        ...d,
        componentLibrary: undefined,
        nodes: entry.nodes,
      });
    }
  }
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
    if (n.importedLayout) {
      const l = n.importedLayout;
      if (
        !Array.isArray(l.padding) ||
        l.padding.length !== 4 ||
        l.padding.some((x) => !Number.isFinite(x) || x < 0) ||
        !["fixed", "hug"].includes(l.primary) ||
        !["fixed", "hug"].includes(l.counter) ||
        !["start", "center", "end", "space-between"].includes(l.justify) ||
        !["start", "center", "end"].includes(l.align)
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
    if (n.layout && !["none", "horizontal", "vertical"].includes(n.layout))
      throw Error("Invalid layout");
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
  for (const n of d.nodes) {
    if (n.parentId !== null) {
      const parent = d.nodes.find((a) => a.id === n.parentId);
      if (!parent || !container(parent) || parent.pageId !== n.pageId)
        throw Error("Invalid parent");
    }
    if (
      n.targetId &&
      !d.nodes.some(
        (a) =>
          a.id === n.targetId && a.type === "frame" && a.pageId === n.pageId,
      )
    )
      throw Error("Invalid prototype target");
    absolute(d, n);
  }
}
export class History {
  past: Document[] = [];
  future: Document[] = [];
  push(doc: Document) {
    this.past.push(structuredClone(doc));
    if (this.past.length > 100) this.past.shift();
    this.future = [];
  }
  undo(current: Document) {
    const previous = this.past.pop();
    if (previous) this.future.push(structuredClone(current));
    return previous ?? current;
  }
  redo(current: Document) {
    const next = this.future.pop();
    if (next) this.past.push(structuredClone(current));
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
