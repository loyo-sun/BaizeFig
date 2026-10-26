import {
  memo,
  useMemo,
  type Dispatch,
  type SetStateAction,
  type RefObject,
  type PointerEvent,
  type MouseEvent,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  Component,
  Layers,
  Spline,
  Square,
  Circle,
  Minus,
  Frame,
  Type,
  Star,
  Triangle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import { type Document, type Node, type Command } from "./core";
import { documentIndex } from "./documentIndex";
import { InlineNameInput } from "./InlineNameInput";
import { useI18n } from "./LanguageContext";

export type LayerTreeActions = {
  begin: (e: PointerEvent<HTMLDivElement>, n: Node) => void;
  move: (e: PointerEvent<HTMLDivElement>) => void;
  end: (e: PointerEvent<HTMLDivElement>) => void;
  cancel: () => void;
  select: (e: MouseEvent<HTMLDivElement>, n: Node) => void;
  rename: (id: string | null) => void;
  run: (command: Command) => void;
};
const layerIcons: Partial<Record<Node["type"], typeof Square>> = {
  frame: Frame,
  rectangle: Square,
  ellipse: Circle,
  line: Minus,
  text: Type,
  star: Star,
  polygon: Triangle,
};

// Viewport changes do not invalidate the layer list. Actions read the latest
// editor state through a stable ref, including after a cached render.
export const LayerTree = memo(function LayerTree({
  doc,
  page,
  selected,
  collapsed,
  layerFilter,
  layerDrop,
  renamingId,
  setSelected,
  setCollapsed,
  actions,
}: {
  doc: Document;
  page: string;
  selected: string[];
  collapsed: Set<string>;
  layerFilter: string;
  layerDrop: { id: string; position: "before" | "inside" | "after" } | null;
  renamingId: string | null;
  setSelected: Dispatch<SetStateAction<string[]>>;
  setCollapsed: Dispatch<SetStateAction<Set<string>>>;
  actions: RefObject<LayerTreeActions>;
}) {
  const { t } = useI18n();
  const index = documentIndex(doc);
  function parents(n: Node) {
    const result: Node[] = [],
      seen = new Set([n.id]);
    let parent = n.parentId;
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const node = index.byId.get(parent);
      if (!node) break;
      result.push(node);
      parent = node.parentId;
    }
    return result;
  }
  const matches = useMemo(() => {
    if (!layerFilter) return null;
    const result = new Set<string>(),
      query = layerFilter.toLowerCase();
    for (const node of doc.nodes) {
      if (node.pageId !== page || !node.name.toLowerCase().includes(query))
        continue;
      result.add(node.id);
      for (const parent of parents(node)) result.add(parent.id);
    }
    return result;
  }, [doc, page, layerFilter]);
  const selection = new Set(selected);
  function tree(
    parentId: string | null,
    depth = 0,
    inSelection = false,
    inComponent = false,
  ) {
    return [...(index.children.get(parentId) ?? [])]
      .filter((n) => n.pageId === page)
      .reverse()
      .map((n) => {
        if (matches && !matches.has(n.id)) return null;
        const children = (index.children.get(n.id)?.length ?? 0) > 0;
        const isSelected = selection.has(n.id);
        const component =
          inComponent || n.type === "component" || n.type === "instance";
        return (
          <div key={n.id}>
            <div
              className={`layer ${isSelected ? "selected" : ""} ${inSelection ? "in-selection" : ""} ${component ? "component-layer" : ""} ${!n.visible ? "dim" : ""}`}
              style={{ paddingLeft: 12 + depth * 14, touchAction: "none" }}
              aria-selected={isSelected}
              data-layer-id={n.id}
              draggable={false}
              onPointerDown={(e) => actions.current.begin(e, n)}
              onPointerMove={(e) => actions.current.move(e)}
              onPointerUp={(e) => actions.current.end(e)}
              onPointerCancel={() => actions.current.cancel()}
              aria-label={t("Layer {name}", { name: n.name })}

              data-drop-position={
                layerDrop?.id === n.id ? layerDrop.position : undefined
              }
              onClick={(e) => {
                actions.current.select(e, n);
              }}
              onDoubleClick={(e) => {
                if ((e.target as Element).closest("button,input")) return;
                setSelected([n.id]);
                actions.current.rename(n.id);
              }}
            >
              <button
                className="tiny"
                aria-label={t("Toggle {name}", { name: n.name })}
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed((old) => {
                    const next = new Set(old);
                    next.has(n.id) ? next.delete(n.id) : next.add(n.id);
                    return next;
                  });
                }}
              >
                {children ? (
                  collapsed.has(n.id) ? (
                    <ChevronRight size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )
                ) : (
                  <span className="spacer" />
                )}
              </button>
              {(() => {
                const Icon =
                  (n.type === "path" ? Spline : layerIcons[n.type]) ??
                  (n.type === "component" || n.type === "instance"
                    ? Component
                    : Layers);
                return (
                  <Icon
                    size={12}
                    strokeWidth={1.25}
                    className="layer-kind-icon"
                  />
                );
              })()}
              {(n.type === "component" || n.type === "instance") && (
                <span
                  className="component-badge"
                  title={t(
                    n.type === "component" ? "Main component" : "Instance",
                  )}
                  aria-label={t(
                    n.type === "component" ? "Main component" : "Instance",
                  )}
                >
                  {n.type === "component" ? (
                    <Component size={13} />
                  ) : (
                    <span aria-hidden="true">{"◇"}</span>
                  )}
                </span>
              )}
              {renamingId === n.id ? (
                <InlineNameInput
                  key={n.id}
                  name={n.name}
                  label={t("Layer name")}
                  onCancel={() => actions.current.rename(null)}
                  onCommit={(name) => {
                    actions.current.run({
                      type: "update",
                      ids: [n.id],
                      patch: { name },
                    });
                    actions.current.rename(null);
                  }}
                />
              ) : (
                <span className="layer-name">{n.name}</span>
              )}
              <button
                className="tiny layer-action"
                aria-label={t(n.visible ? "Hide {name}" : "Show {name}", {
                  name: n.name,
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.current.run({
                    type: "update",
                    ids: [n.id],
                    patch: { visible: !n.visible },
                  });
                }}
              >
                {n.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                className="tiny layer-action"
                aria-label={t(n.locked ? "Unlock {name}" : "Lock {name}", {
                  name: n.name,
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.current.run({
                    type: "update",
                    ids: [n.id],
                    patch: { locked: !n.locked },
                  });
                }}
              >
                {n.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
            {!collapsed.has(n.id) &&
              tree(n.id, depth + 1, inSelection || isSelected, component)}
          </div>
        );
      });
  }
  return <>{tree(null)}</>;
});
