import React, { useEffect, useRef, useState } from "react";
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
import {
  clampScroll,
  scrolledDocument,
  type ScrollPositions,
  type PrototypeViewports,
} from "./prototypeScroll";
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
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const resize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  function measureViewports(ids: string[]) {
    const result: PrototypeViewports = {};
    for (const id of ids) {
      const n = doc.nodes.find((n) => n.id === id);
      if (!n) continue;
      const scale = Math.min(1, (windowSize.width - 80) / Math.max(1, n.width));
      result[id] = {
        width: n.width,
        height: Math.min(
          n.height,
          Math.max(1, windowSize.height - 150) / Math.max(0.01, scale),
        ),
      };
    }
    return result;
  }
  const viewports = measureViewports([state.frameId, ...state.overlays]);
  const [displayScrolls, setDisplayScrolls] = useState<ScrollPositions>({});
  const displayRef = useRef(displayScrolls);
  useEffect(() => {
    const from = displayRef.current,
      to = state.scrolls ?? {},
      duration = state.scrollDurationMs ?? 0;
    if (!duration) {
      displayRef.current = to;
      setDisplayScrolls(to);
      return;
    }
    let request = 0,
      start: number | undefined;
    const tick = (time: number) => {
      start ??= time;
      const p = Math.min(1, (time - start) / duration),
        ease = p * p * (3 - 2 * p),
        positions: ScrollPositions = {};
      for (const id of new Set([...Object.keys(from), ...Object.keys(to)])) {
        const a = from[id] ?? { x: 0, y: 0 },
          b = to[id] ?? { x: 0, y: 0 };
        positions[id] = {
          x: a.x + (b.x - a.x) * ease,
          y: a.y + (b.y - a.y) * ease,
        };
      }
      displayRef.current = positions;
      setDisplayScrolls(positions);
      if (p < 1) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [state.scrolls, state.scrollDurationMs]);
  const current = doc.nodes.find((n) => n.id === state.frameId),
    activeId = state.overlays.at(-1) ?? state.frameId;
  const apply = (actions: PrototypeAction[]) =>
    setState((s) =>
      transitionPrototype(
        doc,
        s,
        actions,
        measureViewports([
          s.frameId,
          ...s.overlays,
          ...actions.flatMap((a) =>
            a.type === "navigate" || a.type === "overlay" || a.type === "swap"
              ? [a.targetId]
              : [],
          ),
        ]),
      ),
    );
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
    const viewport = viewports[id],
      scale = Math.min(1, (windowSize.width - 80) / Math.max(1, n.width));
    const scrolled = scrolledDocument(doc, displayScrolls);
    return (
      <svg
        key={id}
        aria-label={t("Prototype preview")}
        data-prototype-root={id}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        style={{
          width: viewport.width * scale,
          height: viewport.height * scale,
          flex: "none",
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
        onWheel={(e) => {
          e.stopPropagation();
          const hit = (e.target as Element).closest("[data-node-id]"),
            node = doc.nodes.find(
              (a) => a.id === hit?.getAttribute("data-node-id"),
            );
          const candidates = node ? [node, ...ancestors(doc, node)] : [n];
          const container = candidates.find(
            (a) =>
              a.id === id ||
              (a.prototypeScroll && a.prototypeScroll !== "none"),
          );
          if (!container) return;
          const factor =
            (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewport.height : 1) /
            scale;
          setState((s) => {
            const prior = displayRef.current[container.id] ?? { x: 0, y: 0 };
            return {
              ...s,
              scrollDurationMs: 0,
              scrolls: {
                ...displayRef.current,
                [container.id]: clampScroll(
                  doc,
                  container.id,
                  {
                    x: prior.x + e.deltaX * factor,
                    y: prior.y + e.deltaY * factor,
                  },
                  viewports,
                ),
              },
            };
          });
        }}
      >
        <Scene
          doc={{
            ...scrolled,
            nodes: scrolled.nodes.map((a) =>
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
