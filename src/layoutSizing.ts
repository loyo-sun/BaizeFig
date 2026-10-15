import { execute, ancestors, type Document, type Node } from "./core";
import type { Track } from "./layout";
export type Sizing = "fixed" | "hug" | "fill";
export function layoutConfig(node: Node): NonNullable<Node["importedLayout"]> {
  return structuredClone(
    node.importedLayout ?? {
      padding: [
        node.padding ?? 16,
        node.padding ?? 16,
        node.padding ?? 16,
        node.padding ?? 16,
      ],
      primary: node.layout === "grid" ? "fixed" : "hug",
      counter: "hug",
      justify: "start",
      align: "start",
    },
  );
}
export function dimensionMode(
  node: Node,
  axis: "width" | "height",
  parent?: Node,
): Sizing {
  const explicit =
    node.layoutItem?.[axis === "width" ? "horizontalSizing" : "verticalSizing"];
  if (explicit) return explicit;
  if (parent?.layout && parent.layout !== "none") {
    const main = parent.layout === "horizontal" ? "width" : "height";
    if (axis === main && node.layoutItem?.grow) return "fill";
    if (axis !== main && node.layoutItem?.align === "stretch") return "fill";
  }
  if (node.layout && node.layout !== "none") {
    const config = layoutConfig(node),
      primary =
        node.layout === "horizontal" || node.layout === "grid"
          ? "width"
          : "height";
    return config[axis === primary ? "primary" : "counter"];
  }
  if (node.type === "text") {
    if (axis === "width" && node.textFlow?.autoResize === "both") return "hug";
    if (axis === "height" && node.textFlow?.autoResize !== "fixed")
      return "hug";
  }
  return "fixed";
}
export function setDimensionMode(
  doc: Document,
  id: string,
  axis: "width" | "height",
  mode: Sizing,
): Document {
  const node = doc.nodes.find((n) => n.id === id);
  if (!node) return doc;
  if (node.locked || ancestors(doc, node).some((p) => p.locked)) return doc;
  const parent = doc.nodes.find((n) => n.id === node.parentId);
  if (mode === "fill" && (!parent?.layout || parent.layout === "none"))
    throw Error("Fill needs an auto layout parent");
  let next = doc;
  if (mode === "fill" && parent && dimensionMode(parent, axis) === "hug") {
    const config = layoutConfig(parent),
      primary =
        parent.layout === "horizontal" || parent.layout === "grid"
          ? "width"
          : "height";
    config[axis === primary ? "primary" : "counter"] = "fixed";
    next = execute(next, {
      type: "update",
      ids: [parent.id],
      patch: {
        importedLayout: config,
        layoutItem: {
          ...parent.layoutItem,
          [axis === "width" ? "horizontalSizing" : "verticalSizing"]: "fixed",
        },
      },
    }).doc;
  }
  const current = next.nodes.find((n) => n.id === id)!,
    item = {
      ...current.layoutItem,
      [axis === "width" ? "horizontalSizing" : "verticalSizing"]: mode,
    };
  const patch: Partial<Node> = { layoutItem: item };
  if (current.layout && current.layout !== "none") {
    const config = layoutConfig(current),
      primary =
        current.layout === "horizontal" || current.layout === "grid"
          ? "width"
          : "height";
    config[axis === primary ? "primary" : "counter"] =
      mode === "hug" ? "hug" : "fixed";
    patch.importedLayout = config;
  }
  if (current.type === "text") {
    const width =
        axis === "width" ? mode : dimensionMode(current, "width", parent),
      height =
        axis === "height" ? mode : dimensionMode(current, "height", parent);
    patch.textFlow = {
      ...(current.textFlow ?? { verticalAlign: "top", letterSpacing: 0 }),
      autoResize:
        width === "hug" ? "both" : height === "hug" ? "height" : "fixed",
    };
  }
  return execute(next, { type: "update", ids: [id], patch }).doc;
}
export function parseTracks(value: string): Track[] {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length > 64) throw Error("Use at most 64 grid tracks");
  return tokens.map((token) => {
    if (token === "hug") return { kind: "hug", value: 0 };
    const fr = token.endsWith("fr"),
      number = Number(fr ? token.slice(0, -2) : token);
    if (!Number.isFinite(number) || number < 0 || (fr && number === 0))
      throw Error("Use track lengths, hug or positive fr values");
    return { kind: fr ? "fr" : "fixed", value: number };
  });
}
export const printTracks = (tracks: Track[]) =>
  tracks
    .map((t) =>
      t.kind === "hug" ? "hug" : `${t.value}${t.kind === "fr" ? "fr" : ""}`,
    )
    .join(" ");
