import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { type Document, ancestors } from "./core";
import { Scene } from "./Canvas";
import {
  type PrototypeInteraction,
  type PrototypeAction,
  type PrototypeState,
  transitionPrototype,
} from "./prototype";
import { useI18n } from "./LanguageProvider";
export function PrototypePlayer({
  doc,
  initialId,
  onClose,
}: {
  doc: Document;
  initialId: string;
  onClose: () => void;
}) {
  const { t } = useI18n(),
    [state, setState] = useState<PrototypeState>({
      frameId: initialId,
      overlays: [],
      history: [],
    });
  const current = doc.nodes.find((n) => n.id === state.frameId),
    activeId = state.overlays.at(-1) ?? state.frameId;
  const apply = (actions: PrototypeAction[]) =>
    setState((s) => transitionPrototype(doc, s, actions));
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const node of doc.nodes) {
      if (
        !node.visible ||
        ancestors(doc, node).some((n) => !n.visible) ||
        (node.id !== activeId &&
          !ancestors(doc, node).some((n) => n.id === activeId))
      )
        continue;
      for (const i of node.interactions ?? [])
        if (i.trigger === "delay")
          timers.push(setTimeout(() => apply(i.actions), i.delayMs ?? 0));
    }
    return () => timers.forEach(clearTimeout);
  }, [doc, activeId]);
  function trigger(
    event: React.MouseEvent | React.PointerEvent,
    type: PrototypeInteraction["trigger"],
  ) {
    const target = (event.target as Element).closest("[data-node-id]"),
      node = doc.nodes.find(
        (n) => n.id === target?.getAttribute("data-node-id"),
      );
    if (!node) return;
    const candidates = [node, ...ancestors(doc, node)];
    for (const n of candidates) {
      if (
        (type === "hover" || type === "leave") &&
        event.relatedTarget instanceof Element
      ) {
        const relatedId = event.relatedTarget
            .closest("[data-node-id]")
            ?.getAttribute("data-node-id"),
          related = doc.nodes.find((a) => a.id === relatedId);
        if (
          related &&
          (related.id === n.id ||
            ancestors(doc, related).some((a) => a.id === n.id))
        )
          continue;
      }
      const interactions = n.interactions?.filter((i) => i.trigger === type);
      if (interactions?.length) {
        for (const i of interactions) apply(i.actions);
        return;
      }
      if (type === "click" && n.targetId) {
        apply([{ type: "navigate", targetId: n.targetId }]);
        return;
      }
    }
  }
  if (!current) return null;
  function view(id: string) {
    const n = doc.nodes.find((n) => n.id === id);
    if (!n) return null;
    return (
      <svg
        key={id}
        aria-label={t("Prototype preview")}
        viewBox={`0 0 ${n.width} ${n.height}`}
        style={{
          animation:
            state.transition?.type === "dissolve"
              ? `prototype-dissolve ${state.transition.durationMs}ms ease`
              : undefined,
        }}
        onClick={(e) => trigger(e, "click")}
        onPointerOver={(e) => trigger(e, "hover")}
        onPointerOut={(e) => trigger(e, "leave")}
        onPointerDown={(e) => trigger(e, "press")}
        onPointerUp={(e) => trigger(e, "release")}
      >
        <Scene
          doc={{
            ...doc,
            nodes: doc.nodes.map((a) =>
              a.id === n.id
                ? {
                    ...a,
                    x: 0,
                    y: 0,
                    rotation: 0,
                    fidelity: a.fidelity
                      ? { ...a.fidelity, linear: undefined }
                      : undefined,
                  }
                : a,
            ),
          }}
          pageId={n.pageId}
          rootId={id}
        />
      </svg>
    );
  }
  return (
    <div className="presentation">
      <div className="presentation-bar">
        <span>BaizeFig / {current.name}</span>
        <button onClick={onClose}>
          <X size={18} />
          {t("Close preview")}
        </button>
      </div>
      {view(state.frameId)}
      {state.overlays.map((id, i) => (
        <div key={`${id}-${i}`} className="prototype-overlay">
          {view(id)}
        </div>
      ))}
      <p>{t("Click linked elements to navigate · Esc to close")}</p>
    </div>
  );
}
